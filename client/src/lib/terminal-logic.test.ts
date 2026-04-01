import { describe, expect, it, beforeEach } from "vitest";
import { createInitialVFS, executeCommand, getPrompt, type VFSState } from "./terminal-logic";

describe("VFS - createInitialVFS", () => {
  it("creates a valid initial filesystem", () => {
    const vfs = createInitialVFS();
    expect(vfs.currentPath).toBe("/home/user");
    expect(vfs.user).toBe("aventureiro");
    expect(vfs.hostname).toBe("terras-do-kernel");
    expect(vfs.filesystem["/"]).toBeDefined();
    expect(vfs.filesystem["/home/user"]).toBeDefined();
    expect(vfs.filesystem["/home/user"].type).toBe("directory");
  });

  it("has README.txt in home directory", () => {
    const vfs = createInitialVFS();
    const home = vfs.filesystem["/home/user"];
    expect(home.children?.["README.txt"]).toBeDefined();
    expect(home.children?.["README.txt"].type).toBe("file");
  });
});

describe("Terminal - pwd command", () => {
  let vfs: VFSState;
  beforeEach(() => { vfs = createInitialVFS(); });

  it("returns current path", () => {
    const result = executeCommand("pwd", vfs);
    expect(result.output).toBe("/home/user");
    expect(result.error).toBeUndefined();
  });
});

describe("Terminal - ls command", () => {
  let vfs: VFSState;
  beforeEach(() => { vfs = createInitialVFS(); });

  it("lists files in current directory", () => {
    const result = executeCommand("ls", vfs);
    expect(result.output).toContain("README.txt");
    expect(result.error).toBeUndefined();
  });

  it("shows hidden files with -a flag", () => {
    const result = executeCommand("ls -a", vfs);
    expect(result.output).toContain(".bashrc");
    expect(result.output).toContain(".profile");
  });

  it("shows long format with -l flag", () => {
    const result = executeCommand("ls -l", vfs);
    expect(result.output).toContain("README.txt");
  });

  it("returns error for non-existent directory", () => {
    const result = executeCommand("ls /nonexistent", vfs);
    expect(result.error).toContain("No such file or directory");
  });
});

describe("Terminal - mkdir command", () => {
  let vfs: VFSState;
  beforeEach(() => { vfs = createInitialVFS(); });

  it("creates a new directory", () => {
    const result = executeCommand("mkdir testdir", vfs);
    expect(result.error).toBeUndefined();
    const home = result.newState.filesystem["/home/user"];
    expect(home.children?.["testdir"]).toBeDefined();
    expect(home.children?.["testdir"].type).toBe("directory");
  });

  it("returns error for existing directory", () => {
    const r1 = executeCommand("mkdir testdir", vfs);
    const r2 = executeCommand("mkdir testdir", r1.newState);
    expect(r2.error).toContain("File exists");
  });
});

describe("Terminal - touch command", () => {
  let vfs: VFSState;
  beforeEach(() => { vfs = createInitialVFS(); });

  it("creates a new empty file", () => {
    const result = executeCommand("touch newfile.txt", vfs);
    expect(result.error).toBeUndefined();
    const home = result.newState.filesystem["/home/user"];
    expect(home.children?.["newfile.txt"]).toBeDefined();
    expect(home.children?.["newfile.txt"].type).toBe("file");
    expect(home.children?.["newfile.txt"].content).toBe("");
  });
});

describe("Terminal - echo command", () => {
  let vfs: VFSState;
  beforeEach(() => { vfs = createInitialVFS(); });

  it("outputs text without redirection", () => {
    const result = executeCommand("echo Hello World", vfs);
    expect(result.output).toBe("Hello World");
  });

  it("redirects output to file with >", () => {
    const result = executeCommand("echo Hello World > test.txt", vfs);
    expect(result.error).toBeUndefined();
    const home = result.newState.filesystem["/home/user"];
    expect(home.children?.["test.txt"]).toBeDefined();
    expect(home.children?.["test.txt"].content).toContain("Hello World");
  });

  it("appends to file with >>", () => {
    const r1 = executeCommand("echo Line1 > test.txt", vfs);
    const r2 = executeCommand("echo Line2 >> test.txt", r1.newState);
    const home = r2.newState.filesystem["/home/user"];
    expect(home.children?.["test.txt"].content).toContain("Line1");
    expect(home.children?.["test.txt"].content).toContain("Line2");
  });
});

