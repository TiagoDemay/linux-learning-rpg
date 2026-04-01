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
  // ─────────────────────────────────────────────────────────
  //  TUNDRA DO SLACKWARE — 10 Desafios de Rede e Pacotes
  //  Cobrindo: hostname, uname, ping, ip, ss, curl, wget,
  //            apt update/list/search/show/install/remove,
  //            dpkg -l / dpkg -s
  // ─────────────────────────────────────────────────────────
  {
    levelId: "tundra-slackware",
    challenges: [

      // ── Desafio 1: hostname + uname ─────────────────────────
      {
        id: "tundra-1",
        title: "Desafio I — Reconhecendo a Força",
        description:
          "Nas terras geladas do Slackware, o primeiro passo é conhecer sua máquina! " +
          "Use hostname para descobrir o nome do servidor e uname -a para ver todas as informações do kernel.",
        hint: "hostname  →  uname -a",
        reward: 5,
        commands: ["hostname", "uname"],
        validate: (_vfs, history) => {
          const usedHostname = history.some((c) => c.trim().startsWith("hostname"));
          const usedUname = history.some((c) => c.trim().startsWith("uname"));
          return usedHostname && usedUname;
        },
      },

      // ── Desafio 2: ping ─────────────────────────────────────────
      {
        id: "tundra-2",
        title: "Desafio II — O Eco do Gelo",
        description:
          "As mensagens viajam pelo gelo! Use ping para testar a conectividade com o servidor " +
          "8.8.8.8 (o oráculo do Google). Envie exatamente 4 pacotes com ping -c 4 8.8.8.8.",
        hint: "ping -c 4 8.8.8.8",
        reward: 8,
        commands: ["ping"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("ping") && c.includes("8.8.8.8")),
      },

      // ── Desafio 3: ip addr / ifconfig ────────────────────────────
      {
        id: "tundra-3",
        title: "Desafio III — As Rotas do Gelo",
        description:
          "Todo explorador precisa conhecer suas rotas! Use ip addr para listar todas as " +
          "interfaces de rede do sistema e descobrir os endereços IP disponíveis.",
        hint: "ip addr",
        reward: 10,
        commands: ["ip"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("ip") && c.includes("addr")),
      },

      // ── Desafio 4: ss -tuln ──────────────────────────────────────
      {
        id: "tundra-4",
        title: "Desafio IV — As Portas da Fortaleza",
        description:
          "Uma fortaleza tem muitas portas — algumas abertas, outras fechadas! " +
          "Use ss -tuln para listar todas as portas TCP e UDP que estão escutando no sistema.",
        hint: "ss -tuln",
        reward: 12,
        commands: ["ss"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("ss") && c.includes("-")),
      },

      // ── Desafio 5: curl ────────────────────────────────────────────
      {
        id: "tundra-5",
        title: "Desafio V — O Mensageiro Curl",
        description:
          "O curl é o mensageiro das terras digitais! Use curl para buscar o cabeçalho HTTP " +
          "de um servidor com curl -I https://example.com e guarde o resultado em 'cabecalho.txt'.",
        hint: "curl -I https://example.com > cabecalho.txt",
        reward: 15,
        commands: ["curl"],
        validate: (vfs, history) => {
          const usedCurl = history.some((c) => c.trim().startsWith("curl"));
          const allPaths = Object.keys(vfs.filesystem);
          const hasCabecalho = allPaths.some((p) => p.endsWith("/cabecalho.txt"));
          return usedCurl && hasCabecalho;
        },
      },

      // ── Desafio 6: wget ────────────────────────────────────────────
      {
        id: "tundra-6",
        title: "Desafio VI — O Caçador wget",
        description:
          "O wget caça arquivos pela tundra digital! Simule um download criando um arquivo " +
          "'download.txt' com o conteúdo 'wget: arquivo baixado com sucesso' e depois use wget " +
          "para registrar o comando no histórico.",
        hint: "echo 'wget: arquivo baixado com sucesso' > download.txt  →  wget --help",
        reward: 18,
        commands: ["wget", "echo"],
        validate: (vfs, history) => {
          const allPaths = Object.keys(vfs.filesystem);
          const hasDownload = allPaths.some((p) => p.endsWith("/download.txt"));
          const usedWget = history.some((c) => c.trim().startsWith("wget"));
          return hasDownload && usedWget;
        },
      },

      // ── Desafio 7: apt update + apt list ─────────────────────────
      {
        id: "tundra-7",
        title: "Desafio VII — Atualizando os Mapas",
        description:
          "Os mapas da tundra precisam ser atualizados! Use sudo apt update para sincronizar " +
          "os repositórios e depois apt list --installed para ver os pacotes já instalados.",
        hint: "sudo apt update  →  apt list --installed",
        reward: 20,
        commands: ["apt", "sudo"],
        validate: (_vfs, history) => {
          const usedUpdate = history.some(
            (c) => c.includes("apt") && c.includes("update")
          );
          const usedList = history.some(
            (c) => c.includes("apt") && c.includes("list")
          );
          return usedUpdate && usedList;
        },
      },

      // ── Desafio 8: apt search + apt show ────────────────────────
      {
        id: "tundra-8",
        title: "Desafio VIII — O Mercado de Peles",
        description:
          "No mercado da tundra, você precisa pesquisar antes de comprar! Use apt search curl " +
          "para encontrar pacotes relacionados ao curl e depois apt show curl para ver os detalhes.",
        hint: "apt search curl  →  apt show curl",
        reward: 22,
        commands: ["apt"],
        validate: (_vfs, history) => {
          const usedSearch = history.some(
            (c) => c.includes("apt") && c.includes("search")
          );
          const usedShow = history.some(
            (c) => c.includes("apt") && c.includes("show")
          );
          return usedSearch && usedShow;
        },
      },

      // ── Desafio 9: dpkg ─────────────────────────────────────────────
      {
        id: "tundra-9",
        title: "Desafio IX — O Inventário do Explorador",
        description:
          "Todo explorador precisa saber o que carrega! Use dpkg -l para listar todos os " +
          "pacotes instalados e dpkg -s bash para inspecionar os detalhes do pacote bash.",
        hint: "dpkg -l  →  dpkg -s bash",
        reward: 25,
        commands: ["dpkg"],
        validate: (_vfs, history) => {
          const usedDpkgL = history.some(
            (c) => c.trim().startsWith("dpkg") && c.includes("-l")
          );
          const usedDpkgS = history.some(
            (c) => c.trim().startsWith("dpkg") && c.includes("-s")
          );
          return usedDpkgL && usedDpkgS;
        },
      },

      // ── Desafio 10: apt install + apt remove ──────────────────────
      {
        id: "tundra-10",
        title: "Desafio X — O Grande Ritual do APT",
        description:
          "O ritual supremo da tundra! Use sudo apt install htop para instalar o monitor de " +
          "processos e depois sudo apt remove htop para desinstalá-lo. Domine o ciclo de vida dos pacotes!",
        hint: "sudo apt install htop  →  sudo apt remove htop",
        reward: 30,
        commands: ["apt", "sudo"],
        validate: (_vfs, history) => {
          const usedInstall = history.some(
            (c) => c.includes("apt") && c.includes("install")
          );
          const usedRemove = history.some(
            (c) => c.includes("apt") && (c.includes("remove") || c.includes("purge"))
          );
          return usedInstall && usedRemove;
        },
      },
    ],
  },
  // ═══════════════════════════════════════════════════════════
  //  MONTANHAS DE KERNIGHAN — Compilação & Scripting
  //  Cobrindo: echo, touch, cat, chmod, bash, sh, which,
  //            env, export, alias, source, grep, sed, awk
  // ═══════════════════════════════════════════════════════════
  {
    levelId: "montanhas-kernighan",
    challenges: [
      {
        id: "montanhas-1",
        title: "Desafio I — O Grimório de Hello World",
        description:
          "Nas montanhas de Kernighan, toda jornada começa com um 'Hello, World!'. " +
          "Crie o arquivo 'hello.txt' com o conteúdo 'Hello, World!' usando o comando echo.",
        hint: "echo 'Hello, World!' > hello.txt",
        reward: 10,
        commands: ["echo"],
        validate: (vfs) => {
          const allPaths = Object.keys(vfs.filesystem);
          const p = allPaths.find((x) => x.endsWith("/hello.txt"));
          return !!(p && (vfs.filesystem[p]?.content || "").includes("Hello, World!"));
        },
      },
      {
        id: "montanhas-2",
        title: "Desafio II — A Forja do Script",
        description:
          "Todo ferreiro das montanhas precisa de um script! Crie 'saudar.sh' com o conteúdo " +
          "'#!/bin/bash\\necho Olá, Aventureiro!' e depois torne-o executável com chmod +x.",
        hint: "echo '#!/bin/bash\necho Olá, Aventureiro!' > saudar.sh  \u2192  chmod +x saudar.sh",
        reward: 15,
        commands: ["echo", "chmod"],
        validate: (vfs, history) => {
          const allPaths = Object.keys(vfs.filesystem);
          const hasScript = allPaths.some((x) => x.endsWith("/saudar.sh"));
          const usedChmod = history.some((c) => c.includes("chmod") && c.includes("saudar.sh"));
          return hasScript && usedChmod;
        },
      },
      {
        id: "montanhas-3",
        title: "Desafio III — O Ouro do Which",
        description:
          "Nas montanhas, saber onde estão suas ferramentas é essencial! " +
          "Use which bash para descobrir o caminho do interpretador bash e " +
          "which python3 para localizar o Python.",
        hint: "which bash  \u2192  which python3",
        reward: 12,
        commands: ["which"],
        validate: (_vfs, history) => {
          const hasBash = history.some((c) => c.trim().startsWith("which") && c.includes("bash"));
          const hasPython = history.some((c) => c.trim().startsWith("which") && c.includes("python"));
          return hasBash && hasPython;
        },
      },
      {
        id: "montanhas-4",
        title: "Desafio IV — O Mapa das Variáveis",
        description:
          "As variáveis de ambiente são o mapa secreto das montanhas! " +
          "Use env para listar todas as variáveis de ambiente do sistema.",
        hint: "env",
        reward: 12,
        commands: ["env"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim() === "env" || c.trim().startsWith("env ")),
      },
      {
        id: "montanhas-5",
        title: "Desafio V — Gravando no Pergaminho",
        description:
          "Exporte uma variável de ambiente chamada AVENTUREIRO com seu nome! " +
          "Use export AVENTUREIRO='SeuNome' e depois echo $AVENTUREIRO para confirmar.",
        hint: "export AVENTUREIRO='Kernighan'  \u2192  echo $AVENTUREIRO",
        reward: 15,
        commands: ["export", "echo"],
        validate: (_vfs, history) => {
          const usedExport = history.some((c) => c.trim().startsWith("export") && c.includes("AVENTUREIRO"));
          const usedEcho = history.some((c) => c.includes("echo") && c.includes("AVENTUREIRO"));
          return usedExport && usedEcho;
        },
      },
      {
        id: "montanhas-6",
        title: "Desafio VI — O Alias do Mestre",
        description:
          "Os mestres das montanhas criam atalhos mágicos! " +
          "Crie um alias chamado 'll' que execute 'ls -la' usando alias ll='ls -la'.",
        hint: "alias ll='ls -la'",
        reward: 18,
        commands: ["alias"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("alias") && c.includes("ll")),
      },
      {
        id: "montanhas-7",
        title: "Desafio VII — A Pedra do Grep",
        description:
          "O grep é a pedra de toque dos mestres! Crie 'registros.txt' com três linhas: " +
          "'erro: disco cheio', 'info: sistema ok', 'erro: memória baixa'. " +
          "Depois use grep 'erro' registros.txt para filtrar apenas as linhas de erro.",
        hint: "printf 'erro: disco cheio\ninfo: sistema ok\nerro: memória baixa' > registros.txt  \u2192  grep 'erro' registros.txt",
        reward: 20,
        commands: ["echo", "grep"],
        validate: (vfs, history) => {
          const allPaths = Object.keys(vfs.filesystem);
          const hasFile = allPaths.some((x) => x.endsWith("/registros.txt"));
          const usedGrep = history.some((c) => c.includes("grep") && c.includes("registros.txt"));
          return hasFile && usedGrep;
        },
      },
      {
        id: "montanhas-8",
        title: "Desafio VIII — O Cinzel do Sed",
        description:
          "O sed é o cinzel que esculpe textos nas rochas! " +
          "Use sed para substituir 'erro' por 'ERRO' no arquivo registros.txt: " +
          "sed 's/erro/ERRO/g' registros.txt",
        hint: "sed 's/erro/ERRO/g' registros.txt",
        reward: 22,
        commands: ["sed"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("sed") && c.includes("registros.txt")),
      },
      {
        id: "montanhas-9",
        title: "Desafio IX — O Martelo do Awk",
        description:
          "O awk é o martelo mais poderoso das montanhas! " +
          "Use awk para imprimir apenas a segunda palavra de cada linha do registros.txt: " +
          "awk '{print $2}' registros.txt",
        hint: "awk '{print $2}' registros.txt",
        reward: 25,
        commands: ["awk"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("awk") && c.includes("registros.txt")),
      },
      {
        id: "montanhas-10",
        title: "Desafio X — O Ritual do Compilador",
        description:
          "O ritual supremo das montanhas: compile um programa! Crie 'programa.c' com o conteúdo " +
          "'int main(){return 0;}' e depois simule a compilação com gcc programa.c -o programa.",
        hint: "echo 'int main(){return 0;}' > programa.c  \u2192  gcc programa.c -o programa",
        reward: 30,
        commands: ["echo", "gcc"],
        validate: (vfs, history) => {
          const allPaths = Object.keys(vfs.filesystem);
          const hasC = allPaths.some((x) => x.endsWith("/programa.c"));
          const usedGcc = history.some((c) => c.trim().startsWith("gcc") && c.includes("programa"));
          return hasC && usedGcc;
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  //  PÂNTANO DE SYSTEMD — Serviços & Daemons
  //  Cobrindo: systemctl, journalctl, service, ps, kill,
  //            crontab, at, top, htop, free, df, du
  // ═══════════════════════════════════════════════════════════
  {
    levelId: "pantano-systemd",
    challenges: [
      {
        id: "pantano-1",
        title: "Desafio I — Os Ecos do Pantâno",
        description:
          "No pantâno, os daemons sussurram! Use ps aux para ver todos os processos " +
          "em execução no sistema e descobrir quais espíritos habitam este lugar.",
        hint: "ps aux",
        reward: 10,
        commands: ["ps"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("ps")),
      },
      {
        id: "pantano-2",
        title: "Desafio II — O Espínho do Kill",
        description:
          "Alguns espíritos do pantâno precisam ser exorcizados! " +
          "Use kill -l para listar todos os sinais disponíveis e entender o poder do exorcista.",
        hint: "kill -l",
        reward: 12,
        commands: ["kill"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("kill") && c.includes("-l")),
      },
      {
        id: "pantano-3",
        title: "Desafio III — O Oráculo do Systemctl",
        description:
          "O systemctl é o oráculo que controla todos os daemons! " +
          "Use systemctl status para ver o estado geral do sistema e seus serviços.",
        hint: "systemctl status",
        reward: 15,
        commands: ["systemctl"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("systemctl") && c.includes("status")),
      },
      {
        id: "pantano-4",
        title: "Desafio IV — Acordando o Daemon",
        description:
          "Acorde o daemon do SSH! Use systemctl start ssh para iniciar o serviço " +
          "e depois systemctl status ssh para verificar se ele acordou.",
        hint: "systemctl start ssh  \u2192  systemctl status ssh",
        reward: 18,
        commands: ["systemctl"],
        validate: (_vfs, history) => {
          const started = history.some((c) => c.includes("systemctl") && c.includes("start") && c.includes("ssh"));
          const checked = history.some((c) => c.includes("systemctl") && c.includes("status") && c.includes("ssh"));
          return started && checked;
        },
      },
      {
        id: "pantano-5",
        title: "Desafio V — O Sono do Daemon",
        description:
          "Todo daemon precisa dormir! Use systemctl stop ssh para parar o serviço " +
          "e systemctl disable ssh para impedi-lo de acordar sozinho na próxima inicialização.",
        hint: "systemctl stop ssh  \u2192  systemctl disable ssh",
        reward: 18,
        commands: ["systemctl"],
        validate: (_vfs, history) => {
          const stopped = history.some((c) => c.includes("systemctl") && c.includes("stop") && c.includes("ssh"));
          const disabled = history.some((c) => c.includes("systemctl") && c.includes("disable") && c.includes("ssh"));
          return stopped && disabled;
        },
      },
      {
        id: "pantano-6",
        title: "Desafio VI — O Diário do Pantâno",
        description:
          "O journalctl guarda o diário de todos os daemons! " +
          "Use journalctl -n 20 para ver as últimas 20 entradas do log do sistema.",
        hint: "journalctl -n 20",
        reward: 20,
        commands: ["journalctl"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("journalctl")),
      },
      {
        id: "pantano-7",
        title: "Desafio VII — O Relógio das Bruxas",
        description:
          "O cron é o relógio das bruxas que agenda tarefas automáticas! " +
          "Use crontab -l para listar as tarefas agendadas do usuário atual.",
        hint: "crontab -l",
        reward: 20,
        commands: ["crontab"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("crontab")),
      },
      {
        id: "pantano-8",
        title: "Desafio VIII — O Peso das Sombras",
        description:
          "Quanto espaço as sombras do pantâno ocupam? " +
          "Use df -h para ver o uso dos discos em formato legível e " +
          "du -sh /home para ver o tamanho do diretório home.",
        hint: "df -h  \u2192  du -sh /home",
        reward: 22,
        commands: ["df", "du"],
        validate: (_vfs, history) => {
          const usedDf = history.some((c) => c.trim().startsWith("df"));
          const usedDu = history.some((c) => c.trim().startsWith("du"));
          return usedDf && usedDu;
        },
      },
      {
        id: "pantano-9",
        title: "Desafio IX — A Memória do Pantâno",
        description:
          "Quanto de memória os espíritos consomem? " +
          "Use free -h para ver o uso de memória RAM e swap em formato legível.",
        hint: "free -h",
        reward: 22,
        commands: ["free"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("free")),
      },
      {
        id: "pantano-10",
        title: "Desafio X — O Ritual do Systemd",
        description:
          "O ritual supremo: crie um arquivo de log do sistema! " +
          "Crie o diretório 'logs' e dentro dele 'daemon.log' com o conteúdo " +
          "'[INFO] Daemon iniciado com sucesso'. Depois use journalctl --no-pager para confirmar.",
        hint: "mkdir logs && echo '[INFO] Daemon iniciado com sucesso' > logs/daemon.log  \u2192  journalctl --no-pager",
        reward: 30,
        commands: ["mkdir", "echo", "journalctl"],
        validate: (vfs, history) => {
          const home = vfs.filesystem["/home/user"];
          const logsDir = home?.children?.["logs"];
          const hasLog = !!(logsDir?.children && "daemon.log" in logsDir.children);
          const usedJournal = history.some((c) => c.trim().startsWith("journalctl"));
          return hasLog && usedJournal;
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  //  REINO DE TORVALDS — Git & Versionamento
  //  Cobrindo: git init, add, commit, status, log, diff,
  //            branch, checkout, merge, clone, remote
  // ═══════════════════════════════════════════════════════════
  {
    levelId: "reino-torvalds",
    challenges: [
      {
        id: "reino-1",
        title: "Desafio I — Fundando o Reino",
        description:
          "Todo reino precisa de uma fundação! Crie um diretório 'meu-reino', entre nele " +
          "e inicialize um repositório Git com git init.",
        hint: "mkdir meu-reino  \u2192  cd meu-reino  \u2192  git init",
        reward: 10,
        commands: ["mkdir", "cd", "git"],
        validate: (vfs, history) => {
          const home = vfs.filesystem["/home/user"];
          const hasDir = !!(home?.children?.["meu-reino"]);
          const usedGitInit = history.some((c) => c.includes("git") && c.includes("init"));
          return hasDir && usedGitInit;
        },
      },
      {
        id: "reino-2",
        title: "Desafio II — O Primeiro Decreto",
        description:
          "Todo rei precisa de um decreto! Crie o arquivo 'README.md' com o conteúdo " +
          "'# Meu Reino Linux' e use git status para ver o estado do repositório.",
        hint: "echo '# Meu Reino Linux' > README.md  \u2192  git status",
        reward: 12,
        commands: ["echo", "git"],
        validate: (vfs, history) => {
          const allPaths = Object.keys(vfs.filesystem);
          const hasReadme = allPaths.some((x) => x.endsWith("/README.md"));
          const usedStatus = history.some((c) => c.includes("git") && c.includes("status"));
          return hasReadme && usedStatus;
        },
      },
      {
        id: "reino-3",
        title: "Desafio III — Adicionando ao Cartório",
        description:
          "O git add prepara seus arquivos para o commit! " +
          "Use git add README.md para adicionar o arquivo à área de staging.",
        hint: "git add README.md",
        reward: 12,
        commands: ["git"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("git") && c.includes("add")),
      },
      {
        id: "reino-4",
        title: "Desafio IV — O Primeiro Commit Real",
        description:
          "Grave sua história para sempre! Use git commit -m 'Primeiro commit do reino' " +
          "para registrar suas mudanças no histórico do repositório.",
        hint: "git commit -m 'Primeiro commit do reino'",
        reward: 15,
        commands: ["git"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("git") && c.includes("commit") && c.includes("-m")),
      },
      {
        id: "reino-5",
        title: "Desafio V — Os Anais do Reino",
        description:
          "Consulte os anais do reino! Use git log para ver o histórico de commits " +
          "e git log --oneline para uma versão resumida.",
        hint: "git log  \u2192  git log --oneline",
        reward: 15,
        commands: ["git"],
        validate: (_vfs, history) => {
          const usedLog = history.some((c) => c.includes("git") && c.includes("log"));
          return usedLog;
        },
      },
      {
        id: "reino-6",
        title: "Desafio VI — A Muralha do Branch",
        description:
          "Todo reino tem suas províncias! Crie uma nova branch chamada 'desenvolvimento' " +
          "com git branch desenvolvimento e depois mude para ela com git checkout desenvolvimento.",
        hint: "git branch desenvolvimento  \u2192  git checkout desenvolvimento",
        reward: 18,
        commands: ["git"],
        validate: (_vfs, history) => {
          const createdBranch = history.some((c) => c.includes("git") && c.includes("branch") && c.includes("desenvolvimento"));
          const switched = history.some((c) => c.includes("git") && c.includes("checkout") && c.includes("desenvolvimento"));
          return createdBranch && switched;
        },
      },
      {
        id: "reino-7",
        title: "Desafio VII — O Espínho do Diff",
        description:
          "Veja as diferenças entre versões! Edite o README.md adicionando uma linha " +
          "e use git diff para ver exatamente o que mudou.",
        hint: "echo 'Nova linha' >> README.md  \u2192  git diff",
        reward: 20,
        commands: ["echo", "git"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("git") && c.includes("diff")),
      },
      {
        id: "reino-8",
        title: "Desafio VIII — A União dos Reinos",
        description:
          "Una as províncias! Volte para a branch main com git checkout main " +
          "e depois una a branch desenvolvimento com git merge desenvolvimento.",
        hint: "git checkout main  \u2192  git merge desenvolvimento",
        reward: 22,
        commands: ["git"],
        validate: (_vfs, history) => {
          const backToMain = history.some((c) => c.includes("git") && c.includes("checkout") && (c.includes("main") || c.includes("master")));
          const merged = history.some((c) => c.includes("git") && c.includes("merge"));
          return backToMain && merged;
        },
      },
      {
        id: "reino-9",
        title: "Desafio IX — O Embaixador Clone",
        description:
          "Simule a clonagem de um repositório remoto! " +
          "Use git clone --help para explorar as opções do comando clone.",
        hint: "git clone --help",
        reward: 22,
        commands: ["git"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("git") && c.includes("clone")),
      },
      {
        id: "reino-10",
        title: "Desafio X — O Ritual do Rei Torvalds",
        description:
          "O ritual supremo do reino! Configure sua identidade no Git com " +
          "git config user.name 'Seu Nome' e git config user.email 'seu@email.com'.",
        hint: "git config user.name 'Aventureiro'  \u2192  git config user.email 'aventureiro@kernel.org'",
        reward: 30,
        commands: ["git"],
        validate: (_vfs, history) => {
          const setName = history.some((c) => c.includes("git") && c.includes("config") && c.includes("user.name"));
          const setEmail = history.some((c) => c.includes("git") && c.includes("config") && c.includes("user.email"));
          return setName && setEmail;
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  //  CIDADE LIVRE DE GNU — Variáveis de Ambiente & Shell
  //  Cobrindo: env, export, unset, echo $VAR, source,
  //            .bashrc, PATH, printenv, set, read
  // ═══════════════════════════════════════════════════════════
  {
    levelId: "cidade-gnu",
    challenges: [
      {
        id: "gnu-1",
        title: "Desafio I — A Praça das Variáveis",
        description:
          "Na Cidade Livre, todos têm voz! Use printenv para listar todas as " +
          "variáveis de ambiente e depois printenv HOME para ver seu diretório home.",
        hint: "printenv  \u2192  printenv HOME",
        reward: 10,
        commands: ["printenv"],
        validate: (_vfs, history) => {
          const usedPrintenv = history.some((c) => c.trim().startsWith("printenv"));
          return usedPrintenv;
        },
      },
      {
        id: "gnu-2",
        title: "Desafio II — O Manifesto do Echo",
        description:
          "Proclame o manifesto da liberdade! Crie 'manifesto.txt' com o texto " +
          "'Software Livre para Todos' e exiba seu conteúdo com cat.",
        hint: "echo 'Software Livre para Todos' > manifesto.txt  \u2192  cat manifesto.txt",
        reward: 10,
        commands: ["echo", "cat"],
        validate: (vfs) => {
          const allPaths = Object.keys(vfs.filesystem);
          const p = allPaths.find((x) => x.endsWith("/manifesto.txt"));
          return !!(p && (vfs.filesystem[p]?.content || "").toLowerCase().includes("software livre"));
        },
      },
      {
        id: "gnu-3",
        title: "Desafio III — A Proclamação do Export",
        description:
          "Exporte a liberdade para todo o sistema! " +
          "Use export GNU_FREEDOM='true' para criar uma variável de ambiente " +
          "e echo $GNU_FREEDOM para confirmar.",
        hint: "export GNU_FREEDOM='true'  \u2192  echo $GNU_FREEDOM",
        reward: 12,
        commands: ["export", "echo"],
        validate: (_vfs, history) => {
          const exported = history.some((c) => c.includes("export") && c.includes("GNU_FREEDOM"));
          const echoed = history.some((c) => c.includes("echo") && c.includes("GNU_FREEDOM"));
          return exported && echoed;
        },
      },
      {
        id: "gnu-4",
        title: "Desafio IV — O Caminho da Liberdade",
        description:
          "O PATH é o caminho que o shell usa para encontrar comandos! " +
          "Use echo $PATH para ver todos os diretórios no caminho de busca.",
        hint: "echo $PATH",
        reward: 12,
        commands: ["echo"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("echo") && c.includes("PATH")),
      },
      {
        id: "gnu-5",
        title: "Desafio V — A Constituição do Bashrc",
        description:
          "O .bashrc é a constituição do seu shell! " +
          "Use cat ~/.bashrc para ler o arquivo de configuração do bash.",
        hint: "cat ~/.bashrc",
        reward: 15,
        commands: ["cat"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("cat") && c.includes(".bashrc")),
      },
      {
        id: "gnu-6",
        title: "Desafio VI — Adicionando à Constituição",
        description:
          "Adicione um alias permanente ao .bashrc! " +
          "Use echo \"alias ll='ls -la'\" >> ~/.bashrc para adicionar o alias ao arquivo.",
        hint: "echo \"alias ll='ls -la'\" >> ~/.bashrc",
        reward: 18,
        commands: ["echo"],
        validate: (vfs, history) => {
          const usedAppend = history.some((c) => c.includes(">>") && c.includes(".bashrc"));
          const bashrc = vfs.filesystem["/home/user/.bashrc"];
          const hasAlias = (bashrc?.content || "").includes("alias");
          return usedAppend || hasAlias;
        },
      },
      {
        id: "gnu-7",
        title: "Desafio VII — A Fonte da Liberdade",
        description:
          "Aplique as mudanças do .bashrc sem reiniciar o terminal! " +
          "Use source ~/.bashrc para recarregar as configurações.",
        hint: "source ~/.bashrc",
        reward: 18,
        commands: ["source"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("source") || c.trim().startsWith(". ~")),
      },
      {
        id: "gnu-8",
        title: "Desafio VIII — O Exílio do Unset",
        description:
          "Bana uma variável do reino! " +
          "Use unset GNU_FREEDOM para remover a variável de ambiente criada anteriormente.",
        hint: "unset GNU_FREEDOM",
        reward: 20,
        commands: ["unset"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("unset") && c.includes("GNU_FREEDOM")),
      },
      {
        id: "gnu-9",
        title: "Desafio IX — O Escriba do Here-Doc",
        description:
          "Crie um arquivo multi-linha usando here-doc! " +
          "Use cat > licenca.txt << EOF para criar 'licenca.txt' com o conteúdo 'GNU GPL v3'.",
        hint: "printf 'GNU GPL v3\nSoftware Livre' > licenca.txt",
        reward: 22,
        commands: ["cat", "echo"],
        validate: (vfs) => {
          const allPaths = Object.keys(vfs.filesystem);
          return allPaths.some((x) => x.endsWith("/licenca.txt"));
        },
      },
      {
        id: "gnu-10",
        title: "Desafio X — O Grande Ritual GNU",
        description:
          "O ritual supremo da Cidade Livre! Crie um script 'gnu-setup.sh' que exporte " +
          "a variável DISTRO='GNU/Linux' e exiba 'Liberdade Configurada!'. " +
          "Use echo para criar o script e chmod +x para torná-lo executável.",
        hint: "echo 'export DISTRO=GNU/Linux' > gnu-setup.sh  \u2192  chmod +x gnu-setup.sh",
        reward: 30,
        commands: ["echo", "chmod"],
        validate: (vfs, history) => {
          const allPaths = Object.keys(vfs.filesystem);
          const hasScript = allPaths.some((x) => x.endsWith("/gnu-setup.sh"));
          const madeExec = history.some((c) => c.includes("chmod") && c.includes("gnu-setup.sh"));
          return hasScript && madeExec;
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  //  PLANÍCIES DE REDHAT — RPM, YUM & DNF
  //  Cobrindo: rpm, yum, dnf, subscription-manager,
  //            yum list, dnf search, rpm -qa, rpm -qi
  // ═══════════════════════════════════════════════════════════
  {
    levelId: "planicies-redhat",
    challenges: [
      {
        id: "redhat-1",
        title: "Desafio I — Os Campos do RPM",
        description:
          "Nas planícies, o RPM é a ferramenta do lavrador! " +
          "Use rpm --version para ver a versão do RPM e rpm --help para explorar suas opções.",
        hint: "rpm --version  \u2192  rpm --help",
        reward: 10,
        commands: ["rpm"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("rpm")),
      },
      {
        id: "redhat-2",
        title: "Desafio II — O Inventário da Colheita",
        description:
          "Liste todos os pacotes RPM instalados! " +
          "Use rpm -qa para ver todos os pacotes e rpm -qa | grep bash para filtrar o bash.",
        hint: "rpm -qa  \u2192  rpm -qa | grep bash",
        reward: 12,
        commands: ["rpm", "grep"],
        validate: (_vfs, history) => {
          const usedRpmQa = history.some((c) => c.includes("rpm") && c.includes("-qa"));
          return usedRpmQa;
        },
      },
      {
        id: "redhat-3",
        title: "Desafio III — O Pergaminho do Pacote",
        description:
          "Inspecione um pacote instalado! " +
          "Use rpm -qi bash para ver informações detalhadas sobre o pacote bash.",
        hint: "rpm -qi bash",
        reward: 12,
        commands: ["rpm"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("rpm") && c.includes("-qi")),
      },
      {
        id: "redhat-4",
        title: "Desafio IV — O Mercador YUM",
        description:
          "O YUM é o mercador das planícies! " +
          "Use yum --version para ver a versão e yum list installed para listar pacotes instalados.",
        hint: "yum --version  \u2192  yum list installed",
        reward: 15,
        commands: ["yum"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("yum")),
      },
      {
        id: "redhat-5",
        title: "Desafio V — A Busca do YUM",
        description:
          "Procure por pacotes no repositório! " +
          "Use yum search httpd para encontrar o servidor web Apache.",
        hint: "yum search httpd",
        reward: 15,
        commands: ["yum"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("yum") && c.includes("search")),
      },
      {
        id: "redhat-6",
        title: "Desafio VI — O Novo Mercador DNF",
        description:
          "O DNF é o sucessor moderno do YUM! " +
          "Use dnf --version para ver a versão e dnf repolist para listar os repositórios ativos.",
        hint: "dnf --version  \u2192  dnf repolist",
        reward: 18,
        commands: ["dnf"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("dnf")),
      },
      {
        id: "redhat-7",
        title: "Desafio VII — A Busca do DNF",
        description:
          "Pesquise pacotes com o DNF! " +
          "Use dnf search vim para encontrar o editor Vim e dnf info vim para ver seus detalhes.",
        hint: "dnf search vim  \u2192  dnf info vim",
        reward: 20,
        commands: ["dnf"],
        validate: (_vfs, history) => {
          const searched = history.some((c) => c.includes("dnf") && c.includes("search"));
          const infoed = history.some((c) => c.includes("dnf") && c.includes("info"));
          return searched && infoed;
        },
      },
      {
        id: "redhat-8",
        title: "Desafio VIII — O Celeiro dos Grupos",
        description:
          "O DNF gerencia grupos de pacotes! " +
          "Use dnf grouplist para ver os grupos disponíveis e dnf groupinfo 'Development Tools' para detalhes.",
        hint: "dnf grouplist  \u2192  dnf groupinfo 'Development Tools'",
        reward: 22,
        commands: ["dnf"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("dnf") && c.includes("group")),
      },
      {
        id: "redhat-9",
        title: "Desafio IX — O Registro da Colheita",
        description:
          "Crie um registro da sua colheita! " +
          "Crie o diretório 'pacotes' e dentro dele 'rpm-list.txt' com o conteúdo 'bash vim curl wget'.",
        hint: "mkdir pacotes && echo 'bash vim curl wget' > pacotes/rpm-list.txt",
        reward: 22,
        commands: ["mkdir", "echo"],
        validate: (vfs) => {
          const home = vfs.filesystem["/home/user"];
          const pacotesDir = home?.children?.["pacotes"];
          return !!(pacotesDir?.children && "rpm-list.txt" in pacotesDir.children);
        },
      },
      {
        id: "redhat-10",
        title: "Desafio X — O Grande Ritual RedHat",
        description:
          "O ritual supremo das planícies! " +
          "Use dnf check-update para verificar atualizações disponíveis e " +
          "dnf history para ver o histórico de instalações.",
        hint: "dnf check-update  \u2192  dnf history",
        reward: 30,
        commands: ["dnf"],
        validate: (_vfs, history) => {
          const checked = history.some((c) => c.includes("dnf") && (c.includes("check") || c.includes("update")));
          const history2 = history.some((c) => c.includes("dnf") && c.includes("history"));
          return checked && history2;
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  //  DESERTO DE DEBIAN — dpkg Avançado & APT
  //  Cobrindo: dpkg-query, dpkg-reconfigure, apt-cache,
  //            apt-get, dpkg -L, dpkg --get-selections,
  //            apt-mark, apt-cache depends
  // ═══════════════════════════════════════════════════════════
  {
    levelId: "deserto-debian",
    challenges: [
      {
        id: "debian-1",
        title: "Desafio I — O Oásis do APT-Cache",
        description:
          "No deserto, o apt-cache é o oásis do conhecimento! " +
          "Use apt-cache stats para ver estatísticas do cache de pacotes.",
        hint: "apt-cache stats",
        reward: 10,
        commands: ["apt-cache"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("apt-cache")),
      },
      {
        id: "debian-2",
        title: "Desafio II — As Areias do dpkg-query",
        description:
          "O dpkg-query vasculha as areias do deserto! " +
          "Use dpkg-query -l para listar todos os pacotes e dpkg-query -l | grep bash para filtrar.",
        hint: "dpkg-query -l  \u2192  dpkg-query -l | grep bash",
        reward: 12,
        commands: ["dpkg-query", "grep"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("dpkg-query")),
      },
      {
        id: "debian-3",
        title: "Desafio III — O Mapa dos Arquivos",
        description:
          "Descubra quais arquivos um pacote instalou! " +
          "Use dpkg -L bash para listar todos os arquivos do pacote bash.",
        hint: "dpkg -L bash",
        reward: 12,
        commands: ["dpkg"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("dpkg") && c.includes("-L")),
      },
      {
        id: "debian-4",
        title: "Desafio IV — O Pergaminho das Seleções",
        description:
          "Veja o estado de todos os pacotes! " +
          "Use dpkg --get-selections para listar todos os pacotes e seus estados (install/deinstall).",
        hint: "dpkg --get-selections",
        reward: 15,
        commands: ["dpkg"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("dpkg") && c.includes("selections")),
      },
      {
        id: "debian-5",
        title: "Desafio V — A Fonte do Sources.list",
        description:
          "O sources.list é a fonte de água do deserto! " +
          "Crie 'sources.list' com o conteúdo 'deb http://deb.debian.org/debian stable main' " +
          "e exiba com cat.",
        hint: "echo 'deb http://deb.debian.org/debian stable main' > sources.list  \u2192  cat sources.list",
        reward: 15,
        commands: ["echo", "cat"],
        validate: (vfs) => {
          const allPaths = Object.keys(vfs.filesystem);
          const p = allPaths.find((x) => x.endsWith("/sources.list"));
          return !!(p && (vfs.filesystem[p]?.content || "").includes("debian"));
        },
      },
      {
        id: "debian-6",
        title: "Desafio VI — A Busca no Cache",
        description:
          "Procure pacotes no cache local! " +
          "Use apt-cache search vim para encontrar pacotes relacionados ao Vim " +
          "e apt-cache show vim para ver detalhes.",
        hint: "apt-cache search vim  \u2192  apt-cache show vim",
        reward: 18,
        commands: ["apt-cache"],
        validate: (_vfs, history) => {
          const searched = history.some((c) => c.includes("apt-cache") && c.includes("search"));
          const showed = history.some((c) => c.includes("apt-cache") && c.includes("show"));
          return searched && showed;
        },
      },
      {
        id: "debian-7",
        title: "Desafio VII — As Dependências do Deserto",
        description:
          "Todo pacote tem dependências, como oásis no deserto! " +
          "Use apt-cache depends curl para ver as dependências do pacote curl.",
        hint: "apt-cache depends curl",
        reward: 20,
        commands: ["apt-cache"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("apt-cache") && c.includes("depends")),
      },
      {
        id: "debian-8",
        title: "Desafio VIII — O Marcador apt-mark",
        description:
          "O apt-mark controla o status dos pacotes! " +
          "Use apt-mark showmanual para ver pacotes instalados manualmente " +
          "e apt-mark showauto para ver os instalados automaticamente.",
        hint: "apt-mark showmanual  \u2192  apt-mark showauto",
        reward: 22,
        commands: ["apt-mark"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("apt-mark")),
      },
      {
        id: "debian-9",
        title: "Desafio IX — O Apt-Get Clássico",
        description:
          "O apt-get é o clássico do deserto! " +
          "Use apt-get --simulate install vim para simular a instalação do Vim sem instalar de verdade.",
        hint: "apt-get --simulate install vim",
        reward: 25,
        commands: ["apt-get"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("apt-get")),
      },
      {
        id: "debian-10",
        title: "Desafio X — O Grande Ritual Debian",
        description:
          "O ritual supremo do deserto! " +
          "Use apt-get clean para limpar o cache de pacotes baixados " +
          "e apt-get autoremove para remover dependências desnecessárias.",
        hint: "apt-get clean  \u2192  apt-get autoremove",
        reward: 30,
        commands: ["apt-get"],
        validate: (_vfs, history) => {
          const cleaned = history.some((c) => c.includes("apt-get") && c.includes("clean"));
          const removed = history.some((c) => c.includes("apt-get") && c.includes("autoremove"));
          return cleaned && removed;
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  //  ILHAS DE CANONICAL — Snap, Cloud & Segurança
  //  Cobrindo: snap, ufw, ssh-keygen, scp, rsync,
  //            lsb_release, cloud-init, netplan, uname
  // ═══════════════════════════════════════════════════════════
  {
    levelId: "ilhas-canonical",
    challenges: [
      {
        id: "canonical-1",
        title: "Desafio I — O Farol do Snap",
        description:
          "O snap é o farol das ilhas! " +
          "Use snap --version para ver a versão e snap list para ver os snaps instalados.",
        hint: "snap --version  \u2192  snap list",
        reward: 10,
        commands: ["snap"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("snap")),
      },
      {
        id: "canonical-2",
        title: "Desafio II — A Busca nas Ilhas",
        description:
          "Explore a loja de snaps! " +
          "Use snap find vlc para procurar o player VLC na loja de snaps.",
        hint: "snap find vlc",
        reward: 12,
        commands: ["snap"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("snap") && c.includes("find")),
      },
      {
        id: "canonical-3",
        title: "Desafio III — A Identidade da Ilha",
        description:
          "Descubra a identidade do sistema! " +
          "Use lsb_release -a para ver todas as informações da distribuição Ubuntu.",
        hint: "lsb_release -a",
        reward: 12,
        commands: ["lsb_release"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("lsb_release")),
      },
      {
        id: "canonical-4",
        title: "Desafio IV — O Muro do Firewall",
        description:
          "Proteja as ilhas com o firewall! " +
          "Use ufw status para ver o estado do firewall e ufw --help para explorar as opções.",
        hint: "ufw status  \u2192  ufw --help",
        reward: 15,
        commands: ["ufw"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("ufw")),
      },
      {
        id: "canonical-5",
        title: "Desafio V — A Chave do Arquipélago",
        description:
          "Gere uma chave SSH para navegar entre as ilhas! " +
          "Use ssh-keygen --help para explorar as opções de geração de chaves.",
        hint: "ssh-keygen --help",
        reward: 18,
        commands: ["ssh-keygen"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("ssh-keygen")),
      },
      {
        id: "canonical-6",
        title: "Desafio VI — O Mensageiro SCP",
        description:
          "O SCP transporta arquivos entre ilhas! " +
          "Crie 'mensagem.txt' com o conteúdo 'Mensagem das Ilhas' e use scp --help para explorar.",
        hint: "echo 'Mensagem das Ilhas' > mensagem.txt  \u2192  scp --help",
        reward: 18,
        commands: ["echo", "scp"],
        validate: (vfs, history) => {
          const allPaths = Object.keys(vfs.filesystem);
          const hasMsg = allPaths.some((x) => x.endsWith("/mensagem.txt"));
          const usedScp = history.some((c) => c.trim().startsWith("scp"));
          return hasMsg && usedScp;
        },
      },
      {
        id: "canonical-7",
        title: "Desafio VII — O Sincronizador Rsync",
        description:
          "O rsync sincroniza arquivos entre ilhas! " +
          "Use rsync --version para ver a versão e rsync --help para explorar as opções.",
        hint: "rsync --version  \u2192  rsync --help",
        reward: 20,
        commands: ["rsync"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("rsync")),
      },
      {
        id: "canonical-8",
        title: "Desafio VIII — O Mapa da Rede",
        description:
          "Mapeie a rede das ilhas! " +
          "Use ip route para ver as rotas de rede e ip link para ver as interfaces.",
        hint: "ip route  \u2192  ip link",
        reward: 22,
        commands: ["ip"],
        validate: (_vfs, history) => {
          const usedRoute = history.some((c) => c.includes("ip") && c.includes("route"));
          const usedLink = history.some((c) => c.includes("ip") && c.includes("link"));
          return usedRoute && usedLink;
        },
      },
      {
        id: "canonical-9",
        title: "Desafio IX — O Arquivo do Snap",
        description:
          "Instale um snap clássico! " +
          "Use snap info hello-world para ver informações sobre o snap hello-world.",
        hint: "snap info hello-world",
        reward: 22,
        commands: ["snap"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("snap") && c.includes("info")),
      },
      {
        id: "canonical-10",
        title: "Desafio X — O Grande Ritual Ubuntu",
        description:
          "O ritual supremo das ilhas! Crie um arquivo 'ubuntu-manifesto.txt' com o conteúdo " +
          "'Ubuntu: Linux para Humanos' e use uname -a para confirmar o kernel do sistema.",
        hint: "echo 'Ubuntu: Linux para Humanos' > ubuntu-manifesto.txt  \u2192  uname -a",
        reward: 30,
        commands: ["echo", "uname"],
        validate: (vfs, history) => {
          const allPaths = Object.keys(vfs.filesystem);
          const hasManifesto = allPaths.some((x) => x.endsWith("/ubuntu-manifesto.txt"));
          const usedUname = history.some((c) => c.trim().startsWith("uname"));
          return hasManifesto && usedUname;
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  //  VALE DO ARCH LINUX — Pacman, AUR & Filosofia KISS
  //  Cobrindo: pacman, makepkg, yay, paru, reflector,
  //            mkinitcpio, systemd-boot, PKGBUILD
  // ═══════════════════════════════════════════════════════════
  {
    levelId: "vale-arch",
    challenges: [
      {
        id: "arch-1",
        title: "Desafio I — A Filosofia KISS",
        description:
          "No Vale do Arch, tudo é simples e direto! " +
          "Use pacman --version para ver a versão e pacman --help para explorar as opções.",
        hint: "pacman --version  \u2192  pacman --help",
        reward: 10,
        commands: ["pacman"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("pacman")),
      },
      {
        id: "arch-2",
        title: "Desafio II — O Inventário do Vale",
        description:
          "Liste todos os pacotes instalados no Arch! " +
          "Use pacman -Q para listar todos os pacotes e pacman -Q | wc -l para contar.",
        hint: "pacman -Q  \u2192  pacman -Q | wc -l",
        reward: 12,
        commands: ["pacman"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("pacman") && c.includes("-Q")),
      },
      {
        id: "arch-3",
        title: "Desafio III — A Busca no Vale",
        description:
          "Procure pacotes no repositório Arch! " +
          "Use pacman -Ss vim para buscar o editor Vim nos repositórios.",
        hint: "pacman -Ss vim",
        reward: 12,
        commands: ["pacman"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("pacman") && c.includes("-Ss")),
      },
      {
        id: "arch-4",
        title: "Desafio IV — O Pergaminho do Pacote",
        description:
          "Inspecione um pacote! " +
          "Use pacman -Qi bash para ver informações detalhadas do pacote bash instalado.",
        hint: "pacman -Qi bash",
        reward: 15,
        commands: ["pacman"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("pacman") && c.includes("-Qi")),
      },
      {
        id: "arch-5",
        title: "Desafio V — Os Arquivos do Pacote",
        description:
          "Descubra quais arquivos um pacote instalou! " +
          "Use pacman -Ql bash para listar todos os arquivos do pacote bash.",
        hint: "pacman -Ql bash",
        reward: 15,
        commands: ["pacman"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("pacman") && c.includes("-Ql")),
      },
      {
        id: "arch-6",
        title: "Desafio VI — O Orfanato do Vale",
        description:
          "Encontre pacotes órfãos (sem dependências)! " +
          "Use pacman -Qdt para listar pacotes instalados como dependência que já não são necessários.",
        hint: "pacman -Qdt",
        reward: 18,
        commands: ["pacman"],
        validate: (_vfs, history) =>
          history.some((c) => c.includes("pacman") && c.includes("-Qdt")),
      },
      {
        id: "arch-7",
        title: "Desafio VII — O PKGBUILD Sagrado",
        description:
          "O PKGBUILD é o texto sagrado do Arch! " +
          "Crie um arquivo 'PKGBUILD' com o conteúdo 'pkgname=meu-pacote\npkgver=1.0' " +
          "e exiba com cat.",
        hint: "printf 'pkgname=meu-pacote\npkgver=1.0' > PKGBUILD  \u2192  cat PKGBUILD",
        reward: 20,
        commands: ["echo", "cat"],
        validate: (vfs) => {
          const allPaths = Object.keys(vfs.filesystem);
          return allPaths.some((x) => x.endsWith("/PKGBUILD"));
        },
      },
      {
        id: "arch-8",
        title: "Desafio VIII — O Espelho do Reflector",
        description:
          "O reflector encontra os espelhos mais rápidos! " +
          "Use reflector --help para explorar as opções de otimização de mirrors.",
        hint: "reflector --help",
        reward: 22,
        commands: ["reflector"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("reflector")),
      },
      {
        id: "arch-9",
        title: "Desafio IX — O AUR Lendário",
        description:
          "O AUR é o repositório lendário da comunidade Arch! " +
          "Use yay --version para ver a versão do helper AUR e yay --help para explorar.",
        hint: "yay --version  \u2192  yay --help",
        reward: 25,
        commands: ["yay"],
        validate: (_vfs, history) =>
          history.some((c) => c.trim().startsWith("yay")),
      },
      {
        id: "arch-10",
        title: "Desafio X — O Grande Ritual Arch",
        description:
          "O ritual supremo do Vale! Remova qualquer arquivo 'ubuntu-manifesto.txt' se existir, " +
          "crie o diretório 'arch-configs' com o arquivo 'pacman.conf' contendo " +
          "'[options]\nHoldPkg = pacman glibc' e exiba com cat.",
        hint: "mkdir arch-configs && echo '[options]' > arch-configs/pacman.conf  \u2192  cat arch-configs/pacman.conf",
        reward: 30,
        commands: ["mkdir", "echo", "cat"],
        validate: (vfs) => {
          const allPaths = Object.keys(vfs.filesystem);
          return allPaths.some((x) => x.endsWith("/arch-configs/pacman.conf"));
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
