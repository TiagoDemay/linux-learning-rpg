import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { TRPCError } from "@trpc/server";
import type { User } from "../../drizzle/schema";
import { BLOCKED_ERR_MSG } from "@shared/const";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error: unknown) {
    // Se o usuário está bloqueado, propagar o erro como FORBIDDEN
    if (error instanceof Error && error.message === BLOCKED_ERR_MSG) {
      throw new TRPCError({ code: "FORBIDDEN", message: BLOCKED_ERR_MSG });
    }
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
