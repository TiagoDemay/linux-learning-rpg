import { desc, eq, gt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, userProgress, InsertUserProgress, tournamentHistory, activeTournament } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserProgress(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userProgress).where(eq(userProgress.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertUserProgress(data: {
  userId: number;
  coins: number;
  unlockedLevels: string[];
  completedLevels: string[];
  currentLevel: string;
  challengeProgress: Record<string, number>;
}) {
  const db = await getDb();
  if (!db) return;

  const existing = await getUserProgress(data.userId);
  if (existing) {
    await db.update(userProgress)
      .set({
        coins: data.coins,
        unlockedLevels: data.unlockedLevels,
        completedLevels: data.completedLevels,
        currentLevel: data.currentLevel,
        challengeProgress: data.challengeProgress,
      })
      .where(eq(userProgress.userId, data.userId));
  } else {
    await db.insert(userProgress).values({
      userId: data.userId,
      coins: data.coins,
      unlockedLevels: data.unlockedLevels,
      completedLevels: data.completedLevels,
      currentLevel: data.currentLevel,
      challengeProgress: data.challengeProgress,
    });
  }
}

/** Retorna todos os alunos com progresso completo — para o painel do professor */
export async function getAllStudents() {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      userId: userProgress.userId,
      coins: userProgress.coins,
      unlockedLevels: userProgress.unlockedLevels,
      completedLevels: userProgress.completedLevels,
      currentLevel: userProgress.currentLevel,
      challengeProgress: userProgress.challengeProgress,
      progressUpdatedAt: userProgress.updatedAt,
      name: users.name,
      email: users.email,
      lastSignedIn: users.lastSignedIn,
      createdAt: users.createdAt,
      role: users.role,
    })
    .from(users)
    .leftJoin(userProgress, eq(userProgress.userId, users.id))
    .orderBy(desc(userProgress.coins));

  return rows;
}

/**
 * Salva um snapshot do torneio atual e zera o progresso de todos os jogadores.
 * Retorna o ID do torneio criado.
 */
export async function resetAllProgress(tournamentName: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. Buscar todos os jogadores com progresso
  const students = await getAllStudents();

  // 2. Gerar ID único para este torneio
  const tournamentId = `tournament-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const resetAt = new Date();

  // 3. Salvar snapshot de cada jogador ordenado por moedas
  const sorted = [...students].sort((a, b) => (b.coins ?? 0) - (a.coins ?? 0));
  if (sorted.length > 0) {
    const snapshots = sorted.map((s, idx) => ({
      tournamentId,
      tournamentName,
      resetAt,
      userId: s.userId!,
      userName: s.name ?? null,
      userEmail: s.email ?? null,
      coins: s.coins ?? 0,
      completedLevels: (s.completedLevels ?? []) as string[],
      currentLevel: s.currentLevel ?? "floresta-stallman",
      challengeProgress: (s.challengeProgress ?? {}) as Record<string, number>,
      position: idx + 1,
    }));
    await db.insert(tournamentHistory).values(snapshots);
  }

  // 4. Zerar progresso de todos os jogadores
  await db.update(userProgress).set({
    coins: 0,
    unlockedLevels: sql`JSON_ARRAY('floresta-stallman')`,
    completedLevels: sql`JSON_ARRAY()`,
    currentLevel: "floresta-stallman",
    challengeProgress: sql`JSON_OBJECT()`,
  });

  return tournamentId;
}

/**
 * Retorna a lista de torneios anteriores com seus snapshots de jogadores.
 * Agrupa por tournamentId para facilitar a exibição.
 */
export async function getTournamentHistory() {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(tournamentHistory)
    .orderBy(desc(tournamentHistory.resetAt));

  // Agrupar por tournamentId
  const map = new Map<string, {
    tournamentId: string;
    tournamentName: string;
    resetAt: Date;
    players: typeof rows;
  }>();

  for (const row of rows) {
    if (!map.has(row.tournamentId)) {
      map.set(row.tournamentId, {
        tournamentId: row.tournamentId,
        tournamentName: row.tournamentName,
        resetAt: row.resetAt,
        players: [],
      });
    }
    map.get(row.tournamentId)!.players.push(row);
  }

  return Array.from(map.values());
}

/** Retorna o torneio ativo atual */
export async function getActiveTournament() {
  const db = await getDb();
  if (!db) return { name: "Torneio Atual", startedAt: new Date() };
  const rows = await db.select().from(activeTournament).limit(1);
  if (rows.length === 0) return { name: "Torneio Atual", startedAt: new Date() };
  return rows[0];
}

/** Define o nome do torneio ativo (upsert na linha id=1) */
export async function setActiveTournament(name: string) {
  const db = await getDb();
  if (!db) return;
  // Tenta atualizar; se não existir, insere
  const existing = await db.select().from(activeTournament).limit(1);
  if (existing.length > 0) {
    await db.update(activeTournament).set({ name, startedAt: new Date() });
  } else {
    await db.insert(activeTournament).values({ id: 1, name, startedAt: new Date() });
  }
}

/** Retorna o top N jogadores ordenados por moedas (para o ranking) */
export async function getTopPlayers(limit = 20) {
  const db = await getDb();
  if (!db) return [];

  // Filtrar jogadores sem progresso real (0 moedas e sem territórios completados)
  const rows = await db
    .select({
      userId: userProgress.userId,
      coins: userProgress.coins,
      completedLevels: userProgress.completedLevels,
      currentLevel: userProgress.currentLevel,
      updatedAt: userProgress.updatedAt,
      name: users.name,
      openId: users.openId,
    })
    .from(userProgress)
    .innerJoin(users, eq(userProgress.userId, users.id))
    .where(gt(userProgress.coins, 0))
    .orderBy(desc(userProgress.coins))
    .limit(limit);

  return rows;
}
