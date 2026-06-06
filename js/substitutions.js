// Sostituzioni comuni in cucina (suggerimenti, non dosi precise).
export const SUBSTITUTIONS = [
  { keys: ["burro"], sub: "olio (¾ della quantità) o margarina" },
  { keys: ["latte di", "latte vegetale"], sub: "latte vaccino" },
  { keys: ["latte"], sub: "latte vegetale (soia, avena, mandorla)" },
  { keys: ["panna"], sub: "yogurt greco o latte evaporato" },
  { keys: ["uova", "uovo"], sub: "per i dolci: ½ banana schiacciata o 60 g di yogurt per uovo" },
  { keys: ["zucchero a velo"], sub: "zucchero frullato fine" },
  { keys: ["zucchero"], sub: "miele (¾ della quantità) o dolcificante" },
  { keys: ["farina integrale"], sub: "farina 00" },
  { keys: ["farina"], sub: "farina integrale o mix senza glutine" },
  { keys: ["lievito"], sub: "1 cucchiaino di bicarbonato + succo di limone" },
  { keys: ["pangrattat"], sub: "fiocchi d'avena tritati o mandorle in polvere" },
  { keys: ["parmigian", "grana"], sub: "pecorino o lievito alimentare (vegano)" },
  { keys: ["mascarpon"], sub: "ricotta con un po' di panna" },
  { keys: ["ricott"], sub: "fiocchi di latte frullati" },
  { keys: ["vino bianco"], sub: "brodo + un goccio di aceto" },
  { keys: ["vino rosso"], sub: "brodo + aceto balsamico" },
  { keys: ["aceto"], sub: "succo di limone" },
  { keys: ["scalogno"], sub: "cipolla o porro" },
  { keys: ["yogurt"], sub: "panna acida o latticello" },
  { keys: ["maizena", "amido"], sub: "farina (doppia quantità)" },
  { keys: ["cipoll"], sub: "porro o scalogno" },
  { keys: ["basilico"], sub: "prezzemolo o pesto pronto" },
  { keys: ["limon"], sub: "lime o aceto" },
  { keys: ["passata", "pelati"], sub: "concentrato di pomodoro diluito" }
];

export function findSubstitutions(ingredients) {
  const out = [];
  const used = new Set();
  for (const it of ingredients || []) {
    const n = (it.name || "").toLowerCase();
    if (!n) continue;
    for (const s of SUBSTITUTIONS) {
      if (s.keys.some((k) => n.includes(k)) && !used.has(s.sub)) {
        out.push({ name: it.name, sub: s.sub });
        used.add(s.sub);
        break;
      }
    }
  }
  return out;
}
