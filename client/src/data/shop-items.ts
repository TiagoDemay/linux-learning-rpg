export type ShopItemId =
  | "autocomplete"
  | "reveal-hint"
  | "man-extended"
  | "history-50"
  | "cheat-sheet-network"
  | "cheat-sheet-git"
  | "cheat-sheet-permissions"
  | "double-coins"
  | "skip-challenge";

export interface ShopItem {
  id: ShopItemId;
  name: string;
  description: string;
  longDescription: string;
  icon: string;
  price: number;
  /** "permanent" = comprado uma vez e fica ativo para sempre; "consumable" = uso único */
  type: "permanent" | "consumable";
  /** Quantas vezes pode ser comprado (consumable). Permanente = 1. */
  maxStack?: number;
  category: "terminal" | "knowledge" | "boost";
}

export const SHOP_ITEMS: ShopItem[] = [
  // ── TERMINAL ──────────────────────────────────────────────────
  {
    id: "autocomplete",
    name: "Grimório do Autocomplete",
    description: "Tab completa automaticamente qualquer comando Linux",
    longDescription:
      "Ao pressionar Tab, o terminal sugere e completa automaticamente comandos de uma lista extensa com mais de 80 comandos Linux. Inclui todos os comandos dos 10 territórios.",
    icon: "📖",
    price: 30,
    type: "permanent",
    category: "terminal",
  },
  {
    id: "reveal-hint",
    name: "Pergaminho da Revelação",
    description: "Revela a dica do desafio atual no terminal",
    longDescription:
      "Use o comando `hint` no terminal para revelar a dica do desafio atual. Cada uso consome um pergaminho. Útil quando você está preso em um desafio difícil.",
    icon: "📜",
    price: 15,
    type: "consumable",
    maxStack: 10,
    category: "terminal",
  },
  {
    id: "man-extended",
    name: "Biblioteca do Sábio",
    description: "Páginas man detalhadas com exemplos práticos",
    longDescription:
      "O comando `man` passa a exibir exemplos práticos e casos de uso reais além da descrição padrão. Facilita o aprendizado de comandos complexos.",
    icon: "📚",
    price: 25,
    type: "permanent",
    category: "terminal",
  },
  {
    id: "history-50",
    name: "Cristal da Memória",
    description: "Histórico de comandos expandido para 200 entradas",
    longDescription:
      "O histórico de comandos (seta ↑) passa a guardar até 200 entradas em vez de 50. Nunca mais perca um comando que funcionou!",
    icon: "🔮",
    price: 20,
    type: "permanent",
    category: "terminal",
  },
  // ── KNOWLEDGE ─────────────────────────────────────────────────
  {
    id: "cheat-sheet-network",
    name: "Mapa das Redes",
    description: "Folha de referência de comandos de rede no painel",
    longDescription:
      "Adiciona uma seção de referência rápida de comandos de rede (ping, ip, ss, curl, wget, ssh) no painel lateral do terminal.",
    icon: "🗺️",
    price: 20,
    type: "permanent",
    category: "knowledge",
  },
  {
    id: "cheat-sheet-git",
    name: "Tábua do Git",
    description: "Folha de referência de comandos git no painel",
    longDescription:
      "Adiciona uma seção de referência rápida de comandos git (init, add, commit, push, pull, branch, merge) no painel lateral do terminal.",
    icon: "🪵",
    price: 20,
    type: "permanent",
    category: "knowledge",
  },
  {
    id: "cheat-sheet-permissions",
    name: "Runa das Permissões",
    description: "Tabela de chmod/chown/umask no painel",
    longDescription:
      "Adiciona uma tabela de referência de permissões Unix (chmod numérico e simbólico, chown, grupos) no painel lateral do terminal.",
    icon: "🔑",
    price: 20,
    type: "permanent",
    category: "knowledge",
  },
  // ── BOOST ─────────────────────────────────────────────────────
  {
    id: "double-coins",
    name: "Amuleto da Fortuna",
    description: "Dobra as moedas ganhas no próximo desafio",
    longDescription:
      "O próximo desafio concluído concede o dobro de moedas. Ative antes de completar um desafio de alta recompensa para maximizar seus ganhos!",
    icon: "🪙",
    price: 40,
    type: "consumable",
    maxStack: 5,
    category: "boost",
  },
  {
    id: "skip-challenge",
    name: "Poção do Atalho",
    description: "Pula o desafio atual sem perder progresso",
    longDescription:
      "Use o comando `skip` no terminal para avançar para o próximo desafio sem precisar completar o atual. Não concede moedas pelo desafio pulado.",
    icon: "⚗️",
    price: 50,
    type: "consumable",
    maxStack: 3,
    category: "boost",
  },
];

export const getShopItem = (id: ShopItemId): ShopItem | undefined =>
  SHOP_ITEMS.find((item) => item.id === id);

export const SHOP_CATEGORIES = [
  { id: "terminal", label: "Terminal", icon: "⌨️" },
  { id: "knowledge", label: "Conhecimento", icon: "📖" },
  { id: "boost", label: "Impulso", icon: "⚡" },
] as const;
