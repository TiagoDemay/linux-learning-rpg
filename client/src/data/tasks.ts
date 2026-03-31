import type { VFSState } from "../lib/terminal-logic";

// ─────────────────────────────────────────────────────────
//  Sub-task: um desafio individual dentro de um nível
// ─────────────────────────────────────────────────────────
export interface SubTask {
  id: string;
  title: string;
  description: string;
  hint: string;
  reward: number;
  commands: string[];
  validate: (vfs: VFSState, commandHistory: string[]) => boolean;
}

// ─────────────────────────────────────────────────────────
//  LevelTask: agrupa todas as sub-tarefas de um nível
// ─────────────────────────────────────────────────────────
export interface LevelTask {
  levelId: string;
  challenges: SubTask[];
}

// Atalho para quem ainda usa a interface antiga (1 desafio por nível)
export interface Task extends SubTask {
  levelId: string;
}

// ─────────────────────────────────────────────────────────
//  FLORESTA DE STALLMAN — 10 Desafios Progressivos
//  Cobrindo: pwd, ls, cd, mkdir, rmdir, touch, cp, mv, rm,
//            cat, less, nano, grep, find, chmod, chown,
//            ps, top, sudo, apt
// ─────────────────────────────────────────────────────────
const florestaDesafios: SubTask[] = [
  // ── Desafio 1: pwd + ls ──────────────────────────────
  {
    id: "floresta-1",
    title: "Desafio I — Reconhecendo o Território",
    description:
      "O espírito de Stallman sussurra: 'Antes de explorar, saiba onde estás e o que te cerca!' " +
      "Use pwd para descobrir seu diretório atual e depois ls para listar o que há nele.",
    hint: "pwd  →  ls",
    reward: 5,
    commands: ["pwd", "ls"],
    validate: (_vfs, history) => {
      const hasPwd = history.some((c) => c.trim() === "pwd");
      const hasLs = history.some((c) => c.trim().startsWith("ls"));
      return hasPwd && hasLs;
    },
  },

  // ── Desafio 2: mkdir + cd ────────────────────────────
  {
    id: "floresta-2",
    title: "Desafio II — Construindo um Acampamento",
    description:
      "Todo aventureiro precisa de uma base! Crie um diretório chamado 'acampamento' e entre nele com cd.",
    hint: "mkdir acampamento  →  cd acampamento",
    reward: 8,
    commands: ["mkdir", "cd"],
    validate: (vfs, history) => {
      const home = vfs.filesystem["/home/user"];
      const dirExists = !!(home?.children?.["acampamento"]);
      const enteredDir =
        vfs.currentPath === "/home/user/acampamento" ||
        history.some((c) => c.trim().startsWith("cd") && c.includes("acampamento"));
      return dirExists && enteredDir;
    },
  },

  // ── Desafio 3: touch + rmdir ─────────────────────────
  {
    id: "floresta-3",
    title: "Desafio III — Criando e Limpando Rastros",
    description:
      "Crie um arquivo chamado 'rascunho.txt' com touch. Depois, crie um diretório temporário " +
      "chamado 'lixo' e remova-o com rmdir — aventureiros cuidadosos não deixam rastros!",
    hint: "touch rascunho.txt  →  mkdir lixo  →  rmdir lixo",
    reward: 10,
    commands: ["touch", "rmdir", "mkdir"],
    validate: (vfs, _history) => {
      const home = vfs.filesystem["/home/user"];
      // rascunho.txt deve existir em algum lugar acessível
      const hasRascunho =
        !!(home?.children?.["rascunho.txt"]) ||
        !!(vfs.filesystem["/home/user/acampamento"]?.children?.["rascunho.txt"]);
      // lixo não deve mais existir
      const lixoGone =
        !home?.children?.["lixo"] &&
        !vfs.filesystem["/home/user/acampamento"]?.children?.["lixo"];
      return hasRascunho && lixoGone;
    },
  },

  // ── Desafio 4: cat + echo ────────────────────────────
  {
    id: "floresta-4",
    title: "Desafio IV — O Pergaminho Sagrado",
    description:
      "Escreva sua primeira mensagem no pergaminho! Use echo para criar um arquivo 'mensagem.txt' " +
      "com o texto 'Que o Software Livre prevaleça!' e depois leia-o com cat.",
    hint: "echo 'Que o Software Livre prevaleça!' > mensagem.txt  →  cat mensagem.txt",
    reward: 12,
    commands: ["echo", "cat"],
    validate: (vfs, history) => {
      // Procura mensagem.txt em qualquer caminho do VFS
      const allPaths = Object.keys(vfs.filesystem);
      const msgPath = allPaths.find((p) => p.endsWith("/mensagem.txt"));
      if (!msgPath) return false;
      const content = vfs.filesystem[msgPath]?.content || "";
      const hasContent = content.toLowerCase().includes("software livre");
      const readIt = history.some((c) => c.trim().startsWith("cat") && c.includes("mensagem"));
      return hasContent && readIt;
    },
  },

  // ── Desafio 5: cp + mv ───────────────────────────────
  {
    id: "floresta-5",
    title: "Desafio V — Cópias e Renomeações",
    description:
      "Copie 'mensagem.txt' para 'backup.txt' usando cp. Em seguida, renomeie 'rascunho.txt' " +
      "para 'notas.txt' usando mv. Organização é virtude de todo bom sysadmin!",
    hint: "cp mensagem.txt backup.txt  →  mv rascunho.txt notas.txt",
    reward: 15,
    commands: ["cp", "mv"],
    validate: (vfs, _history) => {
      const allPaths = Object.keys(vfs.filesystem);
      const hasBackup = allPaths.some((p) => p.endsWith("/backup.txt"));
      const hasNotas = allPaths.some((p) => p.endsWith("/notas.txt"));
      const noRascunho = !allPaths.some((p) => p.endsWith("/rascunho.txt"));
      return hasBackup && hasNotas && noRascunho;
    },
  },

  // ── Desafio 6: rm + find ─────────────────────────────
  {
    id: "floresta-6",
    title: "Desafio VI — Caçando e Eliminando",
    description:
      "Use find para localizar 'backup.txt' na floresta (find . -name 'backup.txt'). " +
      "Depois remova-o com rm — guardiões da floresta não toleram arquivos desnecessários!",
    hint: "find . -name 'backup.txt'  →  rm backup.txt",
    reward: 18,
    commands: ["find", "rm"],
    validate: (vfs, history) => {
      const allPaths = Object.keys(vfs.filesystem);
      const noBackup = !allPaths.some((p) => p.endsWith("/backup.txt"));
      const usedFind = history.some((c) => c.trim().startsWith("find"));
      return noBackup && usedFind;
    },
  },

  // ── Desafio 7: grep ──────────────────────────────────
  {
    id: "floresta-7",
    title: "Desafio VII — O Oráculo do grep",
    description:
      "O oráculo grep revela segredos ocultos nos textos! Crie um arquivo 'diario.txt' com " +
      "o texto 'Linux é liberdade' e use grep para encontrar a palavra 'liberdade' nele.",
    hint: "echo 'Linux é liberdade' > diario.txt  →  grep 'liberdade' diario.txt",
    reward: 20,
    commands: ["echo", "grep"],
    validate: (vfs, history) => {
      const allPaths = Object.keys(vfs.filesystem);
      const diarioPath = allPaths.find((p) => p.endsWith("/diario.txt"));
      if (!diarioPath) return false;
      const content = vfs.filesystem[diarioPath]?.content || "";
      const hasContent = content.toLowerCase().includes("liberdade");
      const usedGrep = history.some((c) => c.trim().startsWith("grep") && c.includes("liberdade"));
      return hasContent && usedGrep;
    },
  },

  // ── Desafio 8: chmod ─────────────────────────────────
  {
    id: "floresta-8",
    title: "Desafio VIII — As Permissões Mágicas",
    description:
      "As permissões protegem os segredos da floresta! Crie um arquivo 'feitico.sh' e use " +
      "chmod +x para torná-lo executável — assim os scripts ganham vida!",
    hint: "touch feitico.sh  →  chmod +x feitico.sh",
    reward: 22,
    commands: ["touch", "chmod"],
    validate: (vfs, history) => {
      const allPaths = Object.keys(vfs.filesystem);
      const hasFeitico = allPaths.some((p) => p.endsWith("/feitico.sh"));
      const usedChmod = history.some(
        (c) => c.trim().startsWith("chmod") && c.includes("feitico")
      );
      return hasFeitico && usedChmod;
    },
  },

  // ── Desafio 9: ps + top ──────────────────────────────
  {
    id: "floresta-9",
    title: "Desafio IX — Espíritos em Execução",
    description:
      "Os processos são espíritos que habitam o sistema! Use ps para listar os processos " +
      "ativos e depois top para ver o consumo de recursos em tempo real.",
    hint: "ps  →  top",
    reward: 25,
    commands: ["ps", "top"],
    validate: (_vfs, history) => {
      const usedPs = history.some((c) => c.trim().startsWith("ps"));
      const usedTop = history.some((c) => c.trim().startsWith("top"));
      return usedPs && usedTop;
    },
  },

  // ── Desafio 10: sudo + apt ───────────────────────────
  {
    id: "floresta-10",
    title: "Desafio X — O Grande Feitiço do APT",
    description:
      "O poder máximo da floresta! Use sudo para executar comandos como superusuário e " +
      "apt list para ver os pacotes disponíveis. Com grandes poderes vêm grandes responsabilidades!",
    hint: "sudo apt list  →  sudo apt update",
    reward: 30,
    commands: ["sudo", "apt"],
    validate: (_vfs, history) => {
      const usedSudo = history.some((c) => c.trim().startsWith("sudo"));
      const usedApt = history.some((c) => c.includes("apt"));
      return usedSudo && usedApt;
    },
  },
];