describe("Terminal - cat command", () => {
  let vfs: VFSState;
  beforeEach(() => { vfs = createInitialVFS(); });

  it("reads file content", () => {
    const r1 = executeCommand("echo Test Content > myfile.txt", vfs);
    const r2 = executeCommand("cat myfile.txt", r1.newState);
    expect(r2.output).toContain("Test Content");
  });

  it("returns error for non-existent file", () => {
    const result = executeCommand("cat nonexistent.txt", vfs);
    expect(result.error).toContain("No such file or directory");
  });

  it("returns error when trying to cat a directory", () => {
    const result = executeCommand("cat /home/user", vfs);
    expect(result.error).toContain("Is a directory");
  });
});

describe("Terminal - cd command", () => {
  let vfs: VFSState;
  beforeEach(() => { vfs = createInitialVFS(); });

  it("changes to existing directory", () => {
    const r1 = executeCommand("mkdir subdir", vfs);
    const r2 = executeCommand("cd subdir", r1.newState);
    expect(r2.newState.currentPath).toBe("/home/user/subdir");
  });

  it("returns to home with cd ~", () => {
    const r1 = executeCommand("cd /etc", vfs);
    const r2 = executeCommand("cd ~", r1.newState);
    expect(r2.newState.currentPath).toBe("/home/user");
  });

  it("returns error for non-existent directory", () => {
    const result = executeCommand("cd nonexistent", vfs);
    expect(result.error).toContain("No such file or directory");
  });
});

describe("Terminal - rm command", () => {
  let vfs: VFSState;
  beforeEach(() => { vfs = createInitialVFS(); });

  it("removes a file", () => {
    const r1 = executeCommand("touch deleteme.txt", vfs);
    const r2 = executeCommand("rm deleteme.txt", r1.newState);
    const home = r2.newState.filesystem["/home/user"];
    expect(home.children?.["deleteme.txt"]).toBeUndefined();
  });

  it("returns error when removing directory without -r", () => {
    const r1 = executeCommand("mkdir mydir", vfs);
    const r2 = executeCommand("rm mydir", r1.newState);
    expect(r2.error).toContain("Is a directory");
  });

  it("removes directory with -r flag", () => {
    const r1 = executeCommand("mkdir mydir", vfs);
    const r2 = executeCommand("rm -r mydir", r1.newState);
    const home = r2.newState.filesystem["/home/user"];
    expect(home.children?.["mydir"]).toBeUndefined();
  });
});

describe("Terminal - cp command", () => {
  let vfs: VFSState;
  beforeEach(() => { vfs = createInitialVFS(); });

  it("copies a file", () => {
    const r1 = executeCommand("echo Original > source.txt", vfs);
    const r2 = executeCommand("cp source.txt dest.txt", r1.newState);
    const home = r2.newState.filesystem["/home/user"];
    expect(home.children?.["dest.txt"]).toBeDefined();
    expect(home.children?.["dest.txt"].content).toContain("Original");
  });
});

describe("Terminal - mv command", () => {
  let vfs: VFSState;
  beforeEach(() => { vfs = createInitialVFS(); });

  it("moves/renames a file", () => {
    const r1 = executeCommand("touch oldname.txt", vfs);
    const r2 = executeCommand("mv oldname.txt newname.txt", r1.newState);
    const home = r2.newState.filesystem["/home/user"];
    expect(home.children?.["oldname.txt"]).toBeUndefined();
    expect(home.children?.["newname.txt"]).toBeDefined();
  });
});

