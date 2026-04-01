export interface Level {
  id: string;
  name: string;
  description: string;
  icon: string;
  emoji: string;
  x: number; // percentage from left
  y: number; // percentage from top
  unlockCost: number;
  connections: string[];
  biome: string;
  color: string;
}

export const LEVELS: Level[] = [
  {
    id: "floresta-stallman",
    name: "Floresta de Stallman",
    description: "Uma floresta ancestral onde os primeiros feitiços do Software Livre foram conjurados. O espírito do GNU vela por estas terras.",
    icon: "🌲",
    emoji: "🌲",
    x: 14,
    y: 28,
    unlockCost: 0,
    connections: ["tundra-slackware", "pantano-systemd"],
    biome: "forest",
    color: "#2d5a27",
  },
  {
    id: "tundra-slackware",
    name: "Tundra do Slackware",
    description: "Terras geladas ao norte onde apenas os mais resilientes sobrevivem. A pureza do sistema é mantida a ferro e fogo.",
    icon: "❄️",
    emoji: "❄️",
    x: 50,
    y: 18,
    unlockCost: 15,
    connections: ["floresta-stallman", "montanhas-kernighan", "reino-torvalds"],
    biome: "tundra",
    color: "#a8d8ea",
  },
  {
    id: "montanhas-kernighan",
    name: "Montanhas de Kernighan",
    description: "Picos imponentes onde os antigos sábios escreveram os primeiros grimórios em linguagem C. O eco de 'Hello, World!' ainda ressoa.",
    icon: "⛰️",
    emoji: "⛰️",
    x: 82,
    y: 26,
    unlockCost: 25,
    connections: ["tundra-slackware", "planicies-redhat"],
    biome: "mountain",
    color: "#6b6b6b",
  },
  {
    id: "pantano-systemd",
    name: "Pantano de Systemd",
    description: "Terras sombrias e pantanosas onde processos vagam como espectros. Apenas quem domina os daemons pode atravessar ileso.",
    icon: "💀",
    emoji: "💀",
    x: 16,
    y: 56,
    unlockCost: 20,
    connections: ["floresta-stallman", "reino-torvalds", "deserto-debian"],
    biome: "swamp",
    color: "#4a5240",
  },
  {
    id: "reino-torvalds",
    name: "Reino de Torvalds",
    description: "O coração do continente. O grande castelo onde o Kernel é forjado e os penguins reinam supremos. Linus vela do alto da torre.",
    icon: "👑",
    emoji: "👑",
    x: 50,
    y: 40,
    unlockCost: 30,
    connections: ["tundra-slackware", "pantano-systemd", "cidade-gnu", "deserto-debian"],
    biome: "kingdom",
    color: "#8b4513",
  },
  {
    id: "cidade-gnu",
    name: "Cidade Livre de GNU",
    description: "Porto movimentado onde mercadores de código aberto trocam ferramentas e scripts. O touro GNU pasta nas praças centrais.",
    icon: "⚓",
    emoji: "⚓",
    x: 65,
    y: 60,
    unlockCost: 35,
    connections: ["reino-torvalds", "planicies-redhat", "ilhas-canonical"],
    biome: "port",
    color: "#1a5276",
  },
  {
    id: "planicies-redhat",
    name: "Planícies de RedHat",
    description: "Vastas planícies douradas onde empresas constroem seus impérios. O espantalho de chapéu vermelho guarda as colheitas de RPMs.",
    icon: "🌾",
    emoji: "🌾",
    x: 84,
    y: 48,
    unlockCost: 40,
    connections: ["montanhas-kernighan", "cidade-gnu"],
    biome: "plains",
    color: "#c0392b",
  },
  {
    id: "deserto-debian",
    name: "Deserto de Debian",
    description: "Areias intermináveis onde a estabilidade é lei. Caravanas de pacotes .deb cruzam o deserto em busca do oásis apt.",
    icon: "🏜️",
    emoji: "🏜️",
    x: 38,
    y: 80,
    unlockCost: 45,
    connections: ["pantano-systemd", "reino-torvalds", "ilhas-canonical"],
    biome: "desert",
    color: "#d4a017",
  },
  {
    id: "ilhas-canonical",
    name: "Ilhas de Canonical",
    description: "Arquipélago tropical onde o farol Ubuntu guia navegantes perdidos. Ubuntu significa 'humanidade para com os outros'.",
    icon: "🏝️",
    emoji: "🏝️",
    x: 72,
    y: 80,
    unlockCost: 50,
    connections: ["cidade-gnu", "deserto-debian", "vale-arch"],
    biome: "island",
    color: "#e67e22",
  },
  {
    id: "vale-arch",
    name: "Vale do Arch Linux",
    description: "Terras vulcânicas ao extremo leste, onde apenas os mais dedicados chegam. A chama do KISS (Keep It Simple, Stupid) arde eternamente.",
    icon: "🌋",
    emoji: "🌋",
    x: 88,
    y: 78,
    unlockCost: 60,
    connections: ["ilhas-canonical"],
    biome: "volcano",
    color: "#922b21",
  },
];

export const getLevelById = (id: string): Level | undefined =>
  LEVELS.find((l) => l.id === id);

export const getConnectedLevels = (levelId: string): Level[] => {
  const level = getLevelById(levelId);
  if (!level) return [];
  return level.connections.map((id) => getLevelById(id)).filter(Boolean) as Level[];
};

export const canUnlock = (
  levelId: string,
  unlockedLevels: string[],
  coins: number
): boolean => {
  const level = getLevelById(levelId);
  if (!level) return false;
  if (unlockedLevels.includes(levelId)) return true;
  const hasConnection = level.connections.some((connId) =>
    unlockedLevels.includes(connId)
  );
  return hasConnection && coins >= level.unlockCost;
};
