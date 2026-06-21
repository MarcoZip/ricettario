// Motore "sicuro per tutti": liste di parole chiave (italiane) per allergeni,
// intolleranze e diete, e una funzione che dice se una ricetta è adatta agli
// invitati di un menù delle feste. Le etichette degli allergeni nelle ricette
// sono opzionali e manuali, quindi qui ci basiamo soprattutto sugli INGREDIENTI.
// Rinforzo: oltre alle parole chiave, usiamo anche il classificatore per reparto
// (categorize) e parole aggiunte dall'utente, per essere più precisi.

import { categorize } from "./ingredients.js";

// Chip mostrati nell'editor degli invitati (i più comuni in alto).
export const GUEST_ALLERGENS = [
  "glutine", "lattosio", "uova", "frutta a guscio", "arachidi",
  "crostacei", "molluschi", "pesce", "soia", "sedano", "senape", "sesamo"
];
export const GUEST_DIETS = ["vegetariano", "vegano"];

// Etichetta allergene (ricetta) corrispondente al chip, dove esiste, per usare
// anche il tag manuale come rete di sicurezza in più.
export const ALLERGEN_TAG = {
  glutine: "Glutine", lattosio: "Lattosio", uova: "Uova",
  "frutta a guscio": "Frutta a guscio", arachidi: "Arachidi",
  pesce: "Pesce", crostacei: "Crostacei", soia: "Soia", sedano: "Sedano"
};

const PESCE = [
  "pesce", "tonno", "salmon", "merluzz", "baccal", "stoccafiss", "acciug",
  "alici", "sgombro", "branzin", "orata", "spigol", "platess", "sogliola",
  "pesce spada", "colla di pesce", "bottarga", "surimi", "nasello", "trota", "sarde"
];
const CROSTACEI = ["gamber", "scampi", "aragost", "astice", "granch", "mazzancoll", "canocchie", "cicale di mare"];
const MOLLUSCHI = ["cozz", "vongol", "calamar", "totani", "seppi", "polpo", "polipo", "ostrich", "capesant", "tellin", "fasolari", "moscardin"];
const LATTOSIO = [
  "latte", "burro", "panna", "formaggi", "mozzarell", "parmigian", "grana",
  "pecorino", "mascarpon", "ricott", "stracchin", "gorgonzol", "fontina",
  "scamorza", "provol", "caciocavall", "yogurt", "besciamella", "burrata",
  "stracciatella", "philadelphia", "crescenza", "robiola", "gelato", "kefir", "emmental", "groviera"
];
const UOVA = ["uova", "uovo", "albume", "tuorl", "frittat", "maionese", "pan di spagna", "meringa", "zabaione", "pasta all'uovo"];

export const ALLERGEN_EXCLUDE = {
  glutine: [
    "farina", "frumento", "grano", "semola", "semolino", "pane", "pangrattat",
    "grissini", "crostini", "pasta", "spaghett", "penne", "lasagn", "tortellin",
    "gnocch", "couscous", "cuscus", "bulgur", "orzo", "farro", "seitan", "malto",
    "birra", "besciamella", "fette biscottate", "biscott", "cracker"
  ],
  lattosio: LATTOSIO,
  uova: UOVA,
  "frutta a guscio": [
    "noci", "noce pecan", "mandorl", "nocciol", "pistacch", "pinol", "anacard",
    "macadamia", "castagn", "marron", "marzapane", "pasta di mandorl", "torrone", "pralin", "pesto"
  ],
  arachidi: ["arachid", "noccioline"],
  crostacei: CROSTACEI,
  molluschi: MOLLUSCHI,
  pesce: PESCE,
  soia: ["soia", "tofu", "edamame", "tempeh", "miso", "tamari"],
  sedano: ["sedano"],
  senape: ["senape", "mostarda"],
  sesamo: ["sesamo", "tahin", "gomasio"]
};

const CARNE = [
  "carne", "manzo", "vitell", "maial", "salsicc", "guancial", "pancett",
  "prosciutt", "speck", "bresaol", "salam", "mortadell", "wurstel", "pollo",
  "tacchin", "coniglio", "agnello", "abbacchio", "capretto", "anatra",
  "faraona", "strutto", "lardo", "brodo di carne", "gelatina", "ragu",
  "cotechino", "zampone", "chorizo", "porchetta", "nduja", "soppressat",
  "capocoll", "culatell", "lonza", "hamburger", "fegat", "trippa", "rognone",
  "cervella", "ciccioli", "pastrami", "speck", "carpaccio di manzo", "tartare"
];
const VEGETARIANO = [...CARNE, ...PESCE, ...CROSTACEI, ...MOLLUSCHI];
const VEGANO = [...new Set([...VEGETARIANO, ...LATTOSIO, ...UOVA, "miele", "cera d'api"])];

export const DIET_EXCLUDE = { vegetariano: VEGETARIANO, vegano: VEGANO };

// Mappa unica chip -> parole chiave da evitare.
const EXCLUDE = { ...ALLERGEN_EXCLUDE, ...DIET_EXCLUDE };