// ─────────────────────────────────────────────────────────
//  LEVEL TASKS — mapa de nível → array de desafios
// ─────────────────────────────────────────────────────────
export const LEVEL_TASKS: LevelTask[] = [
  {
    levelId: "floresta-stallman",
    challenges: florestaDesafios,
  },
  // Os demais níveis mantêm 1 desafio cada (estrutura legada)
  {
    levelId: "tundra-slackware",
    challenges: [
      {
        id: "tundra-1",
        title: "Sobrevivendo ao Frio",
        description:
          "Na tundra, você precisa criar abrigo! Crie um diretório chamado 'abrigo' para se proteger do frio glacial do Slackware.",
        hint: "mkdir abrigo",
        reward: 15,
        commands: ["mkdir"],
        validate: (vfs) => {
          const home = vfs.filesystem["/home/user"];
          return !!(home?.children?.["abrigo"]);
        },
      },
    ],
  },
  {
    levelId: "montanhas-kernighan",
    challenges: [
      {
        id: "montanhas-1",
        title: "O Grimório de Hello World",
        description:
          "Nas montanhas de Kernighan, todo aventureiro deve criar seu primeiro script. Crie 'hello.txt' com o conteúdo 'Hello, World!'.",
        hint: "echo 'Hello, World!' > hello.txt",
        reward: 20,
        commands: ["echo", "touch"],
        validate: (vfs) => {
          const allPaths = Object.keys(vfs.filesystem);
          const p = allPaths.find((x) => x.endsWith("/hello.txt"));
          if (!p) return false;
          return (vfs.filesystem[p]?.content || "").includes("Hello, World!");
        },
      },
    ],
  },
  {
    levelId: "pantano-systemd",
    challenges: [
      {
        id: "pantano-1",
        title: "Navegando pelo Pantano",
        description:
          "Crie um diretório 'logs' e dentro dele um arquivo 'daemon.log'. Mostre que você controla os processos!",
        hint: "mkdir logs && touch logs/daemon.log",
        reward: 25,
        commands: ["mkdir", "touch", "cd"],
        validate: (vfs) => {
          const home = vfs.filesystem["/home/user"];
          const logsDir = home?.children?.["logs"];
          return !!(logsDir?.children && "daemon.log" in logsDir.children);
        },
      },
    ],
  },
  {
    levelId: "reino-torvalds",
    challenges: [
      {
        id: "reino-1",
        title: "A Audiência com Torvalds",
        description:
          "Liste todos os arquivos do diretório atual com detalhes usando ls -la.",
        hint: "ls -la",
        reward: 30,
        commands: ["ls"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("ls") && c.includes("-")),
      },
    ],
  },
  {
    levelId: "cidade-gnu",
    challenges: [
      {
        id: "gnu-1",
        title: "O Mercado do Código Livre",
        description:
          "Crie 'manifesto.txt' com o texto 'Software Livre para Todos'.",
        hint: "echo 'Software Livre para Todos' > manifesto.txt",
        reward: 35,
        commands: ["echo"],
        validate: (vfs) => {
          const allPaths = Object.keys(vfs.filesystem);
          const p = allPaths.find((x) => x.endsWith("/manifesto.txt"));
          if (!p) return false;
          return (vfs.filesystem[p]?.content || "").toLowerCase().includes("software livre");
        },
      },
    ],
  },
  {
    levelId: "planicies-redhat",
    challenges: [
      {
        id: "redhat-1",
        title: "A Colheita de RPMs",
        description:
          "Crie um diretório 'pacotes', entre nele e crie um arquivo 'rpm-list.txt'.",
        hint: "mkdir pacotes && cd pacotes && touch rpm-list.txt",
        reward: 40,
        commands: ["mkdir", "cd", "touch"],
        validate: (vfs) => {
          const home = vfs.filesystem["/home/user"];
          const pacotesDir = home?.children?.["pacotes"];
          return !!(pacotesDir?.children && "rpm-list.txt" in pacotesDir.children);
        },
      },
    ],
  },
  {
    levelId: "deserto-debian",
    challenges: [
      {
        id: "debian-1",
        title: "O Oásis do APT",
        description:
          "Crie 'sources.list' com o conteúdo 'deb http://debian.org stable main'.",
        hint: "echo 'deb http://debian.org stable main' > sources.list",
        reward: 45,
        commands: ["echo"],
        validate: (vfs) => {
          const allPaths = Object.keys(vfs.filesystem);
          const p = allPaths.find((x) => x.endsWith("/sources.list"));
          if (!p) return false;
          return (vfs.filesystem[p]?.content || "").includes("debian");
        },
      },
    ],
  },
  {
    levelId: "ilhas-canonical",
    challenges: [
      {
        id: "canonical-1",
        title: "O Farol Ubuntu",
        description:
          "Copie 'manifesto.txt' para 'ubuntu-manifesto.txt'.",
        hint: "cp manifesto.txt ubuntu-manifesto.txt",
        reward: 50,
        commands: ["cp"],
        validate: (vfs) => {
          const allPaths = Object.keys(vfs.filesystem);
          return allPaths.some((p) => p.endsWith("/ubuntu-manifesto.txt"));
        },
      },
    ],
  },
  {
    levelId: "vale-arch",
    challenges: [
      {
        id: "arch-1",
        title: "A Chama do KISS",
        description:
          "Remova 'ubuntu-manifesto.txt' e crie 'arch-configs/pacman.conf'.",
        hint: "rm ubuntu-manifesto.txt && mkdir arch-configs && touch arch-configs/pacman.conf",
        reward: 60,
        commands: ["rm", "mkdir", "touch"],
        validate: (vfs) => {
          const allPaths = Object.keys(vfs.filesystem);
          const noUbuntu = !allPaths.some((p) => p.endsWith("/ubuntu-manifesto.txt"));
          const hasPacman = allPaths.some((p) => p.endsWith("/arch-configs/pacman.conf"));
          return noUbuntu && hasPacman;
        },
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────

/** Retorna o LevelTask completo de um nível */
export const getLevelTaskGroup = (levelId: string): LevelTask | undefined =>
  LEVEL_TASKS.find((lt) => lt.levelId === levelId);

/** Retorna uma sub-tarefa específica pelo índice */
export const getChallenge = (levelId: string, index: number): SubTask | undefined =>
  getLevelTaskGroup(levelId)?.challenges[index];

/** Total de desafios de um nível */
export const getChallengeCount = (levelId: string): number =>
  getLevelTaskGroup(levelId)?.challenges.length ?? 0;

/** Recompensa total de um nível (soma de todos os desafios) */
export const getTotalReward = (levelId: string): number =>
  getLevelTaskGroup(levelId)?.challenges.reduce((sum, c) => sum + c.reward, 0) ?? 0;

// Compatibilidade com código legado que usa getTaskByLevel
export const getTaskByLevel = (levelId: string): Task | undefined => {
  const group = getLevelTaskGroup(levelId);
  if (!group || group.challenges.length === 0) return undefined;
  const first = group.challenges[0];
  return { ...first, levelId };
};

// Array legado TASKS (mantido para compatibilidade com testes existentes)
export const TASKS: Task[] = LEVEL_TASKS.flatMap((lt) =>
  lt.challenges.map((c) => ({ ...c, levelId: lt.levelId }))
);