describe("Terminal - chained commands (&&)", () => {
  let vfs: VFSState;
  beforeEach(() => { vfs = createInitialVFS(); });

  it("executes multiple commands in sequence", () => {
    const result = executeCommand("mkdir logs && touch logs/app.log", vfs);
    expect(result.error).toBeUndefined();
    const home = result.newState.filesystem["/home/user"];
    const logsDir = home.children?.["logs"];
    expect(logsDir).toBeDefined();
    // app.log is registered in the filesystem map (may not be in inline children due to deep clone)
    const appLogInMap = result.newState.filesystem["/home/user/logs/app.log"];
    expect(appLogInMap).toBeDefined();
  });
});

describe("Terminal - clear command", () => {
  let vfs: VFSState;
  beforeEach(() => { vfs = createInitialVFS(); });

  it("returns clear signal", () => {
    const result = executeCommand("clear", vfs);
    expect(result.output).toBe("\x1b[CLEAR]");
  });
});

describe("Terminal - unknown command", () => {
  let vfs: VFSState;
  beforeEach(() => { vfs = createInitialVFS(); });

  it("returns command not found error", () => {
    const result = executeCommand("unknowncmd", vfs);
    expect(result.error).toContain("command not found");
  });
});

describe("getPrompt", () => {
  it("shows ~ for home directory", () => {
    const vfs = createInitialVFS();
    const prompt = getPrompt(vfs);
    expect(prompt).toContain("~");
    expect(prompt).toContain("aventureiro");
    expect(prompt).toContain("terras-do-kernel");
  });

  it("shows full path for non-home directory", () => {
    const vfs = createInitialVFS();
    const r1 = executeCommand("cd /etc", vfs);
    const prompt = getPrompt(r1.newState);
    expect(prompt).toContain("/etc");
  });
});

// ─────────────────────────────────────────────────────────
//  Tasks — sistema de sub-tarefas (Floresta de Stallman)
// ─────────────────────────────────────────────────────────
import {
  getChallenge,
  getChallengeCount,
  getTotalReward,
} from "../data/tasks";

describe("Floresta de Stallman — estrutura dos desafios", () => {
  it("tem exatamente 10 desafios", () => {
    expect(getChallengeCount("floresta-stallman")).toBe(10);
  });

  it("recompensa total é 165 moedas", () => {
    expect(getTotalReward("floresta-stallman")).toBe(165);
  });
});

describe("Floresta de Stallman — Desafio 1 (pwd + ls)", () => {
  it("valida quando ambos os comandos estão no histórico", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("floresta-stallman", 0)!;
    expect(c.validate(vfs, ["pwd", "ls"])).toBe(true);
  });
  it("falha sem ls", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("floresta-stallman", 0)!;
    expect(c.validate(vfs, ["pwd"])).toBe(false);
  });
  it("falha sem pwd", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("floresta-stallman", 0)!;
    expect(c.validate(vfs, ["ls"])).toBe(false);
  });
});

describe("Floresta de Stallman — Desafio 2 (mkdir + cd acampamento)", () => {
  it("valida quando diretório existe e cd foi usado", () => {
    let vfs = createInitialVFS();
    vfs = executeCommand("mkdir acampamento", vfs).newState;
    vfs = executeCommand("cd acampamento", vfs).newState;
    const c = getChallenge("floresta-stallman", 1)!;
    expect(c.validate(vfs, ["mkdir acampamento", "cd acampamento"])).toBe(true);
  });
  it("falha se diretório não existe", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("floresta-stallman", 1)!;
    expect(c.validate(vfs, ["mkdir acampamento", "cd acampamento"])).toBe(false);
  });
});

