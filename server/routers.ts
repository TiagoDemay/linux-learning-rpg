import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getUserProgress, upsertUserProgress } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  progress: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const progress = await getUserProgress(ctx.user.id);
      if (!progress) {
        return {
          coins: 0,
          unlockedLevels: ["floresta-stallman"],
          completedLevels: [],
          currentLevel: "floresta-stallman",
        };
      }
      return {
        coins: progress.coins,
        unlockedLevels: progress.unlockedLevels as string[],
        completedLevels: progress.completedLevels as string[],
        currentLevel: progress.currentLevel,
      };
    }),

    save: protectedProcedure
      .input(
        z.object({
          coins: z.number().min(0),
          unlockedLevels: z.array(z.string()),
          completedLevels: z.array(z.string()),
          currentLevel: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertUserProgress({
          userId: ctx.user.id,
          coins: input.coins,
          unlockedLevels: input.unlockedLevels,
          completedLevels: input.completedLevels,
          currentLevel: input.currentLevel,
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
