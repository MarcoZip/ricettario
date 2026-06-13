// Motore ingredienti: interpreta una riga ("200 g di farina") in
// { qty, unit, name, raw }, ricalcola le quantità per le porzioni, unisce gli
// ingredienti uguali e li raggruppa per reparto del supermercato.
// Pensato per l'italiano, senza dipendenze esterne.

const UNICODE_FRAC = {
  "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75,
  "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8, "⅙": 1 / 6, "⅚": 5 / 6,
  "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875
};
const FRAC_CHARS = Object.keys(UNICODE_FRAC).join("");

// Unità riconosciute → forma canonica (per unire ingredienti uguali).
const UNIT_MAP = {
  g: "g", gr: "g", grammo: "g", grammi: "g",
  kg: "kg", chilo: "kg", chili: "kg", chilogrammo: "kg", chilogrammi: "kg",
  hg: "hg", etto: "hg", etti: "hg",
  mg: "mg",
  l: "l", litro: "l", litri: "l",
  ml: "ml", cl: "cl", dl: "dl",
  cucchiaio: "cucchiai", cucchiai: "cucchiai",
  cucchiaino: "cucchiaini", cucchiaini: "cucchiaini",
  tazza: "tazze", tazze: "tazze",
  bicchiere: "bicchieri", bicchieri: "bicchieri",
  spicchio: "spicchi", spicchi: "spicchi",
  fetta: "fette", fette: "fette",
  foglia: "foglie", foglie: "foglie",
  rametto: "rametti", rametti: "rametti",
  mazzetto: "mazzetti", mazzetti: "mazzetti",
  pizzico: "pizzichi", pizzichi: "pizzichi",
  noce: "noci", noci: "noci",
  manciata: "manciate", manciate: "manciate",
  scatola: "scatole", scatole: "scatole",
  lattina: "lattine", lattine: "lattine",
  barattolo: "barattoli", barattoli: "barattoli",
  confezione: "confezioni", confezioni: "confezioni",
  bustina: "bustine", bustine: "bustine",
  busta: "buste", buste: "buste",
  vasetto: "vasetti", vasetti: "vasetti",
  pezzo: "pezzi", pezzi: "pezzi", pz: "pezzi"
};

function num(str) {
  return parseFloat(String(str).replace(",", "."));
}

// Estrae la quantità iniziale: gestisce interi, decimali, frazioni (½ o 1/2),
// numeri misti (1 ½) e intervalli (2-3, di cui prende la media).
function extractQty(s) {
  s = s.trim();
  let m;
  // intero + frazione unicode: "1 ½"
  m = s.match(new RegExp("^(\\d+)\\s*([" + FRAC_CHARS + "])"));
  if (m) return { qty: parseInt(m[1], 10) + UNICODE_FRAC[m[2]], rest: s.slice(m[0].length) };
  // frazione unicode da sola
  m = s.match(new RegExp("^([" + FRAC_CHARS + "])"));
  if (m) return { qty: UNICODE_FRAC[m[1]], rest: s.slice(m[0].length) };
  // numero misto "1 1/2"
  m = s.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (m) return { qty: parseInt(m[1], 10) + num(m[2]) / num(m[3]), rest: s.slice(m[0].length) };
  // frazione "1/2"
  m = s.match(/^(\d+)\/(\d+)/);
  if (m) return { qty: num(m[1]) / num(m[2]), rest: s.slice(m[0].length) };
  // intervallo "2-3" o "2–3" → media
  m = s.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)/);
  if (m) return { qty: (num(m[1]) + num(m[2])) / 2, rest: s.slice(m[0].length) };
  // decimale "2,5"
  m = s.match(/^(\d+[.,]\d+)/);
  if (m) return { qty: num(m[1]), rest: s.slice(m[0].length) };
  // intero
  m = s.match(/^(\d+)/);
  if (m) return { qty: num(m[1]), rest: s.slice(m[0].length) };
  return { qty: null, rest: s };
}