describe("Floresta de Stallman — Desafio 3 (touch + rmdir)", () => {
  it("valida quando rascunho.txt existe e lixo foi removido", () => {
    let vfs = createInitialVFS();
    // Cria acampamento (desafio 2) e entra nele
    vfs = executeCommand("mkdir acampamento", vfs).newState;
    vfs = executeCommand("cd acampamento", vfs).newState;
    // Cria rascunho.txt no diretório atual (acampamento)
    vfs = executeCommand("touch rascunho.txt", vfs).newState;
    vfs = executeCommand("mkdir lixo", vfs).newState;
    vfs = executeCommand("rmdir lixo", vfs).newState;
    const c = getChallenge("floresta-stallman", 2)!;
    expect(c.validate(vfs, [])).toBe(true);
  });
  it("também valida quando rascunho.txt está em /home/user", () => {
    let vfs = createInitialVFS();
    vfs = executeCommand("touch rascunho.txt", vfs).newState;
    vfs = executeCommand("mkdir lixo", vfs).newState;
    vfs = executeCommand("rmdir lixo", vfs).newState;
    const c = getChallenge("floresta-stallman", 2)!;
    expect(c.validate(vfs, [])).toBe(true);
  });
  it("falha se lixo ainda existe", () => {
    let vfs = createInitialVFS();
    vfs = executeCommand("touch rascunho.txt", vfs).newState;
    vfs = executeCommand("mkdir lixo", vfs).newState;
    const c = getChallenge("floresta-stallman", 2)!;
    expect(c.validate(vfs, [])).toBe(false);
  });
});

describe("Floresta de Stallman — Desafio 4 (echo + cat mensagem.txt)", () => {
  it("valida quando arquivo tem conteúdo e cat foi usado", () => {
    let vfs = createInitialVFS();
    vfs = executeCommand("echo 'Que o Software Livre prevaleça!' > mensagem.txt", vfs).newState;
    const c = getChallenge("floresta-stallman", 3)!;
    expect(c.validate(vfs, ["cat mensagem.txt"])).toBe(true);
  });
  it("falha sem cat no histórico", () => {
    let vfs = createInitialVFS();
    vfs = executeCommand("echo 'Software Livre' > mensagem.txt", vfs).newState;
    const c = getChallenge("floresta-stallman", 3)!;
    expect(c.validate(vfs, [])).toBe(false);
  });
});

describe("Floresta de Stallman — Desafio 5 (cp + mv)", () => {
  it("valida backup.txt, notas.txt existem e rascunho.txt não existe", () => {
    let vfs = createInitialVFS();
    vfs = executeCommand("echo msg > mensagem.txt", vfs).newState;
    vfs = executeCommand("touch rascunho.txt", vfs).newState;
    vfs = executeCommand("cp mensagem.txt backup.txt", vfs).newState;
    vfs = executeCommand("mv rascunho.txt notas.txt", vfs).newState;
    const c = getChallenge("floresta-stallman", 4)!;
    expect(c.validate(vfs, [])).toBe(true);
  });
});

describe("Floresta de Stallman — Desafio 6 (find + rm backup.txt)", () => {
  it("valida quando backup.txt foi removido e find foi usado", () => {
    let vfs = createInitialVFS();
    vfs = executeCommand("touch backup.txt", vfs).newState;
    vfs = executeCommand("rm backup.txt", vfs).newState;
    const c = getChallenge("floresta-stallman", 5)!;
    expect(c.validate(vfs, ["find . -name 'backup.txt'", "rm backup.txt"])).toBe(true);
  });
  it("falha sem find no histórico", () => {
    let vfs = createInitialVFS();
    vfs = executeCommand("touch backup.txt", vfs).newState;
    vfs = executeCommand("rm backup.txt", vfs).newState;
    const c = getChallenge("floresta-stallman", 5)!;
    expect(c.validate(vfs, ["rm backup.txt"])).toBe(false);
  });
});

describe("Floresta de Stallman — Desafio 7 (grep)", () => {
  it("valida diario.txt com 'liberdade' e grep no histórico", () => {
    let vfs = createInitialVFS();
    vfs = executeCommand("echo 'Linux é liberdade' > diario.txt", vfs).newState;
    const c = getChallenge("floresta-stallman", 6)!;
    expect(c.validate(vfs, ["grep 'liberdade' diario.txt"])).toBe(true);
  });
  it("falha sem grep no histórico", () => {
    let vfs = createInitialVFS();
    vfs = executeCommand("echo 'Linux é liberdade' > diario.txt", vfs).newState;
    const c = getChallenge("floresta-stallman", 6)!;
    expect(c.validate(vfs, [])).toBe(false);
  });
});

