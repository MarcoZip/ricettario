// Import ingredienti/porzioni da un link di ricetta, tramite il Worker Cloudflare
// (vedi README). Il Worker legge i dati strutturati schema.org/Recipe della
// pagina e restituisce JSON pulito: { title, image, servings, ingredients[] }.

import { WORKER_URL } from "./config.js";

// Ricerca diretta su GialloZafferano (italiano): ritorna [{ title, url }].
export async function searchGz(query) {
  if (!WORKER_URL || !query.trim()) return [];
  const res = await fetch(`${WORKER_URL}/searchgz?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  return Array.isArray(d.results) ? d.results : [];
}

// Analisi della foto del piatto: invia l'immagine (base64) al Worker, che
// chiede a un'AI di visione un breve parere in italiano su come sembra venuto.
// `image` è una base64 (con o senza prefisso data:). Ritorna il testo o lancia.
export async function analyzeDishPhoto(image, title) {
  if (!WORKER_URL) throw new Error("Funzione non disponibile (worker non configurato).");
  let res;
  try {
    res = await fetch(`${WORKER_URL}/vision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, title: title || "" })
    });
  } catch (e) { throw new Error("Servizio non raggiungibile. Controlla la connessione."); }
  const d = await res.json().catch(() => ({}));
  if (d && d.feedback) return d.feedback;
  if (d && d.error === "noai") throw new Error("La funzione non è ancora attiva sul worker (manca il collegamento all'AI).");
  throw new Error((d && d.message) || "Analisi non riuscita. Riprova.");
}

// "Chiedi allo chef": domanda di cucina → risposta in italiano (Workers AI).
export async function askChef(question, context) {
  if (!WORKER_URL) throw new Error("Funzione non disponibile (worker non configurato).");
  let res;
  try {
    res = await fetch(`${WORKER_URL}/ask`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, ...(context || {}) })
    });
  } catch (e) { throw new Error("Servizio non raggiungibile. Controlla la connessione."); }
  const d = await res.json().catch(() => ({}));
  if (d && d.answer) return d.answer;
  if (d && d.error === "noai") throw new Error("La funzione non è ancora attiva sul worker (manca il collegamento all'AI).");
  throw new Error((d && d.message) || "Nessuna risposta. Riprova.");
}