// Interpreta una singola riga di ingrediente.
export function parseLine(raw) {
  const original = String(raw || "").trim();
  if (!original) return null;
  let s = original.replace(/^[-•*–·]\s*/, ""); // toglie eventuale punto elenco

  // "q.b." (quanto basta) in qualunque posizione
  const qb = /\b(q\.?\s?b\.?|quanto basta)\b/i.test(s);
  if (qb) s = s.replace(/\b(q\.?\s?b\.?|quanto basta)\b/i, "").trim();

  const { qty, rest } = extractQty(s);
  let remainder = rest.trim();

  // unità subito dopo la quantità
  let unit = "";
  const firstWord = remainder.split(/\s+/)[0] || "";
  const key = firstWord.toLowerCase().replace(/\.$/, "");
  if (UNIT_MAP[key]) {
    unit = UNIT_MAP[key];
    remainder = remainder.slice(firstWord.length).trim();
  }
  // toglie "di" / "d'" iniziale
  remainder = remainder.replace(/^(di\s+|d['’]\s*)/i, "").trim();
  // pulizia punteggiatura/spazi residui (es. il "." lasciato da "q.b.")
  remainder = remainder.replace(/^[\s.,;:]+|[\s.,;:]+$/g, "").replace(/\s{2,}/g, " ").trim();

  if (qb && !unit) unit = "q.b.";
  return {
    qty: qty,
    unit: unit,
    name: remainder || original,
    raw: original
  };
}

export function parseList(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map(parseLine)
    .filter(Boolean);
}

// Formatta una quantità in modo "da cucina" (½, 1¾, 2,5...).
export function formatQty(n) {
  if (n == null || isNaN(n)) return "";
  const whole = Math.floor(n + 1e-9);
  const frac = n - whole;
  const table = [
    [0, ""], [1 / 8, "⅛"], [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"],
    [2 / 3, "⅔"], [0.75, "¾"], [1, ""]
  ];
  let best = null, bestDiff = 1;
  for (const [v, sym] of table) {
    const d = Math.abs(frac - v);
    if (d < bestDiff) { bestDiff = d; best = { v, sym }; }
  }
  if (bestDiff <= 0.06) {
    let w = whole + (best.v === 1 ? 1 : 0);
    if (best.sym && best.v !== 1) return (w ? w + "" : "") + best.sym;
    return String(w);
  }
  // altrimenti decimale con virgola, max 2 cifre
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

// Riscrive una quantità scalata in testo (con unità e nome).
export function scaleQty(qty, factor) {
  if (qty == null) return null;
  return qty * factor;
}

export function ingredientText(item, factor = 1) {
  const q = item.qty != null ? formatQty(item.qty * factor) : "";
  const parts = [q, item.unit && item.unit !== "q.b." ? item.unit : "", item.name].filter(Boolean);
  let txt = parts.join(" ").trim();
  if (item.unit === "q.b." || (item.qty == null && !item.unit)) {
    txt = item.name + (item.unit === "q.b." ? " q.b." : "");
  }
  return txt;
}

// Unisce ingredienti uguali (stesso nome + unità), sommando le quantità.
// Unisce le origini (ricette di provenienza) in una stringa "A, B" senza duplicati.
function mergeFrom(a, b) {
  if (!a) return b || "";
  if (!b) return a || "";
  const set = new Set(a.split(",").map((x) => x.trim()).filter(Boolean));
  b.split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => set.add(x));
  return [...set].join(", ");
}

export function combine(items) {
  const map = new Map();
  for (const it of items) {
    const key = (it.name || "").toLowerCase().trim() + "|" + (it.unit || "").toLowerCase();
    if (map.has(key)) {
      const ex = map.get(key);
      if (ex.qty == null || it.qty == null) ex.qty = ex.qty == null ? it.qty : ex.qty;
      else ex.qty += it.qty;
      ex.from = mergeFrom(ex.from, it.from);
    } else {
      map.set(key, { qty: it.qty, unit: it.unit, name: it.name, category: it.category, from: it.from || "" });
    }
  }
  return [...map.values()];
}

// Reparto del supermercato (best-effort, per parole chiave).
const CATEGORIES = [
  ["Frutta e verdura", ["pomodor", "cipoll", "aglio", "carot", "zucchin", "patat", "insalat", "limon", "mela", "mele", "banan", "spinac", "basilic", "prezzemol", "sedano", "peperon", "melanzan", "fungh", "zucca", "broccol", "fagiolin", "pisell", "lattug", "rucol", "aranc", "fragol", "uva", "verdur", "frutta", "rosmarin", "salvia", "menta", "porro", "cetriol", "radicchi", "finocchi"]],
  ["Carne e pesce", ["pollo", "manzo", "maial", "vitell", "salsicc", "prosciutt", "pancett", "tonno", "salmon", "gamber", "pesce", "carne", "tacchin", "bresaol", "speck", "wurstel", "würstel", "merluzz", "vongol", "cozze", "calamar", "acciug", "guancial", "macinat", "hamburger"]],
  ["Latticini e uova", ["latte", "burro", "formagg", "parmigian", "mozzarell", "ricott", "panna", "yogurt", "uova", "uovo", "mascarpon", "grana", "pecorin", "stracchin", "philadelphia", "fontina", "gorgonzol", "scamorz"]],
  ["Panetteria", ["pane", "pangrattat", "grissin", "brioche", "baguette", "piadin", "tortilla", "crostin"]],
  ["Surgelati", ["surgelat", "gelato", "ghiaccio"]],
  ["Bevande", ["vino", "birra", "acqua", "succo", "caffè", "caffe", "spumante", "prosecco", "liquore", "rum", "brandy"]],
  ["Dispensa", ["farina", "zucchero", "sale", "olio", "aceto", "riso", "pasta", "lievito", "passata", "pelati", "brodo", "dado", "pepe", "spezi", "cioccolat", "cacao", "miele", "marmellat", "ceci", "lenticchi", "fagiol", "legumi", "conserv", "scatol", "noce moscata", "vaniglia", "cannella", "maizena", "amido", "mandorl", "noci", "pinoli", "cocco", "semola"]]
];

export function categorize(name) {
  const n = (name || "").toLowerCase();
  for (const [cat, keys] of CATEGORIES) {
    if (keys.some((k) => n.includes(k))) return cat;
  }
  return "Altro";
}

export const CATEGORY_ORDER = ["Frutta e verdura", "Carne e pesce", "Latticini e uova", "Panetteria", "Dispensa", "Surgelati", "Bevande", "Altro"];
