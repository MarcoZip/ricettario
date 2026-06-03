// Stima dei valori nutrizionali di una ricetta a partire dagli ingredienti.
// Usa una tabella offline di alimenti comuni italiani (valori per 100 g) e,
// per ciò che non riconosce, un fallback online su Open Food Facts.
// È una STIMA: le quantità "q.b." e i pesi a pezzo sono approssimati.

// Tabella alimenti: per 100 g → { kcal, p (proteine), c (carboidrati), f (grassi) }.
// "pz" = peso indicativo di un pezzo intero (per "2 uova", "1 cipolla"…).
// L'ordine conta: le voci più specifiche vanno prima di quelle generiche.
const FOODS = [
  // --- Aggiunte (voci specifiche: vanno prima delle generiche) ---
  { keys: ["prosciutto cotto"], kcal: 215, p: 20, c: 1, f: 14 },
  { keys: ["mortadella"], kcal: 288, p: 15, c: 1, f: 25 },
  { keys: ["salame"], kcal: 425, p: 26, c: 1, f: 35 },
  { keys: ["coppa"], kcal: 400, p: 24, c: 0, f: 33 },
  { keys: ["latte di mandorla", "latte di soia", "latte di avena", "latte di riso", "latte vegetale"], kcal: 40, p: 1, c: 5, f: 1.5 },
  { keys: ["tofu"], kcal: 76, p: 8, c: 2, f: 5 },
  { keys: ["seitan"], kcal: 121, p: 24, c: 4, f: 1 },
  { keys: ["besciamella"], kcal: 130, p: 4, c: 9, f: 8 },
  { keys: ["maionese"], kcal: 680, p: 1, c: 2, f: 75 },
  { keys: ["ketchup"], kcal: 100, p: 1, c: 24, f: 0.1 },
  { keys: ["senape"], kcal: 100, p: 6, c: 6, f: 6 },
  { keys: ["pesto"], kcal: 450, p: 5, c: 6, f: 45 },
  { keys: ["salsa di soia"], kcal: 60, p: 8, c: 6, f: 0.1 },
  { keys: ["olive"], kcal: 145, p: 1, c: 4, f: 15 },
  { keys: ["capperi"], kcal: 23, p: 2, c: 5, f: 0.1 },
  { keys: ["nutella", "crema spalmabile"], kcal: 539, p: 6, c: 57, f: 31 },
  { keys: ["gelato"], kcal: 207, p: 4, c: 24, f: 11 },
  { keys: ["savoiardi"], kcal: 390, p: 8, c: 70, f: 8 },
  { keys: ["biscotti", "biscott"], kcal: 430, p: 7, c: 70, f: 14 },
  { keys: ["pasta sfoglia", "sfoglia"], kcal: 380, p: 6, c: 36, f: 24 },
  { keys: ["pan di spagna"], kcal: 300, p: 7, c: 50, f: 8 },
  { keys: ["couscous", "cous cous"], kcal: 150, p: 5, c: 30, f: 0.5 },
  { keys: ["farro"], kcal: 340, p: 12, c: 70, f: 2 },
  { keys: ["orzo"], kcal: 320, p: 10, c: 70, f: 1.5 },
  { keys: ["polenta"], kcal: 85, p: 2, c: 18, f: 0.4 },
  { keys: ["pistacch"], kcal: 562, p: 20, c: 28, f: 45 },
  { keys: ["arachidi"], kcal: 567, p: 26, c: 16, f: 49 },
  { keys: ["anacardi"], kcal: 553, p: 18, c: 30, f: 44 },
  { keys: ["uvetta", "uva passa", "uva sultanina"], kcal: 299, p: 3, c: 79, f: 0.5 },
  { keys: ["zenzero"], kcal: 80, p: 1.8, c: 18, f: 0.8 },
  { keys: ["asparag"], kcal: 20, p: 2, c: 4, f: 0.1 },
  { keys: ["carciof"], kcal: 47, p: 3, c: 10, f: 0.2, pz: 130 },
  { keys: ["biet", "coste"], kcal: 19, p: 1.8, c: 3, f: 0.2 },
  { keys: ["verza", "cavolo nero", "cavolo verza"], kcal: 27, p: 2, c: 5, f: 0.2 },
  { keys: ["kiwi"], kcal: 61, p: 1, c: 15, f: 0.5, pz: 90 },
  { keys: ["ananas"], kcal: 50, p: 0.5, c: 13, f: 0.1 },
  { keys: ["melone"], kcal: 34, p: 0.8, c: 8, f: 0.2 },
  { keys: ["anguria", "cocomero"], kcal: 30, p: 0.6, c: 8, f: 0.2 },

  // --- Dispensa / basi ---
  { keys: ["farina integrale"], kcal: 340, p: 13, c: 72, f: 2 },
  { keys: ["farina", "00", "semola"], kcal: 364, p: 10, c: 76, f: 1 },
  { keys: ["zucchero a velo", "zucchero"], kcal: 400, p: 0, c: 100, f: 0 },
  { keys: ["sale"], kcal: 0, p: 0, c: 0, f: 0 },
  { keys: ["olio"], kcal: 884, p: 0, c: 0, f: 100 },
  { keys: ["burro"], kcal: 758, p: 0.8, c: 0.8, f: 83 },
  { keys: ["margarina"], kcal: 720, p: 0, c: 0, f: 80 },
  { keys: ["riso"], kcal: 358, p: 7, c: 80, f: 0.6 },
  { keys: ["pasta", "spaghetti", "penne", "maccheron", "fusill", "lasagn", "tortellin", "gnocch"], kcal: 359, p: 13, c: 74, f: 1.5 },
  { keys: ["pangrattat"], kcal: 350, p: 12, c: 72, f: 5 },
  { keys: ["pane", "baguette", "piadin", "crostin", "grissin"], kcal: 271, p: 9, c: 50, f: 3 },
  { keys: ["lievito"], kcal: 105, p: 13, c: 12, f: 1 },
  { keys: ["maizena", "amido", "fecola"], kcal: 380, p: 0.3, c: 91, f: 0 },
  { keys: ["cacao"], kcal: 228, p: 20, c: 58, f: 14 },
  { keys: ["cioccolat"], kcal: 546, p: 5, c: 60, f: 31 },
  { keys: ["miele"], kcal: 304, p: 0, c: 82, f: 0 },
  { keys: ["marmellat", "confettur"], kcal: 250, p: 0.5, c: 60, f: 0.1 },
  { keys: ["passata", "pelati", "polpa di pomodoro", "polpa"], kcal: 32, p: 1.5, c: 6, f: 0.2 },
  { keys: ["concentrato"], kcal: 90, p: 5, c: 16, f: 0.5 },
  { keys: ["brodo", "dado"], kcal: 8, p: 1, c: 0.5, f: 0.3 },
  { keys: ["aceto"], kcal: 20, p: 0, c: 0.6, f: 0 },
  { keys: ["vino", "spumante", "prosecco"], kcal: 70, p: 0, c: 0.6, f: 0 },
  { keys: ["pepe", "spezi", "cannella", "noce moscata", "origano", "peperoncin", "curry", "paprika", "zafferano", "vaniglia"], kcal: 0, p: 0, c: 0, f: 0 },

  // --- Frutta secca / semi ---
  { keys: ["mandorl"], kcal: 579, p: 21, c: 22, f: 49 },
  { keys: ["nocciol"], kcal: 628, p: 15, c: 17, f: 61 },
  { keys: ["pinol"], kcal: 673, p: 14, c: 13, f: 68 },
  { keys: ["noci", "noce"], kcal: 654, p: 15, c: 14, f: 65 },
  { keys: ["cocco"], kcal: 354, p: 3, c: 15, f: 33 },

  // --- Latticini e uova ---
  { keys: ["uova", "uovo"], kcal: 143, p: 13, c: 1, f: 10, pz: 55 },
  { keys: ["latte"], kcal: 64, p: 3.3, c: 5, f: 3.6 },
  { keys: ["panna"], kcal: 337, p: 2.3, c: 3, f: 35 },
  { keys: ["yogurt"], kcal: 61, p: 3.5, c: 5, f: 3.3 },
  { keys: ["parmigian", "grana", "pecorin"], kcal: 392, p: 33, c: 0, f: 29 },
  { keys: ["mozzarell"], kcal: 253, p: 18, c: 1, f: 19 },
  { keys: ["ricott"], kcal: 146, p: 8, c: 3, f: 11 },
  { keys: ["mascarpon"], kcal: 450, p: 4, c: 4, f: 47 },
  { keys: ["gorgonzol", "fontina", "scamorz", "stracchin", "philadelphia", "formagg"], kcal: 350, p: 22, c: 2, f: 28 },

  // --- Carne ---
  { keys: ["guancial"], kcal: 655, p: 8, c: 0, f: 70 },
  { keys: ["pancett"], kcal: 458, p: 12, c: 0, f: 45 },
  { keys: ["prosciutt", "speck"], kcal: 268, p: 25, c: 0, f: 18 },
  { keys: ["bresaol"], kcal: 150, p: 32, c: 0, f: 2 },
  { keys: ["salsicc", "wurstel", "würstel"], kcal: 300, p: 15, c: 1, f: 26 },
  { keys: ["macinat", "hamburger"], kcal: 250, p: 26, c: 0, f: 15 },
  { keys: ["pollo", "tacchin", "petto"], kcal: 110, p: 23, c: 0, f: 1.5 },
  { keys: ["maial"], kcal: 242, p: 27, c: 0, f: 14 },
  { keys: ["vitell", "manzo", "carne"], kcal: 220, p: 26, c: 0, f: 13 },

  // --- Pesce ---
  { keys: ["tonno"], kcal: 190, p: 25, c: 0, f: 10 },
  { keys: ["salmon"], kcal: 208, p: 20, c: 0, f: 13 },
  { keys: ["gamber"], kcal: 85, p: 18, c: 0, f: 1 },
  { keys: ["merluzz", "baccal"], kcal: 82, p: 18, c: 0, f: 0.7 },
  { keys: ["acciug", "alici"], kcal: 130, p: 20, c: 0, f: 5 },
  { keys: ["vongol", "cozze", "calamar", "seppi", "polpo", "pesce"], kcal: 90, p: 16, c: 1, f: 2 },

  // --- Legumi ---
  { keys: ["ceci"], kcal: 130, p: 7, c: 20, f: 2 },
  { keys: ["lenticchi"], kcal: 116, p: 9, c: 20, f: 0.4 },
  { keys: ["fagiol", "legumi"], kcal: 120, p: 8, c: 21, f: 0.5 },
  { keys: ["pisell"], kcal: 81, p: 5, c: 14, f: 0.4 },

  // --- Verdura ---
  { keys: ["pomodorin"], kcal: 18, p: 1, c: 3, f: 0.2 },
  { keys: ["pomodor"], kcal: 18, p: 1, c: 3, f: 0.2, pz: 120 },
  { keys: ["cipoll"], kcal: 28, p: 1, c: 6, f: 0.1, pz: 110 },
  { keys: ["aglio"], kcal: 41, p: 2, c: 9, f: 0.2, pz: 5 },
  { keys: ["carot"], kcal: 35, p: 0.9, c: 8, f: 0.2, pz: 70 },
  { keys: ["zucchin"], kcal: 17, p: 1.3, c: 3, f: 0.3, pz: 200 },
  { keys: ["zucca"], kcal: 26, p: 1, c: 6, f: 0.1 },
  { keys: ["patat"], kcal: 77, p: 2, c: 17, f: 0.1, pz: 150 },
  { keys: ["melanzan"], kcal: 18, p: 1, c: 4, f: 0.2, pz: 250 },
  { keys: ["peperon"], kcal: 22, p: 0.9, c: 5, f: 0.2, pz: 150 },
  { keys: ["spinac"], kcal: 23, p: 2.8, c: 1, f: 0.4 },
  { keys: ["fungh"], kcal: 22, p: 3, c: 1, f: 0.3 },
  { keys: ["broccol", "cavolfior", "cavol"], kcal: 34, p: 2.8, c: 5, f: 0.4 },
  { keys: ["fagiolin"], kcal: 31, p: 1.8, c: 5, f: 0.1 },
  { keys: ["insalat", "lattug", "rucol", "radicchi"], kcal: 15, p: 1.3, c: 2, f: 0.2 },
  { keys: ["sedano"], kcal: 16, p: 0.7, c: 3, f: 0.2 },
  { keys: ["finocchi"], kcal: 31, p: 1.2, c: 7, f: 0.2, pz: 200 },
  { keys: ["porro"], kcal: 61, p: 1.5, c: 14, f: 0.3 },
  { keys: ["prezzemol", "basilic", "rosmarin", "salvia", "menta", "erba", "timo"], kcal: 30, p: 3, c: 4, f: 0.6 },

  // --- Frutta ---
  { keys: ["limon"], kcal: 29, p: 1, c: 9, f: 0.3, pz: 100 },
  { keys: ["aranc"], kcal: 47, p: 0.9, c: 12, f: 0.1, pz: 150 },
  { keys: ["mela", "mele"], kcal: 52, p: 0.3, c: 14, f: 0.2, pz: 150 },
  { keys: ["banan"], kcal: 89, p: 1.1, c: 23, f: 0.3, pz: 120 },
  { keys: ["fragol"], kcal: 32, p: 0.7, c: 8, f: 0.3 },
  { keys: ["pera", "pere"], kcal: 57, p: 0.4, c: 15, f: 0.1, pz: 170 },
  { keys: ["uva"], kcal: 69, p: 0.7, c: 18, f: 0.2 },
  { keys: ["pesca", "pesche", "albicocc", "prugn", "ciliegi", "frutta"], kcal: 45, p: 0.9, c: 11, f: 0.2 }
];

