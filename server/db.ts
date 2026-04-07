import { desc, eq, gt, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, userProgress, InsertUserProgress, tournamentHistory, activeTournament, tournaments, tournamentParticipants } from "../drizzle/schema";
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

/** Define o nome e o tournamentId do torneio ativo (upsert na linha id=1) */
export async function setActiveTournament(name: string, tournamentId?: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(activeTournament).limit(1);
  const payload: Record<string, unknown> = { name, startedAt: new Date() };
  if (tournamentId !== undefined) payload.tournamentId = tournamentId;
  if (existing.length > 0) {
    await db.update(activeTournament).set(payload);
  } else {
    await db.insert(activeTournament).values({ id: 1, name, tournamentId: tournamentId ?? null, startedAt: new Date() });
  }
}

/** Cria um novo torneio e o define como ativo. Retorna o torneio criado. */
export async function createTournament(name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Encerrar torneio ativo anterior
  await db.update(tournaments).set({ status: "finished" }).where(eq(tournaments.status, "active"));
  // Criar novo torneio
  const [result] = await db.insert(tournaments).values({ name, status: "active" });
  const tournamentId = result.insertId as number;
  // Atualizar active_tournament
  await setActiveTournament(name, tournamentId);
  return { id: tournamentId, name };
}

/** Renomeia o torneio ativo */
export async function renameTournament(newName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const active = await db.select().from(activeTournament).limit(1);
  if (active.length === 0) throw new Error("Nenhum torneio ativo");
  const tournamentId = active[0].tournamentId;
  if (tournamentId) {
    await db.update(tournaments).set({ name: newName }).where(eq(tournaments.id, tournamentId));
  }
  await db.update(activeTournament).set({ name: newName });
}

/** Retorna todos os usuários cadastrados com flag de participação no torneio ativo */
export async function getAllUsersWithParticipation() {
  const db = await getDb();
  if (!db) return [];
  const active = await db.select().from(activeTournament).limit(1);
  const tournamentId = active[0]?.tournamentId ?? null;
  // Buscar todos os usuários
  const allUsers = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, lastSignedIn: users.lastSignedIn }).from(users);
  if (!tournamentId) {
    return allUsers.map(u => ({ ...u, isParticipant: false }));
  }
  // Buscar participantes do torneio ativo
  const participants = await db.select({ userId: tournamentParticipants.userId })
    .from(tournamentParticipants)
    .where(eq(tournamentParticipants.tournamentId, tournamentId));
  const participantIds = new Set(participants.map(p => p.userId));
  return allUsers.map(u => ({ ...u, isParticipant: participantIds.has(u.id) }));
}

/** Adiciona ou remove um usuário como participante do torneio ativo */
export async function toggleParticipant(userId: number, add: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const active = await db.select().from(activeTournament).limit(1);
  const tournamentId = active[0]?.tournamentId;
  if (!tournamentId) throw new Error("Nenhum torneio ativo com ID válido");
  if (add) {
    await db.insert(tournamentParticipants)
      .values({ tournamentId, userId })
      .onDuplicateKeyUpdate({ set: { joinedAt: new Date() } });
  } else {
    await db.delete(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, tournamentId))
      // @ts-ignore
      .where(eq(tournamentParticipants.userId, userId));
  }
}

/** Remove participante do torneio ativo */
export async function removeParticipant(userId: number) {
  const db = await getDb();
  if (!db) return;
  const active = await db.select().from(activeTournament).limit(1);
  const tournamentId = active[0]?.tournamentId;
  if (!tournamentId) return;
  await db.delete(tournamentParticipants)
    .where(sql`${tournamentParticipants.tournamentId} = ${tournamentId} AND ${tournamentParticipants.userId} = ${userId}`);
}

/** Adiciona participante ao torneio ativo */
export async function addParticipant(userId: number) {
  const db = await getDb();
  if (!db) return;
  const active = await db.select().from(activeTournament).limit(1);
  const tournamentId = active[0]?.tournamentId;
  if (!tournamentId) throw new Error("Nenhum torneio ativo com ID válido");
  await db.insert(tournamentParticipants)
    .values({ tournamentId, userId })
    .onDuplicateKeyUpdate({ set: { joinedAt: new Date() } });
}

/** Retorna IDs dos participantes do torneio ativo (ou null se não há torneio com ID) */
async function getActiveTournamentParticipantIds(): Promise<number[] | null> {
  const db = await getDb();
  if (!db) return null;
  const active = await db.select().from(activeTournament).limit(1);
  const tournamentId = active[0]?.tournamentId ?? null;
  if (!tournamentId) return null;
  const participants = await db.select({ userId: tournamentParticipants.userId })
    .from(tournamentParticipants)
    .where(eq(tournamentParticipants.tournamentId, tournamentId));
  return participants.map(p => p.userId);
}