// "Inventa una ricetta" dagli ingredienti → { title, servings, ingredients[], steps[] }.
export async function generateRecipe(ingredients, note) {
  if (!WORKER_URL) throw new Error("Funzione non disponibile (worker non configurato).");
  let res;
  try {
    res = await fetch(`${WORKER_URL}/generate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients, note: note || "" })
    });
  } catch (e) { throw new Error("Servizio non raggiungibile. Controlla la connessione."); }
  const d = await res.json().catch(() => ({}));
  if (d && d.title) return d;
  if (d && d.error === "noai") throw new Error("La funzione non è ancora attiva sul worker (manca il collegamento all'AI).");
  throw new Error((d && d.message) || "Non sono riuscito a creare la ricetta. Riprova.");
}

// "Fotografa una ricetta": dal testo OCR di una pagina → ricetta strutturata.
export async function structureRecipeText(text) {
  if (!WORKER_URL) throw new Error("Funzione non disponibile (worker non configurato).");
  let res;
  try {
    res = await fetch(`${WORKER_URL}/structure`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text || "" })
    });
  } catch (e) { throw new Error("Servizio non raggiungibile. Controlla la connessione."); }
  const d = await res.json().catch(() => ({}));
  if (d && (Array.isArray(d.ingredients) && d.ingredients.length || Array.isArray(d.steps) && d.steps.length)) return d;
  if (d && d.error === "noai") throw new Error("La funzione non è ancora attiva sul worker (manca il collegamento all'AI).");
  throw new Error((d && d.message) || "Non sono riuscito a leggere la ricetta dalla foto. Riprova.");
}

// "Riconosci il piatto da foto": immagine → nome del piatto.
export async function dishNameFromPhoto(dataUrl) {
  if (!WORKER_URL) throw new Error("Funzione non disponibile (worker non configurato).");
  let res;
  try {
    res = await fetch(`${WORKER_URL}/dishname`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl || "" })
    });
  } catch (e) { throw new Error("Servizio non raggiungibile. Controlla la connessione."); }
  const d = await res.json().catch(() => ({}));
  if (d && d.name) return d.name;
  if (d && d.error === "noai") throw new Error("La funzione non è ancora attiva sul worker (manca il collegamento all'AI).");
  throw new Error((d && d.message) || "Non ho riconosciuto il piatto. Riprova.");
}

// Import da link video social (o testo incollato) → ricetta strutturata.
export async function importFromVideo(url, text) {
  if (!WORKER_URL) throw new Error("Funzione non disponibile (worker non configurato).");
  let res;
  try {
    res = await fetch(`${WORKER_URL}/importvideo`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url || "", text: text || "" })
    });
  } catch (e) { throw new Error("Servizio non raggiungibile. Controlla la connessione."); }
  const d = await res.json().catch(() => ({}));
  if (d && d.title) return d;
  if (d && d.error === "noai") throw new Error("La funzione non è ancora attiva sul worker (manca il collegamento all'AI).");
  const err = new Error((d && d.message) || "Import non riuscito. Riprova.");
  err.code = d && d.error;
  throw err;
}

// "Modalità robot": converte una ricetta in programma per Companion o Bimby.
export async function robotProgram(recipe, device) {
  if (!WORKER_URL) throw new Error("Funzione non disponibile (worker non configurato).");
  let res;
  try {
    res = await fetch(`${WORKER_URL}/robot`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: recipe.title, ingredients: recipe.ingredients || [], steps: recipe.steps || [], device })
    });
  } catch (e) { throw new Error("Servizio non raggiungibile. Controlla la connessione."); }
  const d = await res.json().catch(() => ({}));
  if (d && Array.isArray(d.steps) && d.steps.length) return d;
  if (d && d.error === "noai") throw new Error("La funzione non è ancora attiva sul worker (manca il collegamento all'AI).");
  throw new Error((d && d.message) || "Non sono riuscito a creare il programma. Riprova.");
}

// "Fotografa il frigo": l'AI elenca gli alimenti visibili in una foto.
export async function fridgeIngredients(image) {
  if (!WORKER_URL) throw new Error("Funzione non disponibile (worker non configurato).");
  let res;
  try {
    res = await fetch(`${WORKER_URL}/fridge`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image })
    });
  } catch (e) { throw new Error("Servizio non raggiungibile. Controlla la connessione."); }
  const d = await res.json().catch(() => ({}));
  if (d && Array.isArray(d.ingredients) && d.ingredients.length) return d.ingredients;
  if (d && d.error === "noai") throw new Error("La funzione non è ancora attiva sul worker (manca il collegamento all'AI).");
  throw new Error((d && d.message) || "Non ho riconosciuto alimenti. Riprova.");
}

// Pianificatore settimanale AI: dai titoli → 7 giorni { pranzo?, cena }.
export async function planWeekAI(titles, includeLunch, expiring) {
  if (!WORKER_URL) throw new Error("Funzione non disponibile (worker non configurato).");
  let res;
  try {
    res = await fetch(`${WORKER_URL}/planweek`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titles, includeLunch: !!includeLunch, expiring: expiring || [] })
    });
  } catch (e) { throw new Error("Servizio non raggiungibile. Controlla la connessione."); }
  const d = await res.json().catch(() => ({}));
  if (d && Array.isArray(d.days) && d.days.length) return d.days;
  if (d && d.error === "noai") throw new Error("La funzione non è ancora attiva sul worker (manca il collegamento all'AI).");
  throw new Error((d && d.message) || "Non sono riuscito a creare il menù. Riprova.");
}

// "Adatta la ricetta" a una dieta (vegano/leggero…) → ricetta riscritta dall'AI.
export async function convertRecipe(recipe, diet) {
  if (!WORKER_URL) throw new Error("Funzione non disponibile (worker non configurato).");
  let res;
  try {
    res = await fetch(`${WORKER_URL}/convert`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: recipe.title, ingredients: recipe.ingredients || [], steps: recipe.steps || [], diet })
    });
  } catch (e) { throw new Error("Servizio non raggiungibile. Controlla la connessione."); }
  const d = await res.json().catch(() => ({}));
  if (d && d.title) return d;
  if (d && d.error === "noai") throw new Error("La funzione non è ancora attiva sul worker (manca il collegamento all'AI).");
  throw new Error((d && d.message) || "Non sono riuscito ad adattare la ricetta. Riprova.");
}

// "Chiedi a Fornelli": domanda + voci di manuale candidate → { reply, id }.
export async function appHelp(question, topics) {
  if (!WORKER_URL) throw new Error("Funzione non disponibile (worker non configurato).");
  let res;
  try {
    res = await fetch(`${WORKER_URL}/apphelp`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, topics: (topics || []).map((t) => ({ id: t.id, title: t.title, answer: t.answer })) })
    });
  } catch (e) { throw new Error("Servizio non raggiungibile."); }
  const d = await res.json().catch(() => ({}));
  if (d && typeof d.reply === "string" && !d.error) return d;
  if (d && d.error === "noai") throw new Error("noai");
  throw new Error((d && d.message) || "Assistente non disponibile.");
}

// Abbinamento vino consigliato per un piatto (via Spoonacular).
export async function winePairing(food) {
  if (!WORKER_URL || !food) return null;
  const res = await fetch(`${WORKER_URL}/wine?food=${encodeURIComponent(food)}`);
  if (!res.ok) return null;
  const d = await res.json().catch(() => null);
  if (!d || d.error) return null;
  return d;
}

// Dettagli completi (con i passi) di una ricetta Spoonacular, al salvataggio.
export async function spoonInfo(id) {
  if (!WORKER_URL || !id) return null;
  const res = await fetch(`${WORKER_URL}/spoon-info?id=${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const d = await res.json().catch(() => null);
  if (!d || d.error) return null;
  return d;
}

// Ricerca diretta su Misya (italiano): ritorna [{ title, url }].
export async function searchMisya(query) {
  if (!WORKER_URL || !query.trim()) return [];
  const res = await fetch(`${WORKER_URL}/searchmisya?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  return Array.isArray(d.results) ? d.results : [];
}

// Ricerca diretta su Cookist (italiano): ritorna [{ title, url, image }].
export async function searchCookist(query) {
  if (!WORKER_URL || !query.trim()) return [];
  const res = await fetch(`${WORKER_URL}/searchcookist?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  return Array.isArray(d.results) ? d.results : [];
}

// Ricerca diretta su Ricette della Nonna (italiano): ritorna [{ title, url, image }].
export async function searchRicettenonna(query) {
  if (!WORKER_URL || !query.trim()) return [];
  const res = await fetch(`${WORKER_URL}/searchricettenonna?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  return Array.isArray(d.results) ? d.results : [];
}

// Ricettario Moulinex (italiano): con una query cerca nell'intero catalogo ricette
// (sitemap); senza query mostra la selezione curata per il Companion.
// Ritorna { results, total } dove total è quante combaciano in tutto.
export async function searchMoulinexFull(query, page = 0) {
  if (!WORKER_URL) return { results: [], total: 0, page: 0 };
  const q = (query || "").trim();
  const params = q ? `?q=${encodeURIComponent(q)}&page=${page}` : "";
  const res = await fetch(`${WORKER_URL}/searchmoulinex${params}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  const results = Array.isArray(d.results) ? d.results : [];
  return { results, total: typeof d.total === "number" ? d.total : results.length, page: d.page || 0 };
}
export async function searchMoulinex(query) {
  return (await searchMoulinexFull(query)).results;
}

// Ricerca ricette Bimby su Cookidoo (catalogo ufficiale), paginata.
// Ritorna { results, total }. L'import porta titolo + ingredienti (non i passaggi).
export async function searchBimbyFull(query, page = 0) {
  if (!WORKER_URL || !query.trim()) return { results: [], total: 0 };
  const res = await fetch(`${WORKER_URL}/searchbimby?q=${encodeURIComponent(query.trim())}&page=${page}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  const results = Array.isArray(d.results) ? d.results : [];
  return { results, total: typeof d.total === "number" ? d.total : results.length };
}
export async function searchBimby(query) {
  return (await searchBimbyFull(query, 0)).results;
}

// Ricerca su Edamam (inglese, richiede le chiavi sul worker).
export async function searchEdamam(query) {
  if (!WORKER_URL || !query.trim()) return [];
  const res = await fetch(`${WORKER_URL}/edamam?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  if (d.error === "nokey") { const e = new Error("Edamam non è configurato sul worker."); e.code = "nokey"; throw e; }
  return Array.isArray(d.results) ? d.results : [];
}

// Ricerca su Spoonacular (inglese, richiede la chiave sul worker).
export async function searchSpoon(query) {
  if (!WORKER_URL || !query.trim()) return [];
  const res = await fetch(`${WORKER_URL}/spoon?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) throw new Error("Servizio non raggiungibile.");
  const d = await res.json().catch(() => ({}));
  if (d.error === "nokey") { const e = new Error("Spoonacular non è configurato sul worker."); e.code = "nokey"; throw e; }
  return Array.isArray(d.results) ? d.results : [];
}

// Ripulisce i tag importati dalle parole generiche/SEO (es. GialloZafferano).
const TAG_NOISE = new Set([
  "ricetta", "ricette", "cucina", "cucinare", "come fare", "come si fa", "video",
  "video ricetta", "ricette facili", "ricetta facile", "giallozafferano", "food",
  "cibo", "italiana", "italiano", "italia", "primo", "secondo"
]);
function cleanTags(tags) {
  if (!Array.isArray(tags)) return [];
  const out = [];
  for (const t of tags) {
    const v = String(t || "").trim();
    if (!v || v.length > 22) continue;
    if (TAG_NOISE.has(v.toLowerCase())) continue;
    if (!out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v);
  }
  return out.slice(0, 5);
}

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
    time: typeof data.time === "number" ? data.time : (parseInt(data.time, 10) || null),
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
    steps: Array.isArray(data.steps) ? data.steps : [],
    tags: cleanTags(data.tags),
    video: typeof data.video === "string" ? data.video : ""
  };
}
