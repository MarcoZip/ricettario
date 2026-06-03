// Integrazione con TheMealDB — ricettario online gratuito (contenuti in inglese).
// Documentazione: https://www.themealdb.com/api.php   (chiave di test gratuita "1")

const BASE = "https://www.themealdb.com/api/json/v1/1";

// Fetch con timeout: se il servizio non risponde entro N secondi, interrompe
// (così la ricerca non "gira a vuoto" all'infinito su reti lente o bloccate).
async function fetchJson(url, timeoutMs = 9000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function normalize(meal) {
  if (!meal) return null;
  const link =
    (meal.strSource && meal.strSource.trim()) ||
    (meal.strYoutube && meal.strYoutube.trim()) ||
    `https://www.themealdb.com/meal/${meal.idMeal}`;
  // Ingredienti: strIngredient1..20 + strMeasure1..20 → righe "misura ingrediente".
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = (meal["strIngredient" + i] || "").trim();
    const meas = (meal["strMeasure" + i] || "").trim();
    if (ing) ingredients.push((meas ? meas + " " : "") + ing);
  }
  // Passi di preparazione (in inglese) da strInstructions.
  let steps = [];
  const instr = (meal.strInstructions || "").trim();
  if (instr) {
    steps = instr.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);
    if (steps.length <= 1) steps = instr.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
  }
  return {
    id: meal.idMeal,
    title: meal.strMeal,
    thumb: meal.strMealThumb,
    category: meal.strCategory || "",
    area: meal.strArea || "",
    link,
    ingredients, // righe di testo grezze (in inglese)
    steps
  };
}

export async function searchMeals(query) {
  const data = await fetchJson(`${BASE}/search.php?s=${encodeURIComponent(query)}`);
  return (data.meals || []).map(normalize).filter(Boolean);
}

export async function randomMeals(count = 6) {
  // L'endpoint random restituisce un piatto per volta: ne chiediamo alcuni.
  const calls = Array.from({ length: count }, () =>
    fetchJson(`${BASE}/random.php`).catch(() => null)
  );
  const results = await Promise.all(calls);
  const meals = results.map((d) => normalize(d && d.meals && d.meals[0])).filter(Boolean);
  // Rimuove eventuali duplicati per id.
  const seen = new Set();
  return meals.filter((m) => (seen.has(m.id) ? false : seen.add(m.id)));
}
