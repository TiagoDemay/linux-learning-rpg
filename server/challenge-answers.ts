/**
 * challenge-answers.ts
 *
 * Mapa server-side das respostas esperadas para cada desafio.
 * Cada entrada define os comandos obrigatórios que o aluno deve ter digitado.
 * A validação é feita por regex sobre o histórico de comandos — sem expor
 * a lógica no bundle JavaScript do cliente.
 *
 * NUNCA expor este arquivo ao cliente.
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
  { levelId: "floresta-stallman", challengeIndex: 0, reward: 5,  requiredPatterns: [/^pwd$/, /^ls/] },
  { levelId: "floresta-stallman", challengeIndex: 1, reward: 8,  requiredPatterns: [/^mkdir\s+acampamento/, /^cd\s+acampamento/] },
  { levelId: "floresta-stallman", challengeIndex: 2, reward: 10, requiredPatterns: [/^touch\s+rascunho\.txt/, /^mkdir\s+lixo/, /^rmdir\s+lixo/] },
  { levelId: "floresta-stallman", challengeIndex: 3, reward: 12, requiredPatterns: [/^echo\s+.+>\s*mensagem\.txt/, /^cat\s+mensagem\.txt/] },
  { levelId: "floresta-stallman", challengeIndex: 4, reward: 15, requiredPatterns: [/^cp\s+mensagem\.txt\s+backup\.txt/, /^mv\s+rascunho\.txt\s+notas\.txt/] },
  { levelId: "floresta-stallman", challengeIndex: 5, reward: 18, requiredPatterns: [/^find\s+/, /^rm\s+backup\.txt/] },
  { levelId: "floresta-stallman", challengeIndex: 6, reward: 20, requiredPatterns: [/^echo\s+.+>\s*diario\.txt/, /^grep\s+/] },
  { levelId: "floresta-stallman", challengeIndex: 7, reward: 22, requiredPatterns: [/^touch\s+feitico\.sh/, /^chmod\s+\+x\s+feitico\.sh/] },
  { levelId: "floresta-stallman", challengeIndex: 8, reward: 25, requiredPatterns: [/^ps/, /^top/] },
  { levelId: "floresta-stallman", challengeIndex: 9, reward: 30, requiredPatterns: [/^ls\s+-la?/, /^file\s+/] },

  // ── TUNDRA DO SLACKWARE ──────────────────────────────────────────────────
  { levelId: "tundra-slackware", challengeIndex: 0, reward: 10, requiredPatterns: [/^ping\s+/, /^ifconfig|^ip\s+addr/] },
  { levelId: "tundra-slackware", challengeIndex: 1, reward: 12, requiredPatterns: [/^apt\s+update/, /^apt\s+(install|upgrade)/] },
  { levelId: "tundra-slackware", challengeIndex: 2, reward: 14, requiredPatterns: [/^apt\s+search\s+/, /^apt\s+show\s+/] },
  { levelId: "tundra-slackware", challengeIndex: 3, reward: 16, requiredPatterns: [/^netstat|^ss\s+/] },
  { levelId: "tundra-slackware", challengeIndex: 4, reward: 18, requiredPatterns: [/^wget\s+|^curl\s+/] },
  { levelId: "tundra-slackware", challengeIndex: 5, reward: 20, requiredPatterns: [/^apt\s+remove\s+|^apt\s+purge\s+/] },
  { levelId: "tundra-slackware", challengeIndex: 6, reward: 22, requiredPatterns: [/^hostname/, /^uname\s+-a/] },
  { levelId: "tundra-slackware", challengeIndex: 7, reward: 24, requiredPatterns: [/^cat\s+\/etc\/hosts/, /^cat\s+\/etc\/resolv\.conf/] },
  { levelId: "tundra-slackware", challengeIndex: 8, reward: 26, requiredPatterns: [/^traceroute\s+|^tracepath\s+/] },
  { levelId: "tundra-slackware", challengeIndex: 9, reward: 33, requiredPatterns: [/^nmap\s+|^netstat\s+-tulpn|^ss\s+-tulpn/] },

  // ── PÂNTANO DE SYSTEMD ───────────────────────────────────────────────────
  { levelId: "pantano-systemd", challengeIndex: 0, reward: 12, requiredPatterns: [/^systemctl\s+status\s+/] },
  { levelId: "pantano-systemd", challengeIndex: 1, reward: 14, requiredPatterns: [/^systemctl\s+start\s+/, /^systemctl\s+enable\s+/] },
  { levelId: "pantano-systemd", challengeIndex: 2, reward: 16, requiredPatterns: [/^systemctl\s+stop\s+/, /^systemctl\s+disable\s+/] },
  { levelId: "pantano-systemd", challengeIndex: 3, reward: 18, requiredPatterns: [/^systemctl\s+restart\s+/] },
  { levelId: "pantano-systemd", challengeIndex: 4, reward: 20, requiredPatterns: [/^journalctl\s+/] },
  { levelId: "pantano-systemd", challengeIndex: 5, reward: 22, requiredPatterns: [/^systemctl\s+list-units/] },
  { levelId: "pantano-systemd", challengeIndex: 6, reward: 24, requiredPatterns: [/^systemctl\s+daemon-reload/] },
  { levelId: "pantano-systemd", challengeIndex: 7, reward: 26, requiredPatterns: [/^systemctl\s+mask\s+|^systemctl\s+unmask\s+/] },
  { levelId: "pantano-systemd", challengeIndex: 8, reward: 28, requiredPatterns: [/^journalctl\s+.*-u\s+|^journalctl\s+.*--unit/] },
  { levelId: "pantano-systemd", challengeIndex: 9, reward: 37, requiredPatterns: [/^systemctl\s+is-enabled\s+/, /^systemctl\s+is-active\s+/] },

  // ── MONTANHAS DE KERNIGHAN ───────────────────────────────────────────────
  { levelId: "montanhas-kernighan", challengeIndex: 0, reward: 12, requiredPatterns: [/^cat\s+/, /^head\s+|^tail\s+/] },
  { levelId: "montanhas-kernighan", challengeIndex: 1, reward: 14, requiredPatterns: [/^grep\s+.*-r|^grep\s+-r/] },
  { levelId: "montanhas-kernighan", challengeIndex: 2, reward: 16, requiredPatterns: [/^sed\s+/] },
  { levelId: "montanhas-kernighan", challengeIndex: 3, reward: 18, requiredPatterns: [/^awk\s+/] },
  { levelId: "montanhas-kernighan", challengeIndex: 4, reward: 20, requiredPatterns: [/^sort\s+/, /^uniq\s+/] },
  { levelId: "montanhas-kernighan", challengeIndex: 5, reward: 22, requiredPatterns: [/^wc\s+/] },
  { levelId: "montanhas-kernighan", challengeIndex: 6, reward: 24, requiredPatterns: [/^cut\s+/] },
  { levelId: "montanhas-kernighan", challengeIndex: 7, reward: 26, requiredPatterns: [/^tr\s+/] },
  { levelId: "montanhas-kernighan", challengeIndex: 8, reward: 28, requiredPatterns: [/^diff\s+/] },
  { levelId: "montanhas-kernighan", challengeIndex: 9, reward: 39, requiredPatterns: [/^tee\s+|.*\|\s*tee\s+/] },

  // ── CIDADE LIVRE DE GNU ──────────────────────────────────────────────────
  { levelId: "cidade-gnu", challengeIndex: 0, reward: 12, requiredPatterns: [/^echo\s+\$[A-Z_]+/, /^export\s+/] },
  { levelId: "cidade-gnu", challengeIndex: 1, reward: 14, requiredPatterns: [/^env$|^printenv/] },
  { levelId: "cidade-gnu", challengeIndex: 2, reward: 16, requiredPatterns: [/^alias\s+/] },
  { levelId: "cidade-gnu", challengeIndex: 3, reward: 18, requiredPatterns: [/^source\s+|^\.\s+/] },
  { levelId: "cidade-gnu", challengeIndex: 4, reward: 20, requiredPatterns: [/^bash\s+.*\.sh|^sh\s+.*\.sh|^\.\/.*\.sh/] },
  { levelId: "cidade-gnu", challengeIndex: 5, reward: 22, requiredPatterns: [/^history/] },
  { levelId: "cidade-gnu", challengeIndex: 6, reward: 24, requiredPatterns: [/^which\s+|^type\s+/] },
  { levelId: "cidade-gnu", challengeIndex: 7, reward: 26, requiredPatterns: [/^set\s+|^unset\s+/] },
  { levelId: "cidade-gnu", challengeIndex: 8, reward: 28, requiredPatterns: [/^read\s+/] },
  { levelId: "cidade-gnu", challengeIndex: 9, reward: 37, requiredPatterns: [/^declare\s+|^typeset\s+/] },

  // ── PLANÍCIES DE REDHAT ──────────────────────────────────────────────────
  { levelId: "planicies-redhat", challengeIndex: 0, reward: 14, requiredPatterns: [/^rpm\s+-q|^rpm\s+-i|^rpm\s+-e/] },
  { levelId: "planicies-redhat", challengeIndex: 1, reward: 16, requiredPatterns: [/^yum\s+install\s+|^dnf\s+install\s+/] },
  { levelId: "planicies-redhat", challengeIndex: 2, reward: 18, requiredPatterns: [/^yum\s+update|^dnf\s+update/] },
  { levelId: "planicies-redhat", challengeIndex: 3, reward: 20, requiredPatterns: [/^yum\s+remove\s+|^dnf\s+remove\s+/] },
  { levelId: "planicies-redhat", challengeIndex: 4, reward: 22, requiredPatterns: [/^yum\s+search\s+|^dnf\s+search\s+/] },
  { levelId: "planicies-redhat", challengeIndex: 5, reward: 24, requiredPatterns: [/^rpm\s+-qa/, /^rpm\s+-ql/] },
  { levelId: "planicies-redhat", challengeIndex: 6, reward: 26, requiredPatterns: [/^yum\s+info\s+|^dnf\s+info\s+/] },
  { levelId: "planicies-redhat", challengeIndex: 7, reward: 28, requiredPatterns: [/^yum\s+list\s+|^dnf\s+list\s+/] },
  { levelId: "planicies-redhat", challengeIndex: 8, reward: 30, requiredPatterns: [/^yum\s+clean\s+|^dnf\s+clean\s+/] },
  { levelId: "planicies-redhat", challengeIndex: 9, reward: 38, requiredPatterns: [/^rpm\s+--import|^rpm\s+-V/] },

  // ── DESERTO DE DEBIAN ────────────────────────────────────────────────────
  { levelId: "deserto-debian", challengeIndex: 0, reward: 14, requiredPatterns: [/^dpkg\s+-i\s+|^dpkg\s+--install/] },
  { levelId: "deserto-debian", challengeIndex: 1, reward: 16, requiredPatterns: [/^dpkg\s+-r\s+|^dpkg\s+--remove/] },
  { levelId: "deserto-debian", challengeIndex: 2, reward: 18, requiredPatterns: [/^dpkg\s+-l|^dpkg\s+--list/] },
  { levelId: "deserto-debian", challengeIndex: 3, reward: 20, requiredPatterns: [/^dpkg\s+-L\s+|^dpkg\s+--listfiles/] },
  { levelId: "deserto-debian", challengeIndex: 4, reward: 22, requiredPatterns: [/^dpkg\s+-S\s+|^dpkg\s+--search/] },
  { levelId: "deserto-debian", challengeIndex: 5, reward: 24, requiredPatterns: [/^apt-cache\s+depends\s+|^apt-cache\s+rdepends/] },
  { levelId: "deserto-debian", challengeIndex: 6, reward: 26, requiredPatterns: [/^dpkg\s+--configure\s+|^dpkg\s+--reconfigure/] },
  { levelId: "deserto-debian", challengeIndex: 7, reward: 28, requiredPatterns: [/^apt-get\s+download\s+|^apt\s+download\s+/] },
  { levelId: "deserto-debian", challengeIndex: 8, reward: 30, requiredPatterns: [/^dpkg\s+--get-selections|^dpkg\s+--set-selections/] },
  { levelId: "deserto-debian", challengeIndex: 9, reward: 41, requiredPatterns: [/^apt-mark\s+hold\s+|^apt-mark\s+unhold\s+/] },

  // ── ILHAS DE CANONICAL ───────────────────────────────────────────────────
  { levelId: "ilhas-canonical", challengeIndex: 0, reward: 14, requiredPatterns: [/^snap\s+install\s+/] },
  { levelId: "ilhas-canonical", challengeIndex: 1, reward: 16, requiredPatterns: [/^snap\s+remove\s+/] },
  { levelId: "ilhas-canonical", challengeIndex: 2, reward: 18, requiredPatterns: [/^snap\s+list/] },
  { levelId: "ilhas-canonical", challengeIndex: 3, reward: 20, requiredPatterns: [/^snap\s+refresh\s+|^snap\s+update\s+/] },
  { levelId: "ilhas-canonical", challengeIndex: 4, reward: 22, requiredPatterns: [/^ssh\s+/, /^ssh-keygen/] },
  { levelId: "ilhas-canonical", challengeIndex: 5, reward: 24, requiredPatterns: [/^ufw\s+enable|^ufw\s+allow\s+/] },
  { levelId: "ilhas-canonical", challengeIndex: 6, reward: 26, requiredPatterns: [/^ufw\s+status/] },
  { levelId: "ilhas-canonical", challengeIndex: 7, reward: 28, requiredPatterns: [/^ufw\s+deny\s+|^ufw\s+delete\s+/] },
  { levelId: "ilhas-canonical", challengeIndex: 8, reward: 30, requiredPatterns: [/^snap\s+info\s+/] },
  { levelId: "ilhas-canonical", challengeIndex: 9, reward: 41, requiredPatterns: [/^snap\s+connect\s+|^snap\s+disconnect\s+/] },

  // ── VALE DO ARCH LINUX ───────────────────────────────────────────────────
  { levelId: "vale-arch", challengeIndex: 0, reward: 16, requiredPatterns: [/^pacman\s+-S\s+/] },
  { levelId: "vale-arch", challengeIndex: 1, reward: 18, requiredPatterns: [/^pacman\s+-R\s+|^pacman\s+-Rs\s+/] },
  { levelId: "vale-arch", challengeIndex: 2, reward: 20, requiredPatterns: [/^pacman\s+-Syu|^pacman\s+-Su/] },
  { levelId: "vale-arch", challengeIndex: 3, reward: 22, requiredPatterns: [/^pacman\s+-Ss\s+/] },
  { levelId: "vale-arch", challengeIndex: 4, reward: 24, requiredPatterns: [/^pacman\s+-Qi\s+|^pacman\s+-Si\s+/] },
  { levelId: "vale-arch", challengeIndex: 5, reward: 26, requiredPatterns: [/^pacman\s+-Ql\s+/] },
  { levelId: "vale-arch", challengeIndex: 6, reward: 28, requiredPatterns: [/^pacman\s+-Qo\s+/] },
  { levelId: "vale-arch", challengeIndex: 7, reward: 30, requiredPatterns: [/^yay\s+-S\s+|^paru\s+-S\s+/] },
  { levelId: "vale-arch", challengeIndex: 8, reward: 32, requiredPatterns: [/^pacman\s+-Sc|^pacman\s+-Scc/] },
  { levelId: "vale-arch", challengeIndex: 9, reward: 43, requiredPatterns: [/^pacman\s+-D\s+--asexplicit|^pacman\s+-Qdt/] },

  // ── REINO DE TORVALDS ────────────────────────────────────────────────────
  { levelId: "reino-torvalds", challengeIndex: 0, reward: 16, requiredPatterns: [/^git\s+init/, /^git\s+config\s+/] },
  { levelId: "reino-torvalds", challengeIndex: 1, reward: 18, requiredPatterns: [/^git\s+add\s+/, /^git\s+commit\s+-m/] },
  { levelId: "reino-torvalds", challengeIndex: 2, reward: 20, requiredPatterns: [/^git\s+status/, /^git\s+log/] },
  { levelId: "reino-torvalds", challengeIndex: 3, reward: 22, requiredPatterns: [/^git\s+branch\s+/, /^git\s+checkout\s+/] },
  { levelId: "reino-torvalds", challengeIndex: 4, reward: 24, requiredPatterns: [/^git\s+merge\s+/] },
  { levelId: "reino-torvalds", challengeIndex: 5, reward: 26, requiredPatterns: [/^git\s+stash/] },
  { levelId: "reino-torvalds", challengeIndex: 6, reward: 28, requiredPatterns: [/^git\s+remote\s+add\s+/, /^git\s+push\s+/] },
  { levelId: "reino-torvalds", challengeIndex: 7, reward: 30, requiredPatterns: [/^git\s+pull\s+|^git\s+fetch\s+/] },
  { levelId: "reino-torvalds", challengeIndex: 8, reward: 32, requiredPatterns: [/^git\s+rebase\s+/] },
  { levelId: "reino-torvalds", challengeIndex: 9, reward: 40, requiredPatterns: [/^git\s+tag\s+/, /^git\s+log\s+.*--oneline/] },
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
