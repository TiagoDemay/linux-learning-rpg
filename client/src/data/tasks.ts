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
          "Nas montanhas de Kernighan, toda jornada começa com uma mensagem gravada em pedra. " +
          "Existe um comando que imprime texto na tela e também pode redirecionar essa saída para " +
          "um arquivo. Crie o arquivo 'hello.txt' contendo exatamente o texto 'Hello, World!' " +
          "usando esse redirecionamento.",
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
          "Todo ferreiro das montanhas forja suas próprias ferramentas. Um script shell é um arquivo " +
          "de texto com uma sequência de comandos. A primeira linha deve ser o shebang (#!/bin/bash) " +
          "para indicar o interpretador. Crie um arquivo chamado 'saudar.sh' com esse cabeçalho " +
          "e um comando que exiba uma saudação. Depois, torne-o executável alterando suas permissões.",
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
          "Nas montanhas, saber onde estão suas ferramentas é tão importante quanto saber usá-las. " +
          "Quando você digita um comando no terminal, o shell o procura em diretórios listados no PATH. " +
          "Existe uma ferramenta que revela o caminho absoluto de qualquer executável instalado. " +
          "Use-a para descobrir onde estão o interpretador bash e o Python3 no sistema.",
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
          "O ambiente de execução de cada processo é definido por um conjunto de variáveis: " +
          "o diretório home, o usuário atual, o PATH, o editor padrão e dezenas de outras. " +
          "Existe um comando que imprime todas essas variáveis de ambiente na tela. " +
          "Use-o para explorar o mapa completo do seu ambiente de execução.",
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
          "Variáveis de ambiente podem ser criadas e exportadas para que processos filhos as " +
          "herdem. Existe um comando que cria uma variável e a torna disponível para o ambiente. " +
          "Crie uma variável chamada AVENTUREIRO com qualquer valor que represente seu nome, " +
          "depois confirme que ela foi criada exibindo seu conteúdo no terminal.",
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
          "Mestres do terminal criam atalhos para comandos longos ou frequentes. Um alias é um " +
          "apelido que substitui um comando mais complexo. Existe um comando para criar esses " +
          "atalhos na sessão atual do shell. Crie um alias de nome 'll' que execute a listagem " +
          "detalhada de arquivos com todos os arquivos visíveis, incluindo os ocultos.",
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
          "Logs de sistema podem ter milhares de linhas — encontrar o que importa exige filtros. " +
          "Crie um arquivo chamado 'registros.txt' contendo três linhas: uma com 'erro: disco cheio', " +
          "outra com 'info: sistema ok' e uma terceira com 'erro: memória baixa'. " +
          "Em seguida, use a ferramenta de busca por padrões em texto para exibir apenas as linhas " +
          "que contêm a palavra 'erro'.",
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
          "O editor de fluxo é uma das ferramentas mais poderosas para transformação de texto no " +
          "Linux. Ele pode substituir padrões em arquivos sem abrir um editor interativo. " +
          "Sua sintaxe de substituição segue o formato s/padrão/substituto/flags. " +
          "Use-o para substituir todas as ocorrências de 'erro' por 'ERRO' no arquivo registros.txt.",
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
          "O awk é uma linguagem de processamento de texto orientada a registros e campos. " +
          "Por padrão, ele divide cada linha em campos separados por espaço, acessíveis como " +
          "$1, $2, $3 e assim por diante. Escreva um programa awk de uma linha que imprima " +
          "apenas o segundo campo de cada linha do arquivo registros.txt.",
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
          "O ritual supremo das montanhas: transformar código-fonte em um executável. " +
          "Crie um arquivo chamado 'programa.c' contendo uma função main mínima em C " +
          "(int main(){return 0;}). Em seguida, use o compilador GNU C para compilar esse arquivo " +
          "e gerar um executável chamado 'programa'. O compilador aceita o arquivo fonte como " +
          "argumento e uma flag -o para definir o nome do binário de saída.",
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
          "No pântano, os daemons sussurram entre a névoa. Cada processo em execução é um espírito " +
          "que consome recursos do sistema. Existe uma ferramenta clássica que lista todos os processos " +
          "ativos com detalhes como PID, usuário, uso de CPU e memória. " +
          "Descubra quais espíritos habitam este lugar e quantos são eles.",
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
          "Todo exorcista precisa conhecer seus instrumentos antes de agir. No Linux, processos são " +
          "encerrados por meio de sinais — cada sinal tem um número e um nome específico. " +
          "Existe uma opção que faz a ferramenta de encerramento de processos listar todos os sinais " +
          "disponíveis no sistema. Estude o arsenal antes de usá-lo.",
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
          "O systemd é o gerenciador de serviços do Linux moderno — ele controla tudo, desde o boot " +
          "até os daemons em execução. Existe uma ferramenta de linha de comando que é a interface " +
          "principal do systemd. Use-a para consultar o estado geral do sistema e obter um panorama " +
          "de quantos serviços estão ativos, falhando ou inativos.",
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
          "O daemon do SSH está adormecido nas profundezas do pântano. Serviços no Linux podem ser " +
          "iniciados, parados, reiniciados e consultados individualmente. Sua missão é acordar o " +
          "serviço SSH e depois verificar se ele realmente está em execução. " +
          "Dois subcomandos distintos serão necessários: um para iniciar e outro para consultar o estado.",
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
          "Acordar um daemon é fácil — o verdadeiro desafio é garantir que ele durma quando não é " +
          "necessário e não acorde sozinho na próxima vez que o sistema iniciar. " +
          "Existem dois subcomandos distintos para isso: um que para o serviço imediatamente " +
          "e outro que o impede de ser iniciado automaticamente no boot. " +
          "Aplique ambos ao serviço SSH.",
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
          "O systemd mantém um diário centralizado de tudo que acontece no sistema — cada " +
          "serviço, cada erro, cada evento registrado. Existe uma ferramenta específica para " +
          "consultar esse diário. Ela aceita uma opção numérica que limita a saída às últimas " +
          "N entradas. Leia as últimas 20 entradas do diário do sistema.",
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
          "No pântano existe um relógio mágico que executa tarefas automaticamente em horários " +
          "predefinidos — sem que ninguém precise estar presente. Cada usuário do sistema pode ter " +
          "sua própria lista de tarefas agendadas. Existe uma ferramenta para gerenciar essas " +
          "agendas. Use-a com a opção que lista as tarefas cadastradas para o usuário atual.",
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
          "As sombras do pântano têm peso — e esse peso se chama uso de disco. " +
          "Existem duas ferramentas distintas para medir isso: uma que mostra o uso de cada " +
          "sistema de arquivos montado (partições e discos) em formato legível para humanos, " +
          "e outra que calcula o tamanho total de um diretório específico. " +
          "Use ambas: a primeira para ver os discos e a segunda para medir o diretório /home.",
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
          "Os espíritos do pântano consomem memória para existir. O sistema Linux gerencia dois " +
          "tipos de memória: a RAM física e o swap (área de troca em disco usada quando a RAM " +
          "esgota). Existe uma ferramenta que exibe o uso atual de ambas em uma tabela clara. " +
          "Use-a com a opção que formata os valores em unidades legíveis (KB, MB, GB).",
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
          "O ritual supremo do pântano exige que você deixe sua marca no sistema. Administradores " +
          "sérios mantêm registros organizados. Sua missão é criar uma estrutura de diretório " +
          "chamada 'logs' e dentro dela um arquivo 'daemon.log' contendo a mensagem " +
          "'[INFO] Daemon iniciado com sucesso'. Em seguida, consulte o diário do systemd " +
          "sem paginação para confirmar que o sistema está operacional.",
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
          "O Git é o sistema de controle de versão criado por Linus Torvalds. " +
          "Todo projeto Git começa com a inicialização de um repositório local. " +
          "Crie um diretório chamado 'meu-reino', navegue para dentro dele e use o " +
          "subcomando do Git que transforma um diretório comum em um repositório versionado.",
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
          "O Git rastreia arquivos dentro do repositório. Quando um arquivo é criado, " +
          "ele aparece como 'untracked' (não rastreado). Existe um subcomando do Git que " +
          "exibe o estado atual do repositório: quais arquivos foram modificados, quais " +
          "estão na área de staging e quais ainda não são rastreados. " +
          "Crie o arquivo 'README.md' com o conteúdo '# Meu Reino Linux' e consulte o estado.",
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
          "O fluxo de trabalho do Git tem três áreas: o diretório de trabalho, a área de " +
          "staging (index) e o histórico de commits. Antes de registrar uma mudança, " +
          "ela precisa ser adicionada à área de staging. Existe um subcomando do Git " +
          "que realiza essa operação. Use-o para preparar o arquivo 'README.md' para o próximo commit.",
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
          "Um commit é um snapshot permanente do estado do repositório no tempo. " +
          "Cada commit deve ter uma mensagem descritiva que explique o que foi alterado. " +
          "O subcomando de commit possui uma flag que permite passar a mensagem diretamente " +
          "na linha de comando. Use-o para registrar as mudanças com a mensagem " +
          "'Primeiro commit do reino'.",
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
          "O histórico de commits é a memória do projeto — cada decisão, cada mudança " +
          "registrada ao longo do tempo. O Git possui um subcomando que exibe esse histórico " +
          "com autor, data e mensagem. Ele também aceita uma opção que comprime cada commit " +
          "em uma única linha para facilitar a leitura. Consulte o histórico completo e depois " +
          "o resumido.",
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
          "Branches permitem desenvolver funcionalidades isoladas sem afetar o código principal. " +
          "O Git possui um subcomando para criar branches e outro para navegar entre elas. " +
          "Crie uma nova branch chamada 'desenvolvimento' e depois mude para ela. " +
          "Dois subcomandos distintos serão necessários: um para criar e outro para trocar.",
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
          "Antes de fazer um commit, é boa prática revisar exatamente o que foi alterado. " +
          "O Git possui um subcomando que exibe as diferenças linha a linha entre o " +
          "diretório de trabalho e o último commit (ou a área de staging). " +
          "Adicione uma nova linha ao README.md e depois use esse subcomando para " +
          "visualizar as alterações pendentes.",
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
          "O merge é a operação que integra o trabalho de uma branch em outra. " +
          "O fluxo padrão é: navegar para a branch de destino (geralmente main) e " +
          "executar o subcomando que incorpora os commits da branch de origem. " +
          "Volte para a branch principal e integre o trabalho da branch 'desenvolvimento'.",
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
          "O Git permite trabalhar com repositórios remotos hospedados em servidores como " +
          "GitHub, GitLab ou Bitbucket. Existe um subcomando que cria uma cópia local " +
          "completa de um repositório remoto, incluindo todo o histórico de commits. " +
          "Explore as opções desse subcomando para entender os parâmetros disponíveis.",
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
          "O ritual supremo do reino exige que você estabeleça sua identidade como " +
          "desenvolvedor. O Git usa o nome e o e-mail do autor para assinar cada commit. " +
          "Essas informações são configuradas através do subcomando de configuração do Git, " +
          "usando chaves específicas para nome e e-mail do usuário. Configure ambas.",
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
          "Na Cidade Livre, cada cidadão tem direito à informação. O ambiente do shell é " +
          "composto por dezenas de variáveis que definem o comportamento do sistema. " +
          "Existe uma ferramenta que imprime essas variáveis — tanto todas de uma vez quanto " +
          "uma variável específica pelo nome. Use-a para listar tudo e depois consultar " +
          "especificamente a variável que guarda o caminho do seu diretório pessoal.",
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
          "Todo movimento precisa de um manifesto. Crie um arquivo chamado 'manifesto.txt' " +
          "contendo o texto 'Software Livre para Todos'. Use o redirecionamento de saída para " +
          "gravar o texto no arquivo e depois exiba o conteúdo do arquivo no terminal para " +
          "confirmar que foi gravado corretamente.",
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
          "Variáveis locais do shell não são visíveis para processos filhos. Para que uma " +
          "variável seja herdada por subprocessos, ela precisa ser exportada para o ambiente. " +
          "Exporte uma variável chamada GNU_FREEDOM com o valor 'true' e depois confirme " +
          "sua existência exibindo seu valor no terminal.",
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
          "Quando você digita um comando, o shell não sabe magicamente onde ele está — ele " +
          "percorre uma lista de diretórios em busca do executável. Essa lista é armazenada em " +
          "uma variável de ambiente especial. Exiba o valor dessa variável para ver todos os " +
          "diretórios que o shell consulta ao executar um comando.",
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
          "O bash possui um arquivo de configuração que é executado automaticamente toda vez " +
          "que uma nova sessão interativa é iniciada. Nele ficam aliases, variáveis e funções " +
          "personalizadas. Esse arquivo fica oculto no diretório home do usuário (começa com ponto). " +
          "Leia seu conteúdo para entender como seu ambiente está configurado.",
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
          "Aliases criados diretamente no terminal são perdidos quando a sessão termina. " +
          "Para torná-los permanentes, eles devem ser adicionados ao arquivo de configuração do bash. " +
          "Use o operador de redirecionamento que acrescenta conteúdo ao final de um arquivo " +
          "(sem sobrescrever) para adicionar a definição do alias ll='ls -la' ao .bashrc.",
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
          "Modificar o .bashrc não tem efeito imediato — as mudanças só são aplicadas em uma " +
          "nova sessão. Porém, existe um comando que força o shell atual a executar um arquivo " +
          "de configuração imediatamente, sem precisar fechar e reabrir o terminal. " +
          "Use-o para aplicar as alterações feitas no .bashrc agora mesmo.",
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
          "Assim como variáveis podem ser criadas e exportadas, elas também podem ser removidas " +
          "do ambiente. Existe um comando que apaga completamente uma variável da memória da " +
          "sessão atual. Use-o para remover a variável GNU_FREEDOM que foi criada anteriormente.",
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
          "Criar arquivos com múltiplas linhas diretamente no terminal exige técnicas especiais. " +
          "Uma delas é o here-doc, que permite inserir um bloco de texto até encontrar um " +
          "delimitador. Outra é usar printf com \\n para quebras de linha. " +
          "Crie um arquivo chamado 'licenca.txt' contendo ao menos duas linhas: " +
          "'GNU GPL v3' e 'Software Livre', usando qualquer uma dessas técnicas.",
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
          "O ritual supremo da Cidade Livre requer que você crie um script de configuração " +
          "completo. Crie um arquivo chamado 'gnu-setup.sh' que contenha a exportação da " +
          "variável DISTRO com o valor 'GNU/Linux'. Depois, torne esse script executável " +
          "alterando suas permissões. Um script de setup é uma prática comum de administradores " +
          "para automatizar a configuração de novos ambientes.",
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
          "Nas planícies de RedHat, o RPM (Red Hat Package Manager) é a ferramenta fundamental " +
          "de gerenciamento de pacotes. Antes de usar qualquer ferramenta, um bom administrador " +
          "verifica sua versão e explora suas capacidades. Descubra qual versão do RPM está " +
          "instalada e explore as opções disponíveis através do sistema de ajuda integrado.",
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
          "Um administrador de sistemas precisa saber exatamente quais pacotes estão instalados. " +
          "O RPM possui uma opção que lista todos os pacotes instalados no sistema. " +
          "Use essa opção para obter o inventário completo e depois combine com uma ferramenta " +
          "de filtragem para encontrar especificamente o pacote 'bash' nessa lista.",
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
          "Cada pacote instalado carrega um pergaminho com informações detalhadas: versão, " +
          "descrição, data de instalação, mantenedor e muito mais. O RPM possui uma combinação " +
          "de flags que exibe essas informações completas sobre um pacote instalado. " +
          "Use-a para inspecionar o pacote 'bash'.",
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
          "O YUM (Yellowdog Updater Modified) é o gerenciador de pacotes de alto nível do " +
          "ecossistema Red Hat, capaz de resolver dependências automaticamente. " +
          "Verifique qual versão do YUM está disponível no sistema e depois use-o para " +
          "listar todos os pacotes atualmente instalados.",
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
          "Antes de instalar um pacote, é boa prática verificar se ele existe nos repositórios " +
          "e quais versões estão disponíveis. O YUM possui um subcomando de busca que pesquisa " +
          "por nome e descrição nos repositórios configurados. " +
          "Use-o para encontrar o servidor web Apache (httpd).",
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
          "O DNF (Dandified YUM) é o sucessor moderno do YUM, com melhor resolução de " +
          "dependências e desempenho superior. Verifique qual versão do DNF está instalada " +
          "e depois liste todos os repositórios de pacotes atualmente configurados e ativos " +
          "no sistema.",
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
          "O DNF oferece dois níveis de consulta sobre pacotes: um que faz uma busca ampla por " +
          "nome e descrição nos repositórios, e outro que exibe informações detalhadas de um " +
          "pacote específico (versão, tamanho, dependências, descrição completa). " +
          "Use ambos para investigar o editor Vim.",
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
          "Além de pacotes individuais, o DNF gerencia grupos temáticos que instalam conjuntos " +
          "completos de ferramentas de uma vez. Existe um subcomando que lista todos os grupos " +
          "disponíveis e outro que exibe os detalhes de um grupo específico. " +
          "Liste os grupos e depois investigue o grupo 'Development Tools' para ver quais " +
          "ferramentas de desenvolvimento ele inclui.",
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
          "Um bom administrador documenta o que tem instalado. Crie uma estrutura de diretório " +
          "chamada 'pacotes' e dentro dela um arquivo 'rpm-list.txt' contendo uma lista de " +
          "pacotes essenciais: 'bash vim curl wget'. Essa é uma prática comum para registrar " +
          "dependências de projetos ou ambientes de produção.",
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
          "O ritual supremo das planícies envolve duas operações essenciais de manutenção. " +
          "A primeira verifica se há pacotes instalados com atualizações disponíveis nos " +
          "repositórios. A segunda exibe o histórico completo de operações realizadas pelo " +
          "gerenciador de pacotes (instalações, remoções, atualizações). " +
          "Execute ambas as consultas usando o DNF.",
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
          "No Deserto de Debian, o cache local de pacotes é o oásis do conhecimento. " +
          "O APT mantém um cache com metadados de todos os pacotes disponíveis nos repositórios. " +
          "Existe uma ferramenta de consulta a esse cache que possui um subcomando capaz de " +
          "exibir estatísticas gerais: total de pacotes, tamanho do cache e outras métricas. " +
          "Use-a para obter uma visão geral do estado do cache.",
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
          "O dpkg-query é uma ferramenta avançada para consultar o banco de dados de pacotes " +
          "instalados pelo dpkg. Ela possui uma opção que lista todos os pacotes com seu status " +
          "de instalação. Use essa opção para listar todos os pacotes e depois combine com " +
          "uma ferramenta de filtragem para isolar apenas o pacote 'bash'.",
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
          "Quando um pacote é instalado, ele espalha arquivos por vários diretórios do sistema. " +
          "O dpkg mantém um registro preciso de cada arquivo pertencente a cada pacote. " +
          "Existe uma opção do dpkg que lista todos os arquivos instalados por um pacote específico. " +
          "Use-a para mapear todos os arquivos que pertencem ao pacote 'bash'.",
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
          "O dpkg mantém um registro do estado de seleção de cada pacote: se está instalado, " +
          "marcado para remoção ou em outro estado. Existe uma opção do dpkg que exporta esse " +
          "registro completo, mostrando todos os pacotes e seus estados atuais. " +
          "Esse recurso é muito útil para replicar uma instalação em outra máquina.",
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
          "O APT sabe onde buscar pacotes por meio de um arquivo de configuração que lista os " +
          "repositórios oficiais. Cada linha nesse arquivo segue o formato: tipo, URL, distribuição " +
          "e componente. Crie um arquivo chamado 'sources.list' contendo uma entrada para o " +
          "repositório oficial Debian stable: 'deb http://deb.debian.org/debian stable main'. " +
          "Depois exiba seu conteúdo para confirmar.",
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
          "O apt-cache permite consultar o banco de dados local de pacotes sem precisar " +
          "acessar a internet. Ele tem dois subcomandos complementares: um que faz busca por " +
          "texto no nome e descrição dos pacotes, e outro que exibe informações detalhadas " +
          "de um pacote específico. Use ambos para investigar o editor Vim.",
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
          "Pacotes raramente existem sozinhos — eles dependem de outros para funcionar. " +
          "Entender a árvore de dependências é essencial para diagnosticar problemas de " +
          "instalação. O apt-cache possui um subcomando que exibe todas as dependências " +
          "declaradas por um pacote. Use-o para mapear as dependências do pacote 'curl'.",
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
          "O APT distingue entre pacotes instalados manualmente pelo usuário e pacotes " +
          "instalados automaticamente como dependência de outros. Essa distinção é importante " +
          "para a limpeza automática do sistema. Existe uma ferramenta que gerencia esses " +
          "marcadores e possui subcomandos para listar cada categoria separadamente. " +
          "Liste tanto os pacotes instalados manualmente quanto os automáticos.",
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
          "O apt-get é a ferramenta clássica de instalação de pacotes Debian. Antes de " +
          "instalar algo em produção, é possível simular a operação para ver o que seria " +
          "feito sem realmente modificar o sistema. Existe uma opção do apt-get que ativa " +
          "esse modo de simulação. Use-a para simular a instalação do pacote 'vim'.",
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
          "O ritual supremo do deserto envolve a manutenção preventiva do sistema. " +
          "Com o tempo, o cache de pacotes baixados ocupa espaço desnecessário em disco, " +
          "e dependências órfãs (instaladas automaticamente mas não mais necessárias) " +
          "também se acumulam. Existem dois subcomandos do apt-get para resolver cada um " +
          "desses problemas. Execute ambos para deixar o sistema limpo.",
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
          "O Snap é o sistema de empacotamento moderno da Canonical, projetado para distribuir " +
          "aplicativos de forma isolada e segura em qualquer distribuição Linux. " +
          "Verifique qual versão do Snap está instalada no sistema e depois liste todos os " +
          "pacotes Snap atualmente instalados.",
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
          "O Snap possui uma loja online com milhares de aplicativos prontos para instalar. " +
          "Existe um subcomando que pesquisa pacotes na Snap Store por nome ou descrição. " +
          "Use-o para procurar o player multimídia VLC na loja e ver as opções disponíveis.",
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
          "Cada distribuição Linux tem uma identidade própria: nome, versão, codinome e " +
          "número de release. Existe uma ferramenta específica para exibir essas informações " +
          "sobre a distribuição instalada. Ela aceita uma opção que exibe todos os campos " +
          "disponíveis de uma vez. Use-a para revelar a identidade completa do sistema.",
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
          "O UFW (Uncomplicated Firewall) é a interface simplificada do Ubuntu para gerenciar " +
          "regras de firewall. Antes de configurar regras, é essencial verificar o estado atual " +
          "do firewall (ativo ou inativo) e quais regras já estão em vigor. " +
          "Consulte o estado atual do firewall e explore as opções disponíveis.",
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
          "A autenticação SSH por chave criptográfica é mais segura do que por senha. " +
          "O processo envolve gerar um par de chaves: uma pública (compartilhada com servidores) " +
          "e uma privada (mantida em sigilo). Existe uma ferramenta específica para gerar esses " +
          "pares de chaves. Explore suas opções para entender os algoritmos e parâmetros disponíveis.",
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
          "O SCP (Secure Copy Protocol) permite transferir arquivos entre máquinas de forma " +
          "criptografada, usando o protocolo SSH como base. Crie um arquivo chamado 'mensagem.txt' " +
          "com o conteúdo 'Mensagem das Ilhas' e depois explore as opções do SCP para entender " +
          "como ele seria usado para enviar esse arquivo a um servidor remoto.",
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
          "O rsync é uma ferramenta de sincronização de arquivos que transfere apenas as " +
          "diferenças entre origem e destino, tornando-o muito eficiente para backups e " +
          "replicação de dados. Verifique qual versão está instalada e explore suas opções " +
          "para entender os modos de transferência e as flags de sincronização disponíveis.",
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
          "O comando 'ip' é a ferramenta moderna de diagnóstico e configuração de rede no Linux. " +
          "Ele possui subcomandos para diferentes aspectos da rede. Um deles exibe a tabela de " +
          "roteamento (como os pacotes chegam ao destino). Outro exibe as interfaces de rede " +
          "e seus estados. Use ambos os subcomandos para mapear a configuração de rede do sistema.",
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
          "Antes de instalar um snap, é possível consultar informações detalhadas sobre ele: " +
          "versões disponíveis, canais de atualização (stable, candidate, beta, edge), " +
          "tamanho e descrição. Existe um subcomando do snap que exibe essas informações. " +
          "Use-o para investigar o snap 'hello-world'.",
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
          "O ritual supremo das ilhas combina documentação e diagnóstico. Crie um arquivo " +
          "chamado 'ubuntu-manifesto.txt' com o texto 'Ubuntu: Linux para Humanos'. " +
          "Em seguida, use a ferramenta que exibe informações completas do kernel — nome, " +
          "versão, arquitetura e sistema operacional — com a opção que mostra todos os campos.",
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
          "O Vale do Arch Linux segue a filosofia KISS: Keep It Simple, Stupid. " +
          "O Pacman é o gerenciador de pacotes central, com uma sintaxe de operações " +
          "baseada em letras maiúsculas (-S, -R, -Q). Antes de qualquer coisa, " +
          "verifique qual versão está instalada e explore as operações disponíveis.",
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
          "O Pacman organiza suas operações em grupos: -S para sincronizar (instalar), " +
          "-R para remover e -Q para consultar (query) o banco de dados local. " +
          "Use a operação de consulta para listar todos os pacotes instalados " +
          "e depois combine com uma ferramenta de contagem para saber o total exato.",
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
          "A operação de sincronização do Pacman não serve apenas para instalar — ela " +
          "também possui uma flag de busca que pesquisa por nome e descrição nos " +
          "repositórios sincronizados localmente. Use essa combinação para encontrar " +
          "pacotes relacionados ao editor Vim.",
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
          "A operação de consulta do Pacman pode ser combinada com flags para obter " +
          "diferentes níveis de detalhe sobre pacotes instalados. Uma dessas combinações " +
          "exibe informações completas: versão, descrição, dependências e data de instalação. " +
          "Use-a para inspecionar o pacote 'bash'.",
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
          "O Pacman rastreia com precisão quais arquivos pertencem a cada pacote instalado. " +
          "A operação de consulta possui uma flag que lista todos os arquivos de um pacote " +
          "com seus caminhos absolutos no sistema de arquivos. " +
          "Use essa combinação para mapear os arquivos pertencentes ao pacote 'bash'.",
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
          "Com o tempo, pacotes instalados como dependência de outros ficam órfãos quando " +
          "o pacote que os exigia é removido. Eles ocupam espaço sem servir a nenhum propósito. " +
          "O Pacman possui uma combinação de flags na operação de consulta que lista " +
          "exatamente esses pacotes órfãos. Use-a para identificar dependências não mais necessárias.",
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
          "O PKGBUILD é o arquivo de receita do Arch Linux: um script shell que descreve " +
          "como um pacote deve ser compilado e instalado. Ele contém campos obrigatórios " +
          "como o nome do pacote e a versão. Crie um arquivo chamado 'PKGBUILD' contendo " +
          "ao menos esses dois campos e exiba seu conteúdo para confirmar.",
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
          "A velocidade de download de pacotes depende de qual servidor espelho (mirror) " +
          "está sendo usado. O Arch Linux possui uma ferramenta que avalia e ordena os " +
          "espelhos disponíveis por velocidade e atualidade, gerando uma lista otimizada. " +
          "Explore as opções dessa ferramenta para entender como ela classifica os mirrors.",
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
          "O AUR (Arch User Repository) é um repositório mantido pela comunidade com " +
          "milhares de pacotes não oficiais. Para acessá-lo, são usados helpers que " +
          "automatizam o processo de baixar, compilar e instalar PKGBUILDs. " +
          "Um dos helpers mais populares é o yay. Verifique sua versão e explore suas opções.",
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
          "O ritual supremo do Vale exige que você crie uma estrutura de configuração " +
          "do Pacman. Crie um diretório chamado 'arch-configs' e dentro dele um arquivo " +
          "'pacman.conf' contendo a seção '[options]' com a diretiva HoldPkg listando " +
          "os pacotes protegidos. Depois exiba o conteúdo para confirmar a estrutura.",
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
