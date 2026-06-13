// Conversione misure "estere" (USA/UK) in metrico, per le ricette importate in
// inglese. Aggiunge un'annotazione "(≈ X)" accanto alla misura originale, così
// non si perde il dato di partenza. Gestisce decimali e frazioni (1/2, ½, 1 1/2).

const UNI = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125, "⅜": 0.375 };

function parseNum(s) {
  s = (s || "").trim();
  if (UNI[s] != null) return UNI[s];
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/); // "1 1/2"
  if (m) return (+m[1]) + (+m[2] / +m[3]);
  m = s.match(/^(\d+)\/(\d+)$/); // "1/2"
  if (m) return (+m[1]) / (+m[2]);
  return parseFloat(s.replace(",", "."));
}

const NUM = "(\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?|[½¼¾⅓⅔⅛⅜])";

// Ordine importante: "fl oz" prima di "oz", "fluid ounces" prima di "ounces".
const CONV = [
  { u: "(?:cups?)", f: (n) => `${Math.round(n * 240)} ml` },
  { u: "(?:tablespoons?|tbsp|tbs)", f: (n) => `${Math.round(n * 15)} ml` },
  { u: "(?:teaspoons?|tsp)", f: (n) => `${Math.round(n * 5)} ml` },
  { u: "(?:fl\\.?\\s*oz|fluid ounces?)", f: (n) => `${Math.round(n * 30)} ml` },
  { u: "(?:ounces?|oz)", f: (n) => `${Math.round(n * 28)} g` },
  { u: "(?:pounds?|lbs?)", f: (n) => `${Math.round(n * 454)} g` }
];

export function convertMeasures(text) {
  if (!text) return text;
  let s = String(text);
  for (const c of CONV) {
    const re = new RegExp(NUM + "\\s*" + c.u + "\\b", "gi");
    s = s.replace(re, (m, num) => { const v = parseNum(num); return isFinite(v) ? `${m.trim()} (≈ ${c.f(v)})` : m; });
  }
  // Temperatura in Fahrenheit -> Celsius.
  s = s.replace(new RegExp(NUM + "\\s*°?\\s*F\\b", "g"), (m, num) => {
    const v = parseNum(num);
    return isFinite(v) ? `${m.trim()} (≈ ${Math.round((v - 32) * 5 / 9)} °C)` : m;
  });
  return s;
}
