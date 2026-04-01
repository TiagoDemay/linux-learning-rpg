import { BLOCKED_ERR_MSG, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // Verificar se o usuário está bloqueado antes de criar a sessão
      const existingUser = await db.getUserByOpenId(userInfo.openId);
      if (existingUser && (existingUser as any).blocked === 1) {
        res.status(403).send(`
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head><meta charset="UTF-8"><title>Acesso Bloqueado</title>
          <style>body{font-family:sans-serif;background:#1a0f00;color:#f5e6c8;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
          .box{text-align:center;padding:2rem;border:2px solid #8b6914;border-radius:12px;max-width:400px;}
          h1{color:#f59e0b;} p{color:#d4a96a;line-height:1.6;}</style></head>
          <body><div class="box">
          <h1>🔒 Acesso Bloqueado</h1>
          <p>${BLOCKED_ERR_MSG}</p>
          </div></body></html>
        `);
        return;
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
