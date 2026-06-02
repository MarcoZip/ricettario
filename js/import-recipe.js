// Import ingredienti/porzioni da un link di ricetta, tramite il Worker Cloudflare
// (vedi README). Il Worker legge i dati strutturati schema.org/Recipe della
// pagina e restituisce JSON pulito: { title, image, servings, ingredients[] }.

import { WORKER_URL } from "./config.js";

export async function importFromUrl(url) {
  if (!WORKER_URL) throw new Error("Import da link non configurato.");
  const endpoint = `${WORKER_URL}${WORKER_URL.includes("?") ? "&" : "?"}url=${encodeURIComponent(url)}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("Impossibile leggere la ricetta dal link.");
  const data = await res.json();
  if (!data || (!data.ingredients && !data.title)) {
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
