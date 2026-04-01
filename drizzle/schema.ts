import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  blocked: int("blocked").default(0).notNull(), // 0 = ativo, 1 = bloqueado
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const userProgress = mysqlTable("user_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  coins: int("coins").default(0).notNull(),
  unlockedLevels: json("unlockedLevels").$type<string[]>().default(["floresta-stallman"]).notNull(),
  completedLevels: json("completedLevels").$type<string[]>().default([]).notNull(),
  currentLevel: varchar("currentLevel", { length: 64 }).default("floresta-stallman").notNull(),
  /** Mapa levelId -> índice da próxima sub-tarefa (0 = não iniciado) */
  challengeProgress: json("challengeProgress").$type<Record<string, number>>().default({}).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Snapshot de um torneio encerrado.
 * Cada linha representa um jogador no momento do reset.
 */
export const tournamentHistory = mysqlTable("tournament_history", {
  id: int("id").autoincrement().primaryKey(),
  /** Identificador do torneio (UUID gerado no momento do reset) */
  tournamentId: varchar("tournamentId", { length: 64 }).notNull(),
  /** Nome do torneio (ex: "Torneio 1 - Abr 2026") */
  tournamentName: varchar("tournamentName", { length: 128 }).notNull(),
  /** Data/hora em que o reset foi executado */
  resetAt: timestamp("resetAt").defaultNow().notNull(),
  /** ID do usuário no momento do snapshot */
  userId: int("userId").notNull(),
  userName: text("userName"),
  userEmail: varchar("userEmail", { length: 320 }),
  coins: int("coins").default(0).notNull(),
  completedLevels: json("completedLevels").$type<string[]>(),
  currentLevel: varchar("currentLevel", { length: 64 }).default("floresta-stallman").notNull(),
  challengeProgress: json("challengeProgress").$type<Record<string, number>>(),
  /** Posição no ranking no momento do reset */
  position: int("position").default(0).notNull(),
});

/**
 * Torneio gerenciado pelo professor.
 * status: 'active' = torneio em andamento, 'finished' = encerrado
 */
export const tournaments = mysqlTable("tournaments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["active", "finished"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Participantes de um torneio.
 * Um jogador só aparece no ranking/painel se estiver nesta tabela para o torneio ativo.
 */
export const tournamentParticipants = mysqlTable("tournament_participants", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  userId: int("userId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

/**
 * Torneio ativo atual. Sempre há no máximo 1 linha (id=1).
 * É atualizado ao criar/reiniciar o torneio.
 */
export const activeTournament = mysqlTable("active_tournament", {
  id: int("id").primaryKey().default(1),
  name: varchar("name", { length: 128 }).notNull().default("Torneio Atual"),
  tournamentId: int("tournamentId"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = typeof userProgress.$inferInsert;
export type TournamentHistory = typeof tournamentHistory.$inferSelect;
export type InsertTournamentHistory = typeof tournamentHistory.$inferInsert;
