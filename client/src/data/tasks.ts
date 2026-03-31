import type { VFSState } from "../lib/terminal-logic";

export interface Task {
  levelId: string;
  title: string;
  description: string;
  hint: string;
  reward: number;
  commands: string[];
  validate: (vfs: VFSState, commandHistory: string[]) => boolean;
}

export const TASKS: Task[] = [
  {
    levelId: "floresta-stallman",
    title: "O Primeiro Passo na Floresta",
    description:
      "O espírito de Stallman te guia: 'Para conhecer a terra, primeiro deves saber onde estás!' Use o comando pwd para descobrir seu diretório atual.",
    hint: "Digite: pwd",
    reward: 10,
    commands: ["pwd"],
    validate: (_vfs, history) =>
      history.some((cmd) => cmd.trim() === "pwd"),
  },
  {
    levelId: "tundra-slackware",
    title: "Sobrevivendo ao Frio",
    description:
      "Na tundra, você precisa criar abrigo! Crie um diretório chamado 'abrigo' para se proteger do frio glacial do Slackware.",
    hint: "Digite: mkdir abrigo",
    reward: 15,
    commands: ["mkdir"],
    validate: (vfs, _history) => {
      const home = vfs.filesystem["/home/user"];
      return !!(home && home.children && "abrigo" in home.children);
    },
  },
  {
    levelId: "montanhas-kernighan",
    title: "O Grimório de Hello World",
    description:
      "Nas montanhas de Kernighan, todo aventureiro deve criar seu primeiro script. Crie um arquivo chamado 'hello.txt' com o conteúdo 'Hello, World!'.",
    hint: "Digite: echo 'Hello, World!' > hello.txt",
    reward: 20,
    commands: ["echo", "touch"],
    validate: (vfs, _history) => {
      const home = vfs.filesystem["/home/user"];
      if (!home?.children?.["hello.txt"]) return false;
      const content = home.children["hello.txt"].content || "";
      return content.includes("Hello, World!");
    },
  },
  {
    levelId: "pantano-systemd",
    title: "Navegando pelo Pantano",
    description:
      "O pantano é traiçoeiro! Crie um diretório 'logs' e dentro dele um arquivo 'daemon.log'. Mostre que você controla os processos!",
    hint: "mkdir logs && touch logs/daemon.log",
    reward: 25,
    commands: ["mkdir", "touch", "cd"],
    validate: (vfs, _history) => {
      const home = vfs.filesystem["/home/user"];
      const logsDir = home?.children?.["logs"];
      return !!(logsDir && logsDir.children && "daemon.log" in logsDir.children);
    },
  },
  {
    levelId: "reino-torvalds",
    title: "A Audiência com Torvalds",
    description:
      "Para ter audiência com o Rei Torvalds, você deve provar seu valor! Liste todos os arquivos do diretório atual com detalhes usando ls -la.",
    hint: "Digite: ls -la",
    reward: 30,
    commands: ["ls"],
    validate: (_vfs, history) =>
      history.some((cmd) => cmd.trim().startsWith("ls") && cmd.includes("-")),
  },
  {
    levelId: "cidade-gnu",
    title: "O Mercado do Código Livre",
    description:
      "No mercado da Cidade GNU, você deve criar um arquivo de manifesto. Crie 'manifesto.txt' com o texto 'Software Livre para Todos'.",
    hint: "echo 'Software Livre para Todos' > manifesto.txt",
    reward: 35,
    commands: ["echo"],
    validate: (vfs, _history) => {
      const home = vfs.filesystem["/home/user"];
      if (!home?.children?.["manifesto.txt"]) return false;
      const content = home.children["manifesto.txt"].content || "";
      return content.toLowerCase().includes("software livre");
    },
  },
  {
    levelId: "planicies-redhat",
    title: "A Colheita de RPMs",
    description:
      "Nas planícies de RedHat, organize a colheita! Crie um diretório 'pacotes', entre nele e crie um arquivo 'rpm-list.txt'.",
    hint: "mkdir pacotes && cd pacotes && touch rpm-list.txt",
    reward: 40,
    commands: ["mkdir", "cd", "touch"],
    validate: (vfs, _history) => {
      const home = vfs.filesystem["/home/user"];
      const pacotesDir = home?.children?.["pacotes"];
      return !!(
        pacotesDir &&
        pacotesDir.children &&
        "rpm-list.txt" in pacotesDir.children
      );
    },
  },
  {
    levelId: "deserto-debian",
    title: "O Oásis do APT",
    description:
      "No deserto de Debian, a água é preciosa como os pacotes .deb. Crie um arquivo 'sources.list' e escreva nele 'deb http://debian.org stable main'.",
    hint: "echo 'deb http://debian.org stable main' > sources.list",
    reward: 45,
    commands: ["echo"],
    validate: (vfs, _history) => {
      const home = vfs.filesystem["/home/user"];
      if (!home?.children?.["sources.list"]) return false;
      const content = home.children["sources.list"].content || "";
      return content.includes("debian");
    },
  },
  {
    levelId: "ilhas-canonical",
    title: "O Farol Ubuntu",
    description:
      "O farol das Ilhas de Canonical precisa de manutenção! Copie o arquivo 'manifesto.txt' para um novo arquivo chamado 'ubuntu-manifesto.txt'.",
    hint: "cp manifesto.txt ubuntu-manifesto.txt",
    reward: 50,
    commands: ["cp"],
    validate: (vfs, _history) => {
      const home = vfs.filesystem["/home/user"];
      return !!(home?.children?.["ubuntu-manifesto.txt"]);
    },
  },
  {
    levelId: "vale-arch",
    title: "A Chama do KISS",
    description:
      "No Vale do Arch, apenas os mestres chegam. Demonstre maestria: remova o arquivo 'ubuntu-manifesto.txt' e crie um diretório 'arch-configs' com um arquivo 'pacman.conf' dentro.",
    hint: "rm ubuntu-manifesto.txt && mkdir arch-configs && touch arch-configs/pacman.conf",
    reward: 60,
    commands: ["rm", "mkdir", "touch"],
    validate: (vfs, _history) => {
      const home = vfs.filesystem["/home/user"];
      const noUbuntu = !home?.children?.["ubuntu-manifesto.txt"];
      const archDir = home?.children?.["arch-configs"];
      const hasPacman = !!(
        archDir?.children && "pacman.conf" in archDir.children
      );
      return noUbuntu && hasPacman;
    },
  },
];

export const getTaskByLevel = (levelId: string): Task | undefined =>
  TASKS.find((t) => t.levelId === levelId);
