/**
 * challenge-answers.ts
 *
 * Mapa server-side das respostas esperadas para cada desafio.
 * Cada entrada define os comandos obrigatórios que o aluno deve ter digitado.
 * A validação é feita por regex sobre o histórico de comandos — sem expor
 * a lógica no bundle JavaScript do cliente.
 *
 * NUNCA expor este arquivo ao cliente.
 *
 * Alinhado com client/src/data/tasks.ts — cada challengeIndex corresponde
 * exatamente ao índice do desafio no array challenges[] do levelId.
 */
export interface ChallengeAnswer {
  levelId: string;
  challengeIndex: number; // 0-based
  reward: number;
  /** Cada item é um regex que deve ter pelo menos um match no histórico */
  requiredPatterns: RegExp[];
}

export const CHALLENGE_ANSWERS: ChallengeAnswer[] = [
  // ── FLORESTA DE STALLMAN ─────────────────────────────────────────────────
  // Desafio I — pwd + ls
  { levelId: "floresta-stallman", challengeIndex: 0, reward: 5,  requiredPatterns: [/^pwd$/, /^ls/] },
  // Desafio II — mkdir acampamento + cd acampamento
  { levelId: "floresta-stallman", challengeIndex: 1, reward: 8,  requiredPatterns: [/^mkdir\s+acampamento/, /^cd\s+acampamento/] },
  // Desafio III — touch rascunho.txt + mkdir lixo + rmdir lixo
  { levelId: "floresta-stallman", challengeIndex: 2, reward: 10, requiredPatterns: [/^touch\s+rascunho\.txt/, /^mkdir\s+lixo/, /^rmdir\s+lixo/] },
  // Desafio IV — echo ... > mensagem.txt + cat mensagem.txt
  { levelId: "floresta-stallman", challengeIndex: 3, reward: 12, requiredPatterns: [/^echo\s+.+>.*mensagem\.txt/, /^cat\s+mensagem\.txt/] },
  // Desafio V — cp mensagem.txt backup.txt + mv rascunho.txt notas.txt
  // Aceita caminhos relativos (ex: cp ../mensagem.txt backup.txt) e diretos
  { levelId: "floresta-stallman", challengeIndex: 4, reward: 15, requiredPatterns: [/^cp\s+.*mensagem\.txt.*backup\.txt|^cp\s+.*backup\.txt/, /^mv\s+.*rascunho\.txt.*notas\.txt|^mv\s+.*notas\.txt/] },
  // Desafio VI — find + rm backup.txt
  { levelId: "floresta-stallman", challengeIndex: 5, reward: 18, requiredPatterns: [/^find\s+/, /^rm\s+backup\.txt/] },
  // Desafio VII — echo ... > diario.txt + grep
  { levelId: "floresta-stallman", challengeIndex: 6, reward: 20, requiredPatterns: [/^echo\s+.+>.*diario\.txt/, /^grep\s+/] },
  // Desafio VIII — touch feitico.sh + chmod +x feitico.sh
  { levelId: "floresta-stallman", challengeIndex: 7, reward: 22, requiredPatterns: [/^touch\s+feitico\.sh/, /^chmod\s+\+x\s+feitico\.sh/] },
  // Desafio IX — ps + top
  { levelId: "floresta-stallman", challengeIndex: 8, reward: 25, requiredPatterns: [/^ps/, /^top/] },
  // Desafio X — sudo + apt (qualquer combinação: apt list, apt update, sudo apt list, sudo apt update)
  // O client verifica usedSudo && usedApt — servidor aceita qualquer um dos comandos sudo/apt
  { levelId: "floresta-stallman", challengeIndex: 9, reward: 30, requiredPatterns: [/^sudo\s+apt|^apt\s+list|^apt\s+update/] },

  // ── TUNDRA DO SLACKWARE ──────────────────────────────────────────────────
  // Desafio I — hostname + uname -a
  { levelId: "tundra-slackware", challengeIndex: 0, reward: 10, requiredPatterns: [/^hostname/, /^uname\s+-a/] },
  // Desafio II — ping
  { levelId: "tundra-slackware", challengeIndex: 1, reward: 12, requiredPatterns: [/^ping\s+/] },
  // Desafio III — ip addr
  { levelId: "tundra-slackware", challengeIndex: 2, reward: 14, requiredPatterns: [/^ip\s+addr/] },
  // Desafio IV — ss -tuln
  { levelId: "tundra-slackware", challengeIndex: 3, reward: 16, requiredPatterns: [/^ss\s+/] },
  // Desafio V — curl
  { levelId: "tundra-slackware", challengeIndex: 4, reward: 18, requiredPatterns: [/^curl\s+/] },
  // Desafio VI — wget + echo (download.txt)
  { levelId: "tundra-slackware", challengeIndex: 5, reward: 20, requiredPatterns: [/^wget\s+|^echo\s+.*download/, /^wget\s+--help|^echo\s+.+>.*download\.txt/] },
  // Desafio VII — sudo apt update + apt list --installed
  { levelId: "tundra-slackware", challengeIndex: 6, reward: 22, requiredPatterns: [/^sudo\s+apt\s+update|^apt\s+update/, /^apt\s+list/] },
  // Desafio VIII — apt search + apt show
  { levelId: "tundra-slackware", challengeIndex: 7, reward: 24, requiredPatterns: [/^apt\s+search\s+/, /^apt\s+show\s+/] },
  // Desafio IX — dpkg -l + dpkg -s bash
  { levelId: "tundra-slackware", challengeIndex: 8, reward: 26, requiredPatterns: [/^dpkg\s+-l/, /^dpkg\s+-s\s+/] },
  // Desafio X — sudo apt install htop + sudo apt remove htop
  { levelId: "tundra-slackware", challengeIndex: 9, reward: 33, requiredPatterns: [/^sudo\s+apt\s+install\s+|^apt\s+install\s+/, /^sudo\s+apt\s+remove\s+|^apt\s+remove\s+/] },

  // ── MONTANHAS DE KERNIGHAN ───────────────────────────────────────────────
  // Desafio I — echo 'Hello, World!' > hello.txt
  { levelId: "montanhas-kernighan", challengeIndex: 0, reward: 12, requiredPatterns: [/^echo\s+.+>.*hello\.txt/] },
  // Desafio II — echo > saudar.sh + chmod +x saudar.sh
  { levelId: "montanhas-kernighan", challengeIndex: 1, reward: 14, requiredPatterns: [/^echo\s+.+>.*saudar\.sh/, /^chmod\s+\+x\s+saudar\.sh/] },
  // Desafio III — which bash + which python3
  { levelId: "montanhas-kernighan", challengeIndex: 2, reward: 16, requiredPatterns: [/^which\s+bash/, /^which\s+python3/] },
  // Desafio IV — env
  { levelId: "montanhas-kernighan", challengeIndex: 3, reward: 18, requiredPatterns: [/^env$/] },
  // Desafio V — export AVENTUREIRO + echo $AVENTUREIRO
  { levelId: "montanhas-kernighan", challengeIndex: 4, reward: 20, requiredPatterns: [/^export\s+AVENTUREIRO/, /^echo\s+\$AVENTUREIRO/] },
  // Desafio VI — alias ll='ls -la'
  { levelId: "montanhas-kernighan", challengeIndex: 5, reward: 22, requiredPatterns: [/^alias\s+ll=/] },
  // Desafio VII — printf/echo > registros.txt + grep
  { levelId: "montanhas-kernighan", challengeIndex: 6, reward: 24, requiredPatterns: [/^printf\s+.+>.*registros\.txt|^echo\s+.+>.*registros\.txt/, /^grep\s+.+registros\.txt/] },
  // Desafio VIII — sed 's/erro/ERRO/g' registros.txt
  { levelId: "montanhas-kernighan", challengeIndex: 7, reward: 26, requiredPatterns: [/^sed\s+/] },
  // Desafio IX — awk '{print $2}' registros.txt
  { levelId: "montanhas-kernighan", challengeIndex: 8, reward: 28, requiredPatterns: [/^awk\s+/] },
  // Desafio X — echo > programa.c + gcc programa.c -o programa
  { levelId: "montanhas-kernighan", challengeIndex: 9, reward: 39, requiredPatterns: [/^echo\s+.+>.*programa\.c/, /^gcc\s+programa\.c/] },

  // ── PÂNTANO DE SYSTEMD ───────────────────────────────────────────────────
  // Desafio I — ps aux
  { levelId: "pantano-systemd", challengeIndex: 0, reward: 12, requiredPatterns: [/^ps\s+/] },
  // Desafio II — kill -l
  { levelId: "pantano-systemd", challengeIndex: 1, reward: 14, requiredPatterns: [/^kill\s+/] },
  // Desafio III — systemctl status
  { levelId: "pantano-systemd", challengeIndex: 2, reward: 16, requiredPatterns: [/^systemctl\s+status/] },
  // Desafio IV — systemctl start ssh + systemctl status ssh
  { levelId: "pantano-systemd", challengeIndex: 3, reward: 18, requiredPatterns: [/^systemctl\s+start\s+ssh/, /^systemctl\s+status\s+ssh/] },
  // Desafio V — systemctl stop ssh + systemctl disable ssh
  { levelId: "pantano-systemd", challengeIndex: 4, reward: 20, requiredPatterns: [/^systemctl\s+stop\s+ssh/, /^systemctl\s+disable\s+ssh/] },
  // Desafio VI — journalctl -n 20
  { levelId: "pantano-systemd", challengeIndex: 5, reward: 22, requiredPatterns: [/^journalctl\s+/] },
  // Desafio VII — crontab -l
  { levelId: "pantano-systemd", challengeIndex: 6, reward: 24, requiredPatterns: [/^crontab\s+/] },
  // Desafio VIII — df -h + du -sh /home
  { levelId: "pantano-systemd", challengeIndex: 7, reward: 26, requiredPatterns: [/^df\s+/, /^du\s+/] },
  // Desafio IX — free -h
  { levelId: "pantano-systemd", challengeIndex: 8, reward: 28, requiredPatterns: [/^free\s+/] },
  // Desafio X — mkdir logs + echo > logs/daemon.log + journalctl --no-pager
  { levelId: "pantano-systemd", challengeIndex: 9, reward: 37, requiredPatterns: [/^mkdir\s+.*logs|^mkdir\s+-p\s+logs/, /^echo\s+.+>.*daemon\.log/, /^journalctl\s+/] },

  // ── REINO DE TORVALDS ────────────────────────────────────────────────────
  // Desafio I — mkdir meu-reino + cd meu-reino + git init
  { levelId: "reino-torvalds", challengeIndex: 0, reward: 16, requiredPatterns: [/^mkdir\s+meu-reino/, /^cd\s+meu-reino/, /^git\s+init/] },
  // Desafio II — echo > README.md + git status
  { levelId: "reino-torvalds", challengeIndex: 1, reward: 18, requiredPatterns: [/^echo\s+.+>.*README\.md/, /^git\s+status/] },
  // Desafio III — git add README.md
  { levelId: "reino-torvalds", challengeIndex: 2, reward: 20, requiredPatterns: [/^git\s+add\s+README\.md/] },
  // Desafio IV — git commit -m
  { levelId: "reino-torvalds", challengeIndex: 3, reward: 22, requiredPatterns: [/^git\s+commit\s+-m/] },
  // Desafio V — git log (+ git log --oneline)
  { levelId: "reino-torvalds", challengeIndex: 4, reward: 24, requiredPatterns: [/^git\s+log/] },
  // Desafio VI — git branch desenvolvimento + git checkout desenvolvimento
  { levelId: "reino-torvalds", challengeIndex: 5, reward: 26, requiredPatterns: [/^git\s+branch\s+desenvolvimento/, /^git\s+checkout\s+desenvolvimento/] },
  // Desafio VII — echo >> README.md + git diff
  { levelId: "reino-torvalds", challengeIndex: 6, reward: 28, requiredPatterns: [/^echo\s+.+>>.*README\.md/, /^git\s+diff/] },
  // Desafio VIII — git checkout main/master + git merge desenvolvimento
  // Aceita 'main' ou 'master' (branch padrão varia por versão do git)
  { levelId: "reino-torvalds", challengeIndex: 7, reward: 30, requiredPatterns: [/^git\s+checkout\s+(main|master)/, /^git\s+merge\s+desenvolvimento/] },
  // Desafio IX — git clone --help
  { levelId: "reino-torvalds", challengeIndex: 8, reward: 32, requiredPatterns: [/^git\s+clone/] },
  // Desafio X — git config user.name + git config user.email
  { levelId: "reino-torvalds", challengeIndex: 9, reward: 40, requiredPatterns: [/^git\s+config\s+user\.name/, /^git\s+config\s+user\.email/] },

  // ── CIDADE LIVRE DE GNU ──────────────────────────────────────────────────
  // Desafio I — printenv + printenv HOME
  { levelId: "cidade-gnu", challengeIndex: 0, reward: 12, requiredPatterns: [/^printenv/] },
  // Desafio II — echo > manifesto.txt + cat manifesto.txt
  { levelId: "cidade-gnu", challengeIndex: 1, reward: 14, requiredPatterns: [/^echo\s+.+>.*manifesto\.txt/, /^cat\s+manifesto\.txt/] },
  // Desafio III — export GNU_FREEDOM + echo $GNU_FREEDOM
  { levelId: "cidade-gnu", challengeIndex: 2, reward: 16, requiredPatterns: [/^export\s+GNU_FREEDOM/, /^echo\s+\$GNU_FREEDOM/] },
  // Desafio IV — echo $PATH
  { levelId: "cidade-gnu", challengeIndex: 3, reward: 18, requiredPatterns: [/^echo\s+\$PATH/] },
  // Desafio V — cat ~/.bashrc
  { levelId: "cidade-gnu", challengeIndex: 4, reward: 20, requiredPatterns: [/^cat\s+~\/\.bashrc|^cat\s+\.bashrc/] },
  // Desafio VI — echo >> ~/.bashrc
  { levelId: "cidade-gnu", challengeIndex: 5, reward: 22, requiredPatterns: [/^echo\s+.+>>.*\.bashrc/] },
  // Desafio VII — source ~/.bashrc
  { levelId: "cidade-gnu", challengeIndex: 6, reward: 24, requiredPatterns: [/^source\s+~\/\.bashrc|^source\s+\.bashrc|^\.\s+~\/\.bashrc/] },
  // Desafio VIII — unset GNU_FREEDOM
  { levelId: "cidade-gnu", challengeIndex: 7, reward: 26, requiredPatterns: [/^unset\s+GNU_FREEDOM/] },
  // Desafio IX — printf/echo > licenca.txt
  { levelId: "cidade-gnu", challengeIndex: 8, reward: 28, requiredPatterns: [/^printf\s+.+>.*licenca\.txt|^echo\s+.+>.*licenca\.txt/] },
  // Desafio X — echo > gnu-setup.sh + chmod +x gnu-setup.sh
  { levelId: "cidade-gnu", challengeIndex: 9, reward: 37, requiredPatterns: [/^echo\s+.+>.*gnu-setup\.sh/, /^chmod\s+\+x\s+gnu-setup\.sh/] },

  // ── PLANÍCIES DE REDHAT ──────────────────────────────────────────────────
  // Desafio I — rpm --version + rpm --help
  { levelId: "planicies-redhat", challengeIndex: 0, reward: 14, requiredPatterns: [/^rpm\s+/] },
  // Desafio II — rpm -qa + rpm -qa | grep bash
  { levelId: "planicies-redhat", challengeIndex: 1, reward: 16, requiredPatterns: [/^rpm\s+-qa/] },
  // Desafio III — rpm -qi bash
  { levelId: "planicies-redhat", challengeIndex: 2, reward: 18, requiredPatterns: [/^rpm\s+-qi\s+/] },
  // Desafio IV — yum --version + yum list installed
  { levelId: "planicies-redhat", challengeIndex: 3, reward: 20, requiredPatterns: [/^yum\s+/] },
  // Desafio V — yum search httpd
  { levelId: "planicies-redhat", challengeIndex: 4, reward: 22, requiredPatterns: [/^yum\s+search\s+/] },
  // Desafio VI — dnf --version + dnf repolist
  { levelId: "planicies-redhat", challengeIndex: 5, reward: 24, requiredPatterns: [/^dnf\s+/] },
  // Desafio VII — dnf search vim + dnf info vim
  { levelId: "planicies-redhat", challengeIndex: 6, reward: 26, requiredPatterns: [/^dnf\s+search\s+/, /^dnf\s+info\s+/] },
  // Desafio VIII — dnf grouplist + dnf groupinfo
  { levelId: "planicies-redhat", challengeIndex: 7, reward: 28, requiredPatterns: [/^dnf\s+grouplist/, /^dnf\s+groupinfo/] },
  // Desafio IX — mkdir pacotes + echo > pacotes/rpm-list.txt
  { levelId: "planicies-redhat", challengeIndex: 8, reward: 30, requiredPatterns: [/^mkdir\s+pacotes/, /^echo\s+.+>.*pacotes\/rpm-list\.txt/] },
  // Desafio X — dnf check-update + dnf history
  { levelId: "planicies-redhat", challengeIndex: 9, reward: 38, requiredPatterns: [/^dnf\s+check-update/, /^dnf\s+history/] },

  // ── DESERTO DE DEBIAN ────────────────────────────────────────────────────
  // Desafio I — apt-cache stats
  { levelId: "deserto-debian", challengeIndex: 0, reward: 14, requiredPatterns: [/^apt-cache\s+stats/] },
  // Desafio II — dpkg-query -l + dpkg-query -l | grep bash
  { levelId: "deserto-debian", challengeIndex: 1, reward: 16, requiredPatterns: [/^dpkg-query\s+-l|^dpkg-query\s+--list/] },
  // Desafio III — dpkg -L bash
  { levelId: "deserto-debian", challengeIndex: 2, reward: 18, requiredPatterns: [/^dpkg\s+-L\s+/] },
  // Desafio IV — dpkg --get-selections
  { levelId: "deserto-debian", challengeIndex: 3, reward: 20, requiredPatterns: [/^dpkg\s+--get-selections/] },
  // Desafio V — echo > sources.list + cat sources.list
  { levelId: "deserto-debian", challengeIndex: 4, reward: 22, requiredPatterns: [/^echo\s+.+>.*sources\.list/, /^cat\s+sources\.list/] },
  // Desafio VI — apt-cache search vim + apt-cache show vim
  { levelId: "deserto-debian", challengeIndex: 5, reward: 24, requiredPatterns: [/^apt-cache\s+search\s+/, /^apt-cache\s+show\s+/] },
  // Desafio VII — apt-cache depends curl
  { levelId: "deserto-debian", challengeIndex: 6, reward: 26, requiredPatterns: [/^apt-cache\s+depends\s+/] },
  // Desafio VIII — apt-mark showmanual + apt-mark showauto
  { levelId: "deserto-debian", challengeIndex: 7, reward: 28, requiredPatterns: [/^apt-mark\s+showmanual/, /^apt-mark\s+showauto/] },
  // Desafio IX — apt-get --simulate install vim
  { levelId: "deserto-debian", challengeIndex: 8, reward: 30, requiredPatterns: [/^apt-get\s+--simulate\s+install|^apt-get\s+-s\s+install/] },
  // Desafio X — apt-get clean + apt-get autoremove
  { levelId: "deserto-debian", challengeIndex: 9, reward: 41, requiredPatterns: [/^apt-get\s+clean/, /^apt-get\s+autoremove/] },

  // ── ILHAS DE CANONICAL ───────────────────────────────────────────────────
  // Desafio I — snap --version + snap list
  { levelId: "ilhas-canonical", challengeIndex: 0, reward: 14, requiredPatterns: [/^snap\s+--version|^snap\s+list/] },
  // Desafio II — snap find vlc
  { levelId: "ilhas-canonical", challengeIndex: 1, reward: 16, requiredPatterns: [/^snap\s+find\s+/] },
  // Desafio III — lsb_release -a
  { levelId: "ilhas-canonical", challengeIndex: 2, reward: 18, requiredPatterns: [/^lsb_release\s+/] },
  // Desafio IV — ufw status + ufw --help
  { levelId: "ilhas-canonical", challengeIndex: 3, reward: 20, requiredPatterns: [/^ufw\s+/] },
  // Desafio V — ssh-keygen --help
  { levelId: "ilhas-canonical", challengeIndex: 4, reward: 22, requiredPatterns: [/^ssh-keygen\s+/] },
  // Desafio VI — echo > mensagem.txt + scp --help
  { levelId: "ilhas-canonical", challengeIndex: 5, reward: 24, requiredPatterns: [/^echo\s+.+>.*mensagem\.txt/, /^scp\s+/] },
  // Desafio VII — rsync --version + rsync --help
  { levelId: "ilhas-canonical", challengeIndex: 6, reward: 26, requiredPatterns: [/^rsync\s+/] },
  // Desafio VIII — ip route + ip link
  { levelId: "ilhas-canonical", challengeIndex: 7, reward: 28, requiredPatterns: [/^ip\s+route/, /^ip\s+link/] },
  // Desafio IX — snap info hello-world
  { levelId: "ilhas-canonical", challengeIndex: 8, reward: 30, requiredPatterns: [/^snap\s+info\s+/] },
  // Desafio X — echo > ubuntu-manifesto.txt + uname -a
  { levelId: "ilhas-canonical", challengeIndex: 9, reward: 41, requiredPatterns: [/^echo\s+.+>.*ubuntu-manifesto\.txt/, /^uname\s+-a/] },

  // ── VALE DO ARCH LINUX ───────────────────────────────────────────────────
  // Desafio I — pacman --version + pacman --help
  { levelId: "vale-arch", challengeIndex: 0, reward: 16, requiredPatterns: [/^pacman\s+/] },
  // Desafio II — pacman -Q + pacman -Q | wc -l
  { levelId: "vale-arch", challengeIndex: 1, reward: 18, requiredPatterns: [/^pacman\s+-Q/] },
  // Desafio III — pacman -Ss vim
  { levelId: "vale-arch", challengeIndex: 2, reward: 20, requiredPatterns: [/^pacman\s+-Ss\s+/] },
  // Desafio IV — pacman -Qi bash
  { levelId: "vale-arch", challengeIndex: 3, reward: 22, requiredPatterns: [/^pacman\s+-Qi\s+/] },
  // Desafio V — pacman -Ql bash
  { levelId: "vale-arch", challengeIndex: 4, reward: 24, requiredPatterns: [/^pacman\s+-Ql\s+/] },
  // Desafio VI — pacman -Qdt
  { levelId: "vale-arch", challengeIndex: 5, reward: 26, requiredPatterns: [/^pacman\s+-Qdt/] },
  // Desafio VII — printf/echo > PKGBUILD + cat PKGBUILD
  { levelId: "vale-arch", challengeIndex: 6, reward: 28, requiredPatterns: [/^printf\s+.+>.*PKGBUILD|^echo\s+.+>.*PKGBUILD/, /^cat\s+PKGBUILD/] },
  // Desafio VIII — reflector --help
  { levelId: "vale-arch", challengeIndex: 7, reward: 30, requiredPatterns: [/^reflector\s+/] },
  // Desafio IX — yay --version + yay --help
  { levelId: "vale-arch", challengeIndex: 8, reward: 32, requiredPatterns: [/^yay\s+/] },
  // Desafio X — mkdir arch-configs + echo > arch-configs/pacman.conf + cat arch-configs/pacman.conf
  { levelId: "vale-arch", challengeIndex: 9, reward: 43, requiredPatterns: [/^mkdir\s+arch-configs/, /^echo\s+.+>.*arch-configs\/pacman\.conf/, /^cat\s+arch-configs\/pacman\.conf/] },
];

/** Retorna a resposta esperada para um desafio específico */
export function getChallengeAnswer(levelId: string, challengeIndex: number): ChallengeAnswer | null {
  return CHALLENGE_ANSWERS.find(
    (a) => a.levelId === levelId && a.challengeIndex === challengeIndex
  ) ?? null;
}

/** Valida se o histórico de comandos satisfaz os padrões esperados */
export function validateChallengeAnswer(
  levelId: string,
  challengeIndex: number,
  commandHistory: string[]
): { valid: boolean; reward: number; message: string } {
  const answer = getChallengeAnswer(levelId, challengeIndex);
  if (!answer) {
    return { valid: false, reward: 0, message: "Desafio não encontrado." };
  }

  // Verifica se todos os padrões obrigatórios têm pelo menos um match no histórico
  const allPatternsMet = answer.requiredPatterns.every((pattern) =>
    commandHistory.some((cmd) => pattern.test(cmd.trim()))
  );

  if (!allPatternsMet) {
    return { valid: false, reward: 0, message: "Comandos insuficientes para completar o desafio." };
  }

  return { valid: true, reward: answer.reward, message: "Desafio validado com sucesso." };
}
