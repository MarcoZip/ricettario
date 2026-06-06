// Stima approssimativa del costo di una ricetta (prezzi medi indicativi €/kg,
// con peso a pezzo per gli ingredienti contati). È solo una stima di larga massima.

const UNIT_G = {
  g: 1, kg: 1000, hg: 100, mg: 0.001,
  ml: 1, l: 1000, cl: 10, dl: 100,
  cucchiai: 13, cucchiaini: 5, tazze: 200, bicchieri: 200,
  spicchi: 5, fette: 25, foglie: 1, rametti: 2, mazzetti: 25,
  pizzichi: 0.5, noci: 15, manciate: 30,
  scatole: 200, lattine: 200, barattoli: 230, confezioni: 250, bustine: 8, buste: 100, vasetti: 125,
  pezzi: null
};

// € per kg; pz = peso indicativo di un pezzo (g). Voci specifiche prima.
const PRICES = [
  { keys: ["olio"], kg: 7 },
  { keys: ["burro"], kg: 9 },
  { keys: ["farina"], kg: 1.2 },
  { keys: ["zucchero"], kg: 1.3 },
  { keys: ["sale"], kg: 0.6 },
  { keys: ["uova", "uovo"], kg: 4, pz: 55 },
  { keys: ["latte"], kg: 1.2 },
  { keys: ["panna"], kg: 6 },
  { keys: ["mascarpon"], kg: 9 },
  { keys: ["ricott"], kg: 5 },
  { keys: ["mozzarell"], kg: 9 },
  { keys: ["parmigian", "grana", "pecorin"], kg: 18 },
  { keys: ["yogurt"], kg: 3 },
  { keys: ["pasta", "spaghetti", "penne", "fusill", "lasagn"], kg: 1.8 },
  { keys: ["riso"], kg: 2.5 },
  { keys: ["pane", "pangrattat"], kg: 3 },
  { keys: ["pomodorin"], kg: 3 },
  { keys: ["pomodor", "passata", "pelati", "polpa"], kg: 1.8 },
  { keys: ["guancial", "pancett"], kg: 14 },
  { keys: ["prosciutt", "speck"], kg: 25 },
  { keys: ["salsicc", "macinat", "maiale"], kg: 9 },
  { keys: ["pollo", "tacchin", "petto"], kg: 9 },
  { keys: ["manzo", "vitell", "carne", "hamburger"], kg: 15 },
  { keys: ["tonno"], kg: 14 },
  { keys: ["salmon"], kg: 22 },
  { keys: ["gamber", "vongol", "cozze", "calamar", "pesce"], kg: 16 },
  { keys: ["patat"], kg: 1.2, pz: 150 },
  { keys: ["cipoll"], kg: 1.2, pz: 110 },
  { keys: ["aglio"], kg: 6, pz: 5 },
  { keys: ["carot"], kg: 1.5, pz: 70 },
  { keys: ["zucchin"], kg: 2.5, pz: 200 },
  { keys: ["melanzan"], kg: 2.5, pz: 250 },
  { keys: ["peperon"], kg: 3, pz: 150 },
  { keys: ["limon"], kg: 2.5, pz: 100 },
  { keys: ["insalat", "spinac", "funghi", "broccol", "verdura"], kg: 3 },
  { keys: ["mandorl", "noci", "pinol", "pistacch", "nocciol"], kg: 22 },
  { keys: ["cioccolat", "cacao"], kg: 12 },
  { keys: ["vino", "spumante"], kg: 5 },
  { keys: ["legumi", "ceci", "fagiol", "lenticchi", "pisell"], kg: 2.5 }
];

function findPrice(name) {
  const n = (name || "").toLowerCase();
  for (const p of PRICES) if (p.keys.some((k) => n.includes(k))) return p;
  return null;
}

function gramsOf(item, price) {
  const unit = item.unit || "";
  if (unit === "q.b.") return 0;
  if (unit && UNIT_G[unit] != null) return (item.qty != null ? item.qty : 1) * UNIT_G[unit];
  if (item.qty != null && price && price.pz) return item.qty * price.pz;
  return null;
}

// Ritorna { total (€), counted, total_n } stimando il costo dei vari ingredienti.
export function estimateCost(ingredients) {
  let total = 0, counted = 0, totalN = 0;
  for (const it of ingredients || []) {
    if (!it || !it.name) continue;
    totalN++;
    const price = findPrice(it.name);
    if (!price) continue;
    const g = gramsOf(it, price);
    if (g == null) continue;
    total += (g / 1000) * price.kg;
    counted++;
  }
  return { total: Math.round(total * 100) / 100, counted, total_n: totalN };
}