// Unità → grammi (i liquidi: 1 ml ≈ 1 g). null = serve il peso a pezzo.
const UNIT_G = {
  g: 1, kg: 1000, hg: 100, mg: 0.001,
  ml: 1, l: 1000, cl: 10, dl: 100,
  cucchiai: 13, cucchiaini: 5,
  tazze: 200, bicchieri: 200,
  spicchi: 5, fette: 25, foglie: 1, rametti: 2, mazzetti: 25,
  pizzichi: 0.5, noci: 15, manciate: 30,
  scatole: 200, lattine: 200, barattoli: 230, confezioni: 250,
  bustine: 8, buste: 100, vasetti: 125,
  pezzi: null
};

function findFood(name) {
  const n = (name || "").toLowerCase();
  for (const food of FOODS) {
    if (food.keys.some((k) => n.includes(k))) return food;
  }
  return null;
}

// Grammi di un ingrediente, indipendentemente dal fatto che sia in tabella.
// Ritorna null se non è possibile stimarli.
function gramsOf(item, food) {
  const unit = item.unit || "";
  if (unit === "q.b.") return 0; // "quanto basta" → trascurabile
  if (unit && UNIT_G[unit] != null) {
    return (item.qty != null ? item.qty : 1) * UNIT_G[unit];
  }
  // niente unità: è un conteggio di pezzi (es. "2 uova", "1 cipolla")
  if (item.qty != null && food && food.pz) return item.qty * food.pz;
  if (item.unit === "pezzi" && item.qty != null && food && food.pz) return item.qty * food.pz;
  return null;
}