// ---- Parole aggiunte dall'utente ("Migliora il riconoscimento") ----
// Categorie modificabili (chiave -> etichetta) che l'utente può arricchire.
export const CUSTOM_CATS = [
  ["carne", "Carne e salumi"], ["pesce", "Pesce"], ["crostacei", "Crostacei"],
  ["molluschi", "Molluschi"], ["lattosio", "Latticini"], ["uova", "Uova"],
  ["glutine", "Glutine"], ["frutta a guscio", "Frutta a guscio"], ["arachidi", "Arachidi"],
  ["soia", "Soia"], ["sedano", "Sedano"], ["senape", "Senape"], ["sesamo", "Sesamo"]
];
const CUSTOM_KEY = "ricettario.dietTerms";
function readCustom() { try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "{}") || {}; } catch (e) { return {}; } }
export function getCustomTerms() { return readCustom(); }
export function addCustomTerm(cat, term) {
  const c = readCustom(); const t = (term || "").trim().toLowerCase();
  if (!t) return; c[cat] = [...new Set([...(c[cat] || []), t])];
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(c)); } catch (e) {}
}
export function removeCustomTerm(cat, term) {
  const c = readCustom(); c[cat] = (c[cat] || []).filter((x) => x !== term);
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(c)); } catch (e) {}
}

// Normalizza: minuscolo + accenti italiani semplificati (così "ragù"/"ragu"
// e "però"/"pero" combaciano).
function norm(s) {
  return (s || "").toLowerCase()
    .replace(/[àá]/g, "a").replace(/[èé]/g, "e").replace(/[ìí]/g, "i")
    .replace(/[òó]/g, "o").replace(/[ùú]/g, "u");
}

// Parole da evitare per un certo vincolo (chip), incluse quelle aggiunte
// dall'utente. Le diete "vegetariano"/"vegano" tirano dentro anche le categorie
// personalizzate carne/pesce/crostacei/molluschi (e latticini/uova per vegano).
function termsForTag(tag, c) {
  if (tag === "vegetariano") return [...DIET_EXCLUDE.vegetariano, ...(c.carne || []), ...(c.pesce || []), ...(c.crostacei || []), ...(c.molluschi || [])];
  if (tag === "vegano") return [...DIET_EXCLUDE.vegano, ...(c.carne || []), ...(c.pesce || []), ...(c.crostacei || []), ...(c.molluschi || []), ...(c.lattosio || []), ...(c.uova || [])];
  return [...(EXCLUDE[tag] || []), ...(c[tag] || [])];
}

// Parole da evitare per un singolo invitato (allergeni + diete; i "non graditi"
// sono trattati a parte come vincolo morbido).
export function avoidTermsFor(guest) {
  const c = readCustom();
  const out = new Set();
  for (const t of (guest.tags || [])) termsForTag(t, c).forEach((k) => out.add(k));
  return [...out];
}

// Verifica se una ricetta è adatta a tutti gli invitati.
// Ritorna { safe, hard:[{name,reason}], soft:[{name,term}] }:
//  - hard = allergene/dieta violati (la ricetta NON è sicura)
//  - soft = "non gradito" presente (sicura, ma sgradita a qualcuno)
export function checkRecipeForGuests(recipe, guests) {
  const ings = recipe.ingredients || [];
  const hay = " " + ings.map((it) => norm(it.name)).join(" | ") + " | " + norm(recipe.title) + " ";
  const tags = (recipe.allergens || []).map((x) => norm(x));
  // Rinforzo: reparto degli ingredienti (cattura carne/pesce/latticini anche
  // quando il nome esatto non è nelle liste, es. "macinato", "würstel").
  const hasMeatFish = ings.some((it) => categorize(it.name) === "Carne e pesce");
  const hasDairyEgg = ings.some((it) => categorize(it.name) === "Latticini e uova");
  const hard = [];
  const soft = [];
  for (const g of (guests || [])) {
    const who = g.name || "un invitato";
    const gtags = g.tags || [];
    let blocked = null;
    // 1) parole chiave negli ingredienti (liste integrate + personalizzate)
    for (const k of avoidTermsFor(g)) { if (hay.includes(norm(k))) { blocked = k; break; } }
    // 2) rete di sicurezza: tag allergene manuale sulla ricetta
    if (!blocked) {
      for (const t of gtags) {
        const label = ALLERGEN_TAG[t];
        if (label && tags.includes(norm(label))) { blocked = t; break; }
      }
    }
    // 3) rinforzo per le diete tramite il reparto degli ingredienti
    if (!blocked && gtags.includes("vegetariano") && hasMeatFish) blocked = "carne/pesce";
    if (!blocked && gtags.includes("vegano") && (hasMeatFish || hasDairyEgg)) blocked = hasMeatFish ? "carne/pesce" : "latticini/uova";
    if (blocked) hard.push({ name: who, reason: blocked });
    // 3) non graditi (morbido)
    for (const term of (g.dislikes || [])) {
      const t = norm(term);
      if (t && hay.includes(t)) soft.push({ name: who, term });
    }
  }
  return { safe: hard.length === 0, hard, soft };
}

// Riepilogo testuale dei vincoli degli invitati (per badge/messaggi).
export function guestsSummary(guests) {
  const counts = {};
  const dislikes = new Set();
  for (const g of (guests || [])) {
    for (const t of (g.tags || [])) counts[t] = (counts[t] || 0) + 1;
    for (const d of (g.dislikes || [])) dislikes.add(d);
  }
  const parts = [];
  for (const [k, n] of Object.entries(counts)) {
    if (k === "vegetariano" || k === "vegano") parts.push(`${n} ${k}`);
    else parts.push(`${n} senza ${k}`);
  }
  if (dislikes.size) parts.push("niente " + [...dislikes].join(", "));
  return parts.join(" · ");
}
