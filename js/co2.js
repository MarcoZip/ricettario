// Stima (molto indicativa) dell'impatto ambientale di una ricetta, in base agli
// ingredienti. Fattori aggregati di kg CO2e per kg di alimento, ispirati allo
// studio Poore & Nemecek (2018). NON è un dato preciso: serve solo a dare
// un'idea e a suggerire scambi a minore impatto.

const FACTORS = [
  { keys: ["manzo", "bovino", "vitello", "hamburger", "bistecc", "brasato", "ossobuco", "spezzatino"], f: 60 },
  { keys: ["agnello", "montone", "capretto"], f: 24 },
  { keys: ["cioccolat", "cacao"], f: 19 },
  { keys: ["parmigiano", "pecorino", "grana", "formaggio", "mozzarella", "gorgonzola", "provola", "stracchino", "mascarpone", "ricotta", "caciocavallo", "fontina", "brie"], f: 21 },
  { keys: ["caffè", "caffe"], f: 17 },
  { keys: ["gambero", "scampi", "crostace", "mazzancoll"], f: 12 },
  { keys: ["maiale", "suino", "pancetta", "guanciale", "salsiccia", "prosciutto", "speck", "salame", "mortadella", "wurstel", "cotechino"], f: 7 },
  { keys: ["pollo", "tacchino", "pollame", "faraona", "cappone"], f: 6 },
  { keys: ["pesce", "tonno", "salmone", "merluzzo", "orata", "branzino", "sgombro", "acciug", "alici", "sardin", "platessa", "nasello"], f: 5 },
  { keys: ["uovo", "uova", "tuorlo", "albume"], f: 4.5 },
  { keys: ["riso"], f: 4 },
  { keys: ["latte", "panna", "yogurt", "burro"], f: 3 },
  { keys: ["olio", "oliva"], f: 3 },
  { keys: ["noci", "mandorl", "nocciol", "pistacch", "anacard", "frutta secca"], f: 2.3 },
  { keys: ["pasta", "pane", "farina", "cereal", "couscous", "orzo", "avena", "polenta", "gnocch", "pizza", "semola"], f: 1.4 },
  { keys: ["legumi", "lenticchi", "ceci", "fagiol", "pisell", "fave", "soia", "tofu", "seitan", "edamame"], f: 0.9 },
  { keys: ["frutta", "mela", "pera", "banana", "aranc", "limon", "fragol", "pesca", "uva", "kiwi", "melone", "angur", "albicocc"], f: 0.7 },
  { keys: ["verdur", "zucchin", "pomodor", "insalat", "spinaci", "carota", "cipolla", "patata", "melanzan", "peperon", "broccol", "cavol", "funghi", "zucca", "finocch", "sedano", "aglio", "basilico", "prezzemolo"], f: 0.5 }
];

export function estimateImpact(ingredients) {
  const cats = new Set();
  let score = 0, worst = null;
  (ingredients || []).forEach((it) => {
    const n = (it && it.name ? it.name : "").toLowerCase();
    if (!n) return;
    const hit = FACTORS.find((f) => f.keys.some((k) => n.includes(k)));
    if (hit && !cats.has(hit)) {
      cats.add(hit);
      score += hit.f;
      if (!worst || hit.f > worst.f) worst = { f: hit.f, name: it.name };
    }
  });
  if (!cats.size) return null;
  let level, emoji;
  if (score >= 40) { level = "Alto"; emoji = "🔴"; }
  else if (score >= 12) { level = "Medio"; emoji = "🟠"; }
  else { level = "Basso"; emoji = "🌱"; }
  let tip = "";
  if (level !== "Basso" && worst && worst.f >= 6) tip = `Per alleggerirlo puoi ridurre ${worst.name.toLowerCase()} e aggiungere legumi o verdure.`;
  return { level, emoji, tip };
}