function addMacros(total, food, grams) {
  const k = grams / 100;
  total.kcal += food.kcal * k;
  total.p += food.p * k;
  total.c += food.c * k;
  total.f += food.f * k;
}

// Stima OFFLINE: ritorna i totali per l'intera ricetta + il dettaglio per riga.
// items[] = { skip:true|false, reason, offCandidate:bool, grams, ... }
export function estimateNutrition(ingredients) {
  const total = { kcal: 0, p: 0, c: 0, f: 0 };
  let used = 0;
  const skipped = []; // { name, reason }
  const offCandidates = []; // { index, name, grams } da cercare online

  (ingredients || []).forEach((it, index) => {
    if (!it || !it.name) return;
    const food = findFood(it.name);
    const grams = gramsOf(it, food);
    if (food && grams != null) {
      if (grams > 0) { addMacros(total, food, grams); used++; }
      else used++; // q.b. riconosciuto ma trascurabile
    } else if (food && grams == null) {
      skipped.push({ name: it.name, reason: "quantità non chiara" });
    } else if (!food && grams != null && grams > 0) {
      offCandidates.push({ index, name: it.name, grams });
      skipped.push({ name: it.name, reason: "non in tabella" });
    } else {
      skipped.push({ name: it.name, reason: "non riconosciuto" });
    }
  });

  round(total);
  return { total, used, skipped, offCandidates };
}

