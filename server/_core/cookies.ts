import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

/**
 * Opções para o cookie de sessão (app_session_id).
 * httpOnly + SameSite=None;Secure em HTTPS para funcionar em domínios customizados.
 */
export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  return {
    httpOnly: true,
    path: "/",
    sameSite: isSecureRequest(req) ? "none" : "lax",
    secure: isSecureRequest(req),
  };
}

/**
 * Opções para o cookie de nonce OAuth (oauth_state_nonce).
 * SameSite=None;Secure em HTTPS é necessário para que o cookie seja enviado
 * no redirect cross-origin do OAuth portal (api.manus.im) de volta ao nosso domínio.
 * Sem SameSite=None, o browser bloqueia o cookie e o nonce não bate → "invalid oauth state".
 */
export function getNonceCookieOptions(
  req: Request
): Pick<CookieOptions, "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);
  return {
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
