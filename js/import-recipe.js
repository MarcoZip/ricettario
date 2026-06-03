// Import ingredienti/porzioni da un link di ricetta, tramite il Worker Cloudflare
// (vedi README). Il Worker legge i dati strutturati schema.org/Recipe della
// pagina e restituisce JSON pulito: { title, image, servings, ingredients[] }.

import { WORKER_URL } from "./config.js";

export async function importFromUrl(url) {
  if (!WORKER_URL) throw new Error("Import da link non configurato.");
  const endpoint = `${WORKER_URL}${WORKER_URL.includes("?") ? "&" : "?"}url=${encodeURIComponent(url)}`;
  const res = await fetch(endpoint);
  let data = null;
  try { data = await res.json(); } catch (e) { /* risposta non JSON */ }

  // Siti che bloccano la lettura automatica (sfida anti-bot).
  if (data && data.error === "blocked") {
    const e = new Error("Questo sito blocca la lettura automatica. Apri la ricetta dal link, poi copia gli ingredienti o usa \"Scansiona da una foto\".");
    e.code = "blocked";
    throw e;
  }
  if (!res.ok || !data) throw new Error("Impossibile leggere la ricetta dal link.");
  if (data.error === "notfound" || (!data.ingredients && !data.title)) {
    throw new Error("Nessuna ricetta trovata in questa pagina.");
  }
  return {
    title: data.title || "",
    image: data.image || "",
    servings: typeof data.servings === "number" ? data.servings : (parseInt(data.servings, 10) || null),
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
    steps: Array.isArray(data.steps) ? data.steps : []
  };
}
