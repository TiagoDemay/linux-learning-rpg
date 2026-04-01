import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db functions to avoid real DB calls in unit tests
vi.mock("./db", () => ({
  getUserProgress: vi.fn().mockResolvedValue(null),
  upsertUserProgress: vi.fn().mockResolvedValue(undefined),
  getTopPlayers: vi.fn().mockResolvedValue([
    {
      userId: 1,
      coins: 500,
      completedLevels: ["floresta-stallman", "tundra-slackware"],
      currentLevel: "montanhas-kernighan",
      updatedAt: new Date("2026-01-01"),
      name: "Aventureiro Alpha",
      openId: "user-1",
    },
    {
      userId: 2,
      coins: 300,
      completedLevels: ["floresta-stallman"],
      currentLevel: "tundra-slackware",
      updatedAt: new Date("2026-01-02"),
      name: "Aventureiro Beta",
      openId: "user-2",
    },
  ]),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("progress.get — usuário sem progresso salvo", () => {
  it("retorna estado inicial com 0 moedas", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.progress.get();
    expect(result.coins).toBe(0);
    expect(result.unlockedLevels).toContain("floresta-stallman");
    expect(result.completedLevels).toHaveLength(0);
    expect(result.challengeProgress).toEqual({});
  });
});

describe("progress.save", () => {
  it("salva progresso e retorna success: true", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.progress.save({
      coins: 165,
      unlockedLevels: ["floresta-stallman", "tundra-slackware"],
      completedLevels: ["floresta-stallman"],
      currentLevel: "tundra-slackware",
      challengeProgress: { "floresta-stallman": 10 },
    });
    expect(result).toEqual({ success: true });
  });

  it("rejeita moedas negativas", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.progress.save({
        coins: -1,
        unlockedLevels: [],
        completedLevels: [],
        currentLevel: "floresta-stallman",
        challengeProgress: {},
      })
    ).rejects.toThrow();
  });
});

describe("ranking.getTop", () => {
  it("retorna lista de jogadores ordenada por posição", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.ranking.getTop({ limit: 20 });
    expect(result).toHaveLength(2);
    expect(result[0]?.position).toBe(1);
    expect(result[0]?.coins).toBe(500);
    expect(result[0]?.name).toBe("Aventureiro Alpha");
    expect(result[0]?.completedCount).toBe(2);
  });

  it("é acessível sem autenticação (publicProcedure)", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.ranking.getTop({ limit: 5 })).resolves.toBeDefined();
  });

  it("usa nome padrão quando name é null", async () => {
    const { getTopPlayers } = await import("./db");
    vi.mocked(getTopPlayers).mockResolvedValueOnce([
      {
        userId: 99,
        coins: 10,
        completedLevels: [],
        currentLevel: "floresta-stallman",
        updatedAt: new Date(),
        name: null,
        openId: "anon",
      },
    ]);
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.ranking.getTop({ limit: 1 });
    expect(result[0]?.name).toBe("Aventureiro Anônimo");
  });
});
