export interface Rank {
  id: string;
  name: string;
  minXP: number;
  color: string;
  glow: boolean;
  imagePath: string;
}

export const RANKS: Rank[] = [
  {
    id: "unranked",
    name: "Unranked",
    minXP: 0,
    color: "#9ca3af", // Gray-400
    glow: false,
    imagePath: "/assets/ranks/unranked.png"
  },
  {
    id: "bronze",
    name: "Bronze",
    minXP: 1000,
    color: "#cd7f32",
    glow: false,
    imagePath: "/assets/ranks/bronze.png"
  },
  {
    id: "silver",
    name: "Silver",
    minXP: 5000,
    color: "#c0c0c0",
    glow: false,
    imagePath: "/assets/ranks/silver.png"
  },
  {
    id: "gold",
    name: "Gold",
    minXP: 10000,
    color: "#ffd700",
    glow: false,
    imagePath: "/assets/ranks/gold.png"
  },
  {
    id: "diamond",
    name: "Diamond",
    minXP: 25000,
    color: "#06b6d4", // Cyan-500
    glow: true,
    imagePath: "/assets/ranks/diamond.png"
  },
  {
    id: "ruby",
    name: "Ruby",
    minXP: 50000,
    color: "#e11d48", // Rose-600
    glow: true,
    imagePath: "/assets/ranks/ruby.png"
  },
  {
    id: "master",
    name: "Master",
    minXP: 100000,
    color: "#ffffff",
    glow: true,
    imagePath: "/assets/ranks/legendary.png"
  }
];

export function getRank(xp: number): Rank {
  // Reverse sort to find the highest rank with minXP <= xp
  const rank = [...RANKS].reverse().find(r => xp >= r.minXP);
  return rank || RANKS[0];
}

export function getNextRank(currentRankId: string): Rank | null {
  const index = RANKS.findIndex(r => r.id === currentRankId);
  if (index === -1 || index === RANKS.length - 1) return null;
  return RANKS[index + 1];
}
