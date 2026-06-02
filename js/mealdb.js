// Integrazione con TheMealDB — ricettario online gratuito (contenuti in inglese).
// Documentazione: https://www.themealdb.com/api.php   (chiave di test gratuita "1")

const BASE = "https://www.themealdb.com/api/json/v1/1";

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
  return {
    id: meal.idMeal,
    title: meal.strMeal,
    thumb: meal.strMealThumb,
    category: meal.strCategory || "",
    area: meal.strArea || "",
    link,
    ingredients // righe di testo grezze (in inglese)
  };
}

export async function searchMeals(query) {
  const url = `${BASE}/search.php?s=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Errore di rete");
  const data = await res.json();
  return (data.meals || []).map(normalize).filter(Boolean);
}

export async function randomMeals(count = 6) {
  // L'endpoint random restituisce un piatto per volta: ne chiediamo alcuni.
  const calls = Array.from({ length: count }, () =>
    fetch(`${BASE}/random.php`).then((r) => r.json()).catch(() => null)
  );
  const results = await Promise.all(calls);
  const meals = results.map((d) => normalize(d && d.meals && d.meals[0])).filter(Boolean);
  // Rimuove eventuali duplicati per id.
  const seen = new Set();
  return meals.filter((m) => (seen.has(m.id) ? false : seen.add(m.id)));
}