function round(t) {
  t.kcal = Math.round(t.kcal);
  t.p = Math.round(t.p);
  t.c = Math.round(t.c);
  t.f = Math.round(t.f);
}

// Cerca un alimento su Open Food Facts e ritorna i valori per 100 g, o null.
export async function lookupOFF(name) {
  const url = "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" +
    encodeURIComponent(name) +
    "&search_simple=1&action=process&json=1&page_size=1&fields=product_name,nutriments";
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("OFF non raggiungibile");
  const j = await res.json();
  const p = j.products && j.products[0];
  const n = p && p.nutriments;
  if (!n) return null;
  let kcal = n["energy-kcal_100g"];
  if (kcal == null && n.energy_100g != null) kcal = n.energy_100g / 4.184; // kJ→kcal
  if (kcal == null) return null;
  return {
    kcal: Number(kcal) || 0,
    p: Number(n.proteins_100g) || 0,
    c: Number(n.carbohydrates_100g) || 0,
    f: Number(n.fat_100g) || 0
  };
}

// Arricchisce una stima offline cercando online gli ingredienti mancanti che
// hanno un peso noto. onProgress(fatti, totali) per la UI.
export async function enrichWithOFF(base, onProgress) {
  const total = { ...base.total };
  let used = base.used;
  const stillMissing = [];
  const cands = base.offCandidates || [];
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i];
    if (onProgress) onProgress(i, cands.length);
    try {
      const food = await lookupOFF(c.name);
      if (food && food.kcal) { addMacros(total, food, c.grams); used++; }
      else stillMissing.push(c.name);
    } catch (e) {
      stillMissing.push(c.name);
    }
  }
  if (onProgress) onProgress(cands.length, cands.length);
  round(total);
  return { total, used, stillMissing };
}
