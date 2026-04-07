import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";

// Replicar a lógica de validação para teste isolado
const MAX_COINS = 3000;
const MAX_CHALLENGE_PROGRESS_PER_LEVEL = 10;
const VALID_LEVEL_IDS = new Set([
  "floresta-stallman", "tundra-slackware", "montanhas-kernighan", "pantano-systemd",
  "reino-torvalds", "cidade-gnu", "planicies-redhat", "deserto-debian",
  "ilhas-canonical", "vale-arch",
]);

function validateProgress(
  input: {
    coins: number;
    unlockedLevels: string[];
    completedLevels: string[];
    currentLevel: string;
    challengeProgress: Record<string, number>;
  },
  existing: { coins: number; challengeProgress: Record<string, number> } | null
) {
  if (input.coins > MAX_COINS) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Moedas inválidas: ${input.coins}` });
  }
  if (existing && input.coins < existing.coins - 800) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Redução suspeita de moedas" });
  }
  for (const levelId of input.unlockedLevels) {
    if (!VALID_LEVEL_IDS.has(levelId)) throw new TRPCError({ code: "BAD_REQUEST", message: `Território inválido: ${levelId}` });
  }
  for (const levelId of input.completedLevels) {
    if (!VALID_LEVEL_IDS.has(levelId)) throw new TRPCError({ code: "BAD_REQUEST", message: `Território concluído inválido: ${levelId}` });
  }
  if (!VALID_LEVEL_IDS.has(input.currentLevel)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Território atual inválido: ${input.currentLevel}` });
  }
  for (const [levelId, progress] of Object.entries(input.challengeProgress)) {
    if (!VALID_LEVEL_IDS.has(levelId)) throw new TRPCError({ code: "BAD_REQUEST", message: `Território de progresso inválido: ${levelId}` });
    if (typeof progress !== "number" || progress < 0 || progress > MAX_CHALLENGE_PROGRESS_PER_LEVEL) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Progresso inválido para ${levelId}: ${progress}` });
    }
    if (existing?.challengeProgress?.[levelId] !== undefined) {
      const existingProgress = existing.challengeProgress[levelId] as number;
      if (progress < existingProgress) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Regressão em ${levelId}` });
      }
    }
  }
  for (const levelId of input.completedLevels) {
    if (!input.unlockedLevels.includes(levelId)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Território ${levelId} completo mas não desbloqueado` });
    }
  }
}

const validBase = {
  coins: 100,
  unlockedLevels: ["floresta-stallman"],
  completedLevels: [],
  currentLevel: "floresta-stallman",
  challengeProgress: { "floresta-stallman": 5 },
};

describe("validateProgress — security tests", () => {
  it("aceita progresso legítimo", () => {
    expect(() => validateProgress(validBase, null)).not.toThrow();
  });

  it("bloqueia moedas acima do limite (999999)", () => {
    expect(() => validateProgress({ ...validBase, coins: 999999 }, null))
      .toThrow(TRPCError);
  });

  it("bloqueia moedas exatamente no limite + 1", () => {
    expect(() => validateProgress({ ...validBase, coins: MAX_COINS + 1 }, null))
      .toThrow(TRPCError);
  });

  it("aceita moedas exatamente no limite máximo", () => {
    expect(() => validateProgress({ ...validBase, coins: MAX_COINS }, null)).not.toThrow();
  });

  it("bloqueia território inválido em unlockedLevels", () => {
    expect(() => validateProgress({ ...validBase, unlockedLevels: ["floresta-stallman", "territorio-falso"] }, null))
      .toThrow(TRPCError);
  });

  it("bloqueia território inválido em completedLevels", () => {
    expect(() => validateProgress({
      ...validBase,
      unlockedLevels: ["floresta-stallman", "hack-level"],
      completedLevels: ["hack-level"],
    }, null)).toThrow(TRPCError);
  });

  it("bloqueia currentLevel inválido", () => {
    expect(() => validateProgress({ ...validBase, currentLevel: "nivel-inventado" }, null))
      .toThrow(TRPCError);
  });

  it("bloqueia progresso de desafio acima de 10", () => {
    expect(() => validateProgress({
      ...validBase,
      challengeProgress: { "floresta-stallman": 11 },
    }, null)).toThrow(TRPCError);
  });

  it("bloqueia regressão de progresso de desafio", () => {
    const existing = { coins: 100, challengeProgress: { "floresta-stallman": 8 } };
    expect(() => validateProgress({
      ...validBase,
      challengeProgress: { "floresta-stallman": 5 }, // regrediu de 8 para 5
    }, existing)).toThrow(TRPCError);
  });

  it("bloqueia território completado mas não desbloqueado", () => {
    expect(() => validateProgress({
      ...validBase,
      completedLevels: ["tundra-slackware"], // não está em unlockedLevels
    }, null)).toThrow(TRPCError);
  });

  it("bloqueia redução abrupta de moedas (mais de 800)", () => {
    const existing = { coins: 2000, challengeProgress: {} };
    expect(() => validateProgress({ ...validBase, coins: 500 }, existing)) // caiu 1500
      .toThrow(TRPCError);
  });

  it("aceita redução legítima de moedas (compra na loja)", () => {
    const existing = { coins: 500, challengeProgress: {} };
    expect(() => validateProgress({ ...validBase, coins: 350 }, existing)).not.toThrow(); // caiu 150
  });
});