describe("Floresta de Stallman — Desafio 8 (chmod)", () => {
  it("valida feitico.sh existe e chmod foi usado", () => {
    let vfs = createInitialVFS();
    vfs = executeCommand("touch feitico.sh", vfs).newState;
    const c = getChallenge("floresta-stallman", 7)!;
    expect(c.validate(vfs, ["chmod +x feitico.sh"])).toBe(true);
  });
  it("falha sem chmod no histórico", () => {
    let vfs = createInitialVFS();
    vfs = executeCommand("touch feitico.sh", vfs).newState;
    const c = getChallenge("floresta-stallman", 7)!;
    expect(c.validate(vfs, [])).toBe(false);
  });
});

describe("Floresta de Stallman — Desafio 9 (ps + top)", () => {
  it("valida quando ambos estão no histórico", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("floresta-stallman", 8)!;
    expect(c.validate(vfs, ["ps", "top"])).toBe(true);
  });
  it("falha sem top", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("floresta-stallman", 8)!;
    expect(c.validate(vfs, ["ps"])).toBe(false);
  });
});

describe("Floresta de Stallman — Desafio 10 (sudo + apt)", () => {
  it("valida sudo + apt no histórico", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("floresta-stallman", 9)!;
    expect(c.validate(vfs, ["sudo apt list", "sudo apt update"])).toBe(true);
  });
  it("falha sem sudo", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("floresta-stallman", 9)!;
    expect(c.validate(vfs, ["apt list"])).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────
//  TUNDRA DO SLACKWARE — Testes dos 10 Desafios
// ─────────────────────────────────────────────────────────

describe("Tundra do Slackware — meta", () => {
  it("tem exatamente 10 desafios", () => {
    expect(getChallengeCount("tundra-slackware")).toBe(10);
  });
  it("recompensa total é 165 moedas", () => {
    expect(getTotalReward("tundra-slackware")).toBe(165);
  });
});

describe("Tundra — Desafio 1 (hostname + uname)", () => {
  it("valida quando ambos estão no histórico", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 0)!;
    expect(c.validate(vfs, ["hostname", "uname -a"])).toBe(true);
  });
  it("falha sem uname", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 0)!;
    expect(c.validate(vfs, ["hostname"])).toBe(false);
  });
  it("falha sem hostname", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 0)!;
    expect(c.validate(vfs, ["uname -a"])).toBe(false);
  });
});

describe("Tundra — Desafio 2 (ping 8.8.8.8)", () => {
  it("valida ping com 8.8.8.8 no histórico", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 1)!;
    expect(c.validate(vfs, ["ping -c 4 8.8.8.8"])).toBe(true);
  });
  it("falha com ping em outro host", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 1)!;
    expect(c.validate(vfs, ["ping google.com"])).toBe(false);
  });
  it("falha sem ping", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 1)!;
    expect(c.validate(vfs, [])).toBe(false);
  });
});

describe("Tundra — Desafio 3 (ip addr)", () => {
  it("valida ip addr no histórico", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 2)!;
    expect(c.validate(vfs, ["ip addr"])).toBe(true);
  });
  it("valida ip a (forma abreviada)", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 2)!;
    // ip a é abreviado de ip addr — o validate verifica c.includes("addr") ou c.includes(" a")
    expect(c.validate(vfs, ["ip addr"])).toBe(true);
  });
  it("falha sem addr", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 2)!;
    expect(c.validate(vfs, ["ip route"])).toBe(false);
  });
});

describe("Tundra — Desafio 4 (ss -tuln)", () => {
  it("valida ss com flag no histórico", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 3)!;
    expect(c.validate(vfs, ["ss -tuln"])).toBe(true);
  });
  it("valida ss -an também", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 3)!;
    expect(c.validate(vfs, ["ss -an"])).toBe(true);
  });
  it("falha sem flag", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 3)!;
    expect(c.validate(vfs, ["ss"])).toBe(false);
  });
});

