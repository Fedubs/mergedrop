// Game board dimensions
export const ROWS = 6;
export const COLS = 6;
export const RUN_SIZE = 5;
export const GAP = 2;

// Fibonacci display values: internal shade → displayed number
export const FIB = [0, 1, 2, 3, 5, 8, 13];

// Classic display values
export const CLASSIC = [0, 1, 2, 3, 4, 5, 6];

// Color shades for pieces
export const SHADES = {
  1: { bg: "#F0EAEA", glow: "#E8DEDE", border: "#D8CCCC", text: "#887777" },
  2: { bg: "#FFD4D4", glow: "#FFC4C4", border: "#F0AAAA", text: "#A06060" },
  3: { bg: "#FFA8A8", glow: "#FF9494", border: "#E87878", text: "#903838" },
  4: { bg: "#FF7070", glow: "#FF5C5C", border: "#D84848", text: "#FFFFFF" },
  5: { bg: "#F03838", glow: "#E82020", border: "#C01818", text: "#FFFFFF" },
  6: { bg: "#C01010", glow: "#B00808", border: "#900808", text: "#FFD0D0" },
};

// Exponential chain scoring
export function chainMultiplier(combo) {
  if (combo <= 1) return 1;
  return Math.round(Math.pow(combo, 2.5));
}

// Helper functions
export const cellKey = (r, c) => `${r},${c}`;

export function createEmptyGrid() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
}

export function cloneGrid(g) {
  return g.map(r => [...r]);
}
