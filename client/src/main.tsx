import { trpc } from "@/lib/trpc";
import { BLOCKED_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const showBlockedScreen = () => {
  document.body.innerHTML = `
    <div style="font-family:sans-serif;background:#1a0f00;color:#f5e6c8;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
      <div style="text-align:center;padding:2rem;border:2px solid #8b6914;border-radius:12px;max-width:420px;">
        <div style="font-size:3rem;margin-bottom:1rem">🔒</div>
        <h1 style="color:#f59e0b;font-size:1.5rem;margin-bottom:1rem">Acesso Bloqueado</h1>
        <p style="color:#d4a96a;line-height:1.6">${BLOCKED_ERR_MSG}</p>
      </div>
    </div>
  `;
};

const handleAuthError = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  if (error.message === BLOCKED_ERR_MSG) {
    showBlockedScreen();
    return;
  }

  if (error.message === UNAUTHED_ERR_MSG) {
    window.location.href = getLoginUrl();
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    handleAuthError(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    handleAuthError(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
