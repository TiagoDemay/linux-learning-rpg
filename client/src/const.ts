import { OAUTH_STATE_COOKIE_NAME } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

function createNonce(size = 24): string {
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

function encodeState(payload: { redirectUri: string; nonce: string }) {
  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json)));
}

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const nonce = createNonce();
  const state = encodeState({ redirectUri, nonce });
  document.cookie = `${OAUTH_STATE_COOKIE_NAME}=${nonce}; Path=/; Max-Age=600; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