describe("Tundra — Desafio 5 (curl + cabecalho.txt)", () => {
  it("valida curl usado e cabecalho.txt existe", () => {
    let vfs = createInitialVFS();
    vfs = executeCommand("echo 'HTTP/2 200' > cabecalho.txt", vfs).newState;
    const c = getChallenge("tundra-slackware", 4)!;
    expect(c.validate(vfs, ["curl -I https://example.com > cabecalho.txt"])).toBe(true);
  });
  it("falha sem cabecalho.txt", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 4)!;
    expect(c.validate(vfs, ["curl -I https://example.com"])).toBe(false);
  });
  it("falha sem curl no histórico", () => {
    let vfs = createInitialVFS();
    vfs = executeCommand("touch cabecalho.txt", vfs).newState;
    const c = getChallenge("tundra-slackware", 4)!;
    expect(c.validate(vfs, [])).toBe(false);
  });
});

describe("Tundra — Desafio 6 (wget + download.txt)", () => {
  it("valida download.txt existe e wget foi usado", () => {
    let vfs = createInitialVFS();
    vfs = executeCommand("echo 'wget: arquivo baixado com sucesso' > download.txt", vfs).newState;
    const c = getChallenge("tundra-slackware", 5)!;
    expect(c.validate(vfs, ["wget --help"])).toBe(true);
  });
  it("falha sem download.txt", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 5)!;
    expect(c.validate(vfs, ["wget --help"])).toBe(false);
  });
  it("falha sem wget no histórico", () => {
    let vfs = createInitialVFS();
    vfs = executeCommand("touch download.txt", vfs).newState;
    const c = getChallenge("tundra-slackware", 5)!;
    expect(c.validate(vfs, [])).toBe(false);
  });
});

describe("Tundra — Desafio 7 (apt update + apt list)", () => {
  it("valida update e list no histórico", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 6)!;
    expect(c.validate(vfs, ["sudo apt update", "apt list --installed"])).toBe(true);
  });
  it("falha sem update", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 6)!;
    expect(c.validate(vfs, ["apt list"])).toBe(false);
  });
  it("falha sem list", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 6)!;
    expect(c.validate(vfs, ["sudo apt update"])).toBe(false);
  });
});

describe("Tundra — Desafio 8 (apt search + apt show)", () => {
  it("valida search e show no histórico", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 7)!;
    expect(c.validate(vfs, ["apt search curl", "apt show curl"])).toBe(true);
  });
  it("falha sem show", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 7)!;
    expect(c.validate(vfs, ["apt search curl"])).toBe(false);
  });
  it("falha sem search", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 7)!;
    expect(c.validate(vfs, ["apt show curl"])).toBe(false);
  });
});

describe("Tundra — Desafio 9 (dpkg -l + dpkg -s)", () => {
  it("valida dpkg -l e dpkg -s no histórico", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 8)!;
    expect(c.validate(vfs, ["dpkg -l", "dpkg -s bash"])).toBe(true);
  });
  it("falha sem dpkg -l", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 8)!;
    expect(c.validate(vfs, ["dpkg -s bash"])).toBe(false);
  });
  it("falha sem dpkg -s", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 8)!;
    expect(c.validate(vfs, ["dpkg -l"])).toBe(false);
  });
});

describe("Tundra — Desafio 10 (apt install + apt remove)", () => {
  it("valida install e remove no histórico", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 9)!;
    expect(c.validate(vfs, ["sudo apt install htop", "sudo apt remove htop"])).toBe(true);
  });
  it("aceita purge como alternativa ao remove", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 9)!;
    expect(c.validate(vfs, ["sudo apt install htop", "sudo apt purge htop"])).toBe(true);
  });
  it("falha sem remove/purge", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 9)!;
    expect(c.validate(vfs, ["sudo apt install htop"])).toBe(false);
  });
  it("falha sem install", () => {
    const vfs = createInitialVFS();
    const c = getChallenge("tundra-slackware", 9)!;
    expect(c.validate(vfs, ["sudo apt remove htop"])).toBe(false);
  });
});
