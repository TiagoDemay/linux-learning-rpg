import crypto from "crypto";

const revokedSessions = new Map<string, number>();

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function cleanupExpired() {
  const now = Date.now();
  revokedSessions.forEach((expiresAt, key) => {
    if (expiresAt <= now) {
      revokedSessions.delete(key);
    }
  });
}

export function revokeSessionToken(token: string, expiresAtMs: number) {
  cleanupExpired();
  revokedSessions.set(hashToken(token), expiresAtMs);
}

export function isSessionRevoked(token: string) {
  cleanupExpired();
  return revokedSessions.has(hashToken(token));
}