/** Retorna o top N jogadores ordenados por moedas, filtrados pelos participantes do torneio ativo */
export async function getTopPlayers(limit = 20) {
  const db = await getDb();
  if (!db) return [];

  const participantIds = await getActiveTournamentParticipantIds();

  let query = db
    .select({
      userId: userProgress.userId,
      coins: userProgress.coins,
      completedLevels: userProgress.completedLevels,
      currentLevel: userProgress.currentLevel,
      updatedAt: userProgress.updatedAt,
      name: users.name,
    })
    .from(userProgress)
    .innerJoin(users, eq(userProgress.userId, users.id));

  if (participantIds && participantIds.length > 0) {
    // Filtrar apenas participantes do torneio ativo com progresso real
    return db
      .select({
        userId: userProgress.userId,
        coins: userProgress.coins,
        completedLevels: userProgress.completedLevels,
        currentLevel: userProgress.currentLevel,
        updatedAt: userProgress.updatedAt,
        name: users.name,
      })
      .from(userProgress)
      .innerJoin(users, eq(userProgress.userId, users.id))
      .where(inArray(userProgress.userId, participantIds))
      .orderBy(desc(userProgress.coins))
      .limit(limit);
  } else if (participantIds && participantIds.length === 0) {
    // Torneio existe mas sem participantes
    return [];
  }

  // Sem torneio ativo: mostrar todos com progresso real (coins > 0)
  return db
    .select({
      userId: userProgress.userId,
      coins: userProgress.coins,
      completedLevels: userProgress.completedLevels,
      currentLevel: userProgress.currentLevel,
      updatedAt: userProgress.updatedAt,
      name: users.name,
    })
    .from(userProgress)
    .innerJoin(users, eq(userProgress.userId, users.id))
    .where(gt(userProgress.coins, 0))
    .orderBy(desc(userProgress.coins))
    .limit(limit);
}

/** Retorna alunos filtrados pelos participantes do torneio ativo (para o painel do professor) */
export async function getStudentsByTournament() {
  const db = await getDb();
  if (!db) return [];

  const participantIds = await getActiveTournamentParticipantIds();

  const selectFields = {
    userId: users.id,
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
    blocked: (users as any).blocked,
  };

  const baseQuery = db
    .select(selectFields)
    .from(users)
    .leftJoin(userProgress, eq(userProgress.userId, users.id));

  if (participantIds && participantIds.length > 0) {
    return db
      .select(selectFields)
      .from(users)
      .leftJoin(userProgress, eq(userProgress.userId, users.id))
      .where(inArray(users.id, participantIds))
      .orderBy(desc(userProgress.coins));
  } else if (participantIds && participantIds.length === 0) {
    return [];
  }

  // Sem torneio: retornar todos
  return baseQuery.orderBy(desc(userProgress.coins));
}

/** Bloqueia ou desbloqueia um usuário */
export async function setUserBlocked(userId: number, blocked: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ blocked: blocked ? 1 : 0 } as any).where(eq(users.id, userId));
}

/** Deleta um usuário e seu progresso */
export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(userProgress).where(eq(userProgress.userId, userId));
  await db.delete(tournamentParticipants).where(eq(tournamentParticipants.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

/** Deleta todas as entradas do histórico de um torneio específico */
export async function deleteTournamentFromHistory(tournamentId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tournamentHistory).where(eq(tournamentHistory.tournamentId, tournamentId));
}

/** Ativa todos os usuários como participantes do torneio ativo */
export async function setAllParticipants(add: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const active = await db.select().from(activeTournament).limit(1);
  const tournamentId = active[0]?.tournamentId;
  if (!tournamentId) throw new Error("Nenhum torneio ativo com ID válido");
  if (add) {
    const allUsers = await db.select({ id: users.id }).from(users);
    if (allUsers.length === 0) return;
    const values = allUsers.map(u => ({ tournamentId, userId: u.id }));
    for (const v of values) {
      await db.insert(tournamentParticipants)
        .values(v)
        .onDuplicateKeyUpdate({ set: { joinedAt: new Date() } });
    }
  } else {
    await db.delete(tournamentParticipants)
      .where(eq(tournamentParticipants.tournamentId, tournamentId));
  }
}

/** Retorna o timestamp do último evento de torneio (criação ou renomeação) */
export async function getTournamentEventTimestamp() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ startedAt: activeTournament.startedAt, name: activeTournament.name, tournamentId: activeTournament.tournamentId }).from(activeTournament).limit(1);
  return rows[0] ?? null;
}

/** Retorna todos os usuários com campo blocked para o painel do professor */
export async function getAllUsersForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    blocked: (users as any).blocked,
    lastSignedIn: users.lastSignedIn,
    createdAt: users.createdAt,
  }).from(users).orderBy(desc(users.lastSignedIn));
}
