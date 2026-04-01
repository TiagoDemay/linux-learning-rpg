import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Professor Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createStudentContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "student-user",
    email: "student@example.com",
    name: "Aluno Teste",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("professor.getStudents", () => {
  it("retorna FORBIDDEN para usuário com role 'user'", async () => {
    const ctx = createStudentContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.professor.getStudents()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("retorna array para usuário com role 'admin' (pode ser vazio sem banco)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // Sem banco disponível no ambiente de teste, deve retornar array vazio
    const result = await caller.professor.getStudents();
    expect(Array.isArray(result)).toBe(true);
  });

  it("cada item do resultado tem os campos obrigatórios", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.professor.getStudents();
    for (const student of result) {
      expect(student).toHaveProperty("position");
      expect(student).toHaveProperty("name");
      expect(student).toHaveProperty("coins");
      expect(student).toHaveProperty("completedCount");
      expect(student).toHaveProperty("unlockedCount");
      expect(student).toHaveProperty("currentLevel");
      expect(student).toHaveProperty("challengeProgress");
      expect(student).toHaveProperty("lastSignedIn");
      expect(student).toHaveProperty("joinedAt");
      expect(typeof student.coins).toBe("number");
      expect(typeof student.completedCount).toBe("number");
      expect(typeof student.position).toBe("number");
    }
  });
});
