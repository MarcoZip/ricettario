// Ingredienti di stagione (Italia). Per ogni prodotto, i mesi (1-12) in cui è di
// stagione e le parole chiave per riconoscerlo tra gli ingredienti di una ricetta.
// Usato per il badge "di stagione" e la sezione "Di stagione" in home.

const PRODUCE = [
  { name: "Asparagi", emoji: "🌱", months: [3, 4, 5], keys: ["asparag"] },
  { name: "Carciofi", emoji: "🌿", months: [1, 2, 3, 4, 5, 11, 12], keys: ["carciof"] },
  { name: "Fave", emoji: "🫛", months: [4, 5, 6], keys: ["fave"] },
  { name: "Piselli", emoji: "🫛", months: [4, 5, 6], keys: ["pisell"] },
  { name: "Fragole", emoji: "🍓", months: [4, 5, 6], keys: ["fragol"] },
  { name: "Ciliegie", emoji: "🍒", months: [5, 6, 7], keys: ["ciliegi"] },
  { name: "Zucchine", emoji: "🥒", months: [5, 6, 7, 8, 9], keys: ["zucchin"] },
  { name: "Pomodori", emoji: "🍅", months: [6, 7, 8, 9], keys: ["pomodor"] },
  { name: "Melanzane", emoji: "🍆", months: [6, 7, 8, 9, 10], keys: ["melanzan"] },
  { name: "Peperoni", emoji: "🫑", months: [7, 8, 9, 10], keys: ["peperon"] },
  { name: "Basilico", emoji: "🌿", months: [5, 6, 7, 8, 9], keys: ["basilic"] },
  { name: "Fagiolini", emoji: "🫛", months: [6, 7, 8, 9], keys: ["fagiolin"] },
  { name: "Albicocche", emoji: "🍑", months: [6, 7, 8], keys: ["albicocc"] },
  { name: "Pesche", emoji: "🍑", months: [6, 7, 8, 9], keys: ["pesche", "pesca"] },
  { name: "Anguria", emoji: "🍉", months: [6, 7, 8, 9], keys: ["anguria", "cocomer"] },
  { name: "Melone", emoji: "🍈", months: [6, 7, 8, 9], keys: ["melone"] },
  { name: "Cetrioli", emoji: "🥒", months: [6, 7, 8, 9], keys: ["cetriol"] },
  { name: "Fichi", emoji: "🟣", months: [8, 9], keys: ["fichi", "fico"] },
  { name: "Uva", emoji: "🍇", months: [9, 10], keys: ["uva"] },
  { name: "Zucca", emoji: "🎃", months: [9, 10, 11, 12], keys: ["zucca"] },
  { name: "Funghi", emoji: "🍄", months: [9, 10, 11], keys: ["funghi", "porcin"] },
  { name: "Castagne", emoji: "🌰", months: [10, 11], keys: ["castagn", "marron"] },
  { name: "Cavolfiore", emoji: "🥦", months: [10, 11, 12, 1, 2], keys: ["cavolfior"] },
  { name: "Broccoli", emoji: "🥦", months: [10, 11, 12, 1, 2, 3], keys: ["broccol"] },
  { name: "Cavolo", emoji: "🥬", months: [11, 12, 1, 2], keys: ["cavolo", "verza"] },
  { name: "Spinaci", emoji: "🥬", months: [10, 11, 12, 1, 2, 3], keys: ["spinac"] },
  { name: "Radicchio", emoji: "🥬", months: [10, 11, 12, 1, 2], keys: ["radicchi"] },
  { name: "Finocchi", emoji: "🌿", months: [11, 12, 1, 2, 3], keys: ["finocch"] },
  { name: "Arance", emoji: "🍊", months: [12, 1, 2, 3], keys: ["aranc"] },
  { name: "Mandarini", emoji: "🍊", months: [11, 12, 1, 2], keys: ["mandarin", "clementin"] },
  { name: "Limoni", emoji: "🍋", months: [11, 12, 1, 2, 3, 4], keys: ["limon"] }
];

export const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
export function monthName(m) { return MONTHS[(m - 1 + 12) % 12]; }

// Mese corrente 1-12.
export function currentMonth() { return new Date().getMonth() + 1; }

// Prodotti di stagione nel mese dato.
export function seasonalProduce(month) { return PRODUCE.filter((p) => p.months.includes(month)); }

// Prodotti di stagione presenti tra gli ingredienti della ricetta (array, può
// essere vuoto). Una ricetta è "di stagione" se ne ha almeno uno.
export function recipeSeasonalMatches(recipe, month) {
  const names = (recipe.ingredients || []).map((i) => (i.name || "").toLowerCase());
  const hit = [];
  for (const p of seasonalProduce(month)) {
    if (names.some((n) => p.keys.some((k) => n.includes(k)))) hit.push(p);
  }
  return hit;
}
