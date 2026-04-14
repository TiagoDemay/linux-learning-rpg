import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { URL } from "url";

function getTrustProxyConfig(): boolean | number | string {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw) return 1;
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}

function getAllowedCsrfOrigins() {
  const raw = process.env.CSRF_ALLOWED_ORIGINS?.trim();
  if (!raw) return new Set<string>();
  return new Set(
    raw
      .split(",")
      .map(v => v.trim())
      .filter(Boolean)
  );
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // ── Validação de variáveis de ambiente obrigatórias ───────────────────────
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "[STARTUP] JWT_SECRET ausente. " +
      "Defina a variável de ambiente JWT_SECRET antes de iniciar o servidor."
    );
  }
  if (process.env.JWT_SECRET.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[STARTUP] JWT_SECRET muito curto em produção. Mínimo: 32 caracteres. " +
        "Defina a variável de ambiente JWT_SECRET antes de iniciar o servidor."
      );
    } else {
      console.warn("[STARTUP] Aviso: JWT_SECRET tem menos de 32 caracteres. Em produção isso causará erro fatal.");
    }
  }
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "[STARTUP] DATABASE_URL é obrigatório. " +
      "Defina a variável de ambiente DATABASE_URL antes de iniciar o servidor."
    );
  }

  const app = express();
  const server = createServer(app);

  // Trust proxy — necessário para rate limiting funcionar corretamente em produção
  app.set("trust proxy", getTrustProxyConfig());

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === "development"
          ? false
          : {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https:"],
                fontSrc: ["'self'", "data:"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
              },
            },
    })
  );

  // Body parser — 1mb is sufficient for game state JSON
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  // Rate limiting — protege contra abuso de API
  // Geral: 200 req/min por IP para todas as rotas tRPC
  const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisições. Tente novamente em breve." },
  });

  // Estrito: 30 req/min para progress.save (anti-spam de progresso)
  const saveLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Limite de salvamentos atingido. Aguarde 1 minuto." },
  });

  // Estrito: 20 req/min para challenge.submit (anti-brute-force de respostas)
  const submitLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Limite de tentativas atingido. Aguarde 1 minuto." },
  });

  // Estrito: 10 req/min para shop.buy (anti-spam de compras)
  const shopLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Limite de compras atingido. Aguarde 1 minuto." },
  });
  const logoutLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Limite de logout atingido. Aguarde 1 minuto." },
  });

  app.use("/api/trpc", generalLimiter);
  app.use("/api/trpc/progress.save", saveLimiter);
  app.use("/api/trpc/challenge.submit", submitLimiter);
  app.use("/api/trpc/shop.buy", shopLimiter);
  app.use("/api/trpc/auth.logout", logoutLimiter);

  const oauthCallbackLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Limite de tentativas no OAuth callback atingido." },
  });
  app.use("/api/oauth/callback", oauthCallbackLimiter);

  const csrfAllowedOrigins = getAllowedCsrfOrigins();
  app.use("/api/trpc", (req, res, next) => {
    if (process.env.NODE_ENV === "test") return next();
    const method = req.method.toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return next();
    }

    const host = req.get("host");
    const origin = req.get("origin");
    const referer = req.get("referer");
    const allowOrigin = (candidate: string | undefined) => {
      if (!candidate) return false;
      try {
        const parsed = new URL(candidate);
        const normalizedOrigin = `${parsed.protocol}//${parsed.host}`;
        if (csrfAllowedOrigins.size > 0) {
          return csrfAllowedOrigins.has(normalizedOrigin);
        }
        if (!host) return false;
        return parsed.host === host;
      } catch {
        return false;
      }
    };

    if (allowOrigin(origin) || allowOrigin(referer)) {
      return next();
    }

    return res.status(403).json({ error: "CSRF validation failed" });
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
