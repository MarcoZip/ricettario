// ============================================================
//  Worker Cloudflare — Estrattore ingredienti da ricette
// ------------------------------------------------------------
//  Legge i dati strutturati schema.org/Recipe di una pagina web e
//  restituisce JSON pulito: { title, image, servings, ingredients[], steps[] }.
//  Aggiunge gli header CORS così l'app (PWA) può chiamarlo dal browser.
//
//  COME PUBBLICARLO (gratis, senza installare nulla):
//   1. Vai su https://dash.cloudflare.com → Workers & Pages → Create → Worker
//   2. Dai un nome (es. "ricette-import") e crea
//   3. "Edit code", cancella tutto e incolla QUESTO file → Deploy
//   4. Copia l'indirizzo del worker (es. https://ricette-import.tuonome.workers.dev)
//   5. Incollalo in js/config.js alla voce WORKER_URL e ripubblica l'app
// ============================================================

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*"
};

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "it-IT,it;q=0.9,en;q=0.8"
};

// Ricerca diretta su GialloZafferano (in italiano): ritorna titolo + link.
async function handleSearchGz(q) {
  if (!q || !q.trim()) return json({ results: [] }, 200);
  try {
    const u = "https://www.giallozafferano.it/ricerca-ricette/" + encodeURIComponent(q.trim()) + "/";
    const res = await fetch(u, { headers: BROWSER_HEADERS, cf: { cacheTtl: 1800, cacheEverything: true } });
    if (!res.ok) return json({ error: "unreachable", results: [] }, 200);
    const html = await res.text();
    const results = [];
    const seen = new Set();
    // Ogni card: <div class="gz-card-image">…<img src="…">… <h2 class="gz-title"><a href="…">Titolo</a>
    const parts = html.split("gz-card-image");
    for (let i = 1; i < parts.length && results.length < 20; i++) {
      const seg = parts[i];
      const a = seg.match(/class="gz-title"[^>]*>\s*<a href="([^"]+)"[^>]*>([^<]+)<\/a>/);
      if (!a) continue;
      const link = a[1], title = clean(a[2]);
      if (!link || !title || seen.has(link)) continue;
      seen.add(link);
      const img = seg.match(/<img[^>]+src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
      results.push({ title, url: link, image: img ? img[1] : "" });
    }
    return json({ results }, 200);
  } catch (e) { return json({ error: "unreachable", results: [] }, 200); }
}

// Ricerca diretta su Misya (italiano): ritorna titolo (dallo slug) + link.
function slugTitle(url) {
  const m = url.match(/\/ricetta\/([^/?#]+)\.htm/);
  if (!m) return "";
  const s = decodeURIComponent(m[1]).replace(/-/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}
async function handleSearchMisya(q) {
  if (!q || !q.trim()) return json({ results: [] }, 200);
  try {
    const u = "https://www.misya.info/?s=" + encodeURIComponent(q.trim());
    const res = await fetch(u, { headers: BROWSER_HEADERS, cf: { cacheTtl: 1800, cacheEverything: true } });
    if (!res.ok) return json({ error: "unreachable", results: [] }, 200);
    const html = await res.text();
    const results = [];
    const seen = new Set();
    // Card Misya: <a class="cont-foto" href="…htm" title="Ricetta …"><img … data-src="…jpg">
    const re = /class="cont-foto"[^>]*href="(https:\/\/www\.misya\.info\/ricetta\/[^"]+\.htm)"[^>]*title="([^"]*)"[\s\S]{0,300}?<img[^>]+(?:data-src|src)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
    let m;
    while ((m = re.exec(html)) && results.length < 20) {
      const link = m[1];
      if (seen.has(link)) continue;
      seen.add(link);
      const title = clean(m[2]).replace(/^Ricetta\s+/i, "").trim() || slugTitle(link);
      results.push({ title, url: link, image: m[3] || "" });
    }
    // Fallback: se il pattern con immagine non trova nulla, prendi i soli link.
    if (!results.length) {
      const re2 = /href="(https:\/\/www\.misya\.info\/ricetta\/[^"]+\.htm)"/g;
      let m2;
      while ((m2 = re2.exec(html)) && results.length < 20) {
        const link = m2[1];
        if (seen.has(link)) continue;
        seen.add(link);
        const title = slugTitle(link);
        if (title) results.push({ title, url: link, image: "" });
      }
    }
    return json({ results }, 200);
  } catch (e) { return json({ error: "unreachable", results: [] }, 200); }
}

// Ricerca diretta su Ricette della Nonna (italiano): titolo + link + foto.
async function handleSearchRicettenonna(q) {
  if (!q || !q.trim()) return json({ results: [] }, 200);
  try {
    const u = "https://www.ricettedellanonna.net/?s=" + encodeURIComponent(q.trim());
    const res = await fetch(u, { headers: BROWSER_HEADERS, cf: { cacheTtl: 1800, cacheEverything: true } });
    if (!res.ok) return json({ error: "unreachable", results: [] }, 200);
    const html = await res.text();
    const results = [];
    const seen = new Set();
    // Card: <img data-src="thumb" alt="Titolo"> … <a href="…/slug/" rel="bookmark">Titolo</a>
    const re = /<img[^>]+data-src="([^"]+)"[^>]*alt="[^"]*"[\s\S]{0,500}?<a href="(https:\/\/www\.ricettedellanonna\.net\/[a-z0-9-]+\/)"[^>]*rel="bookmark"[^>]*>([^<]+)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && results.length < 20) {
      const link = m[2];
      if (seen.has(link)) continue;
      seen.add(link);
      const title = clean(m[3]);
      if (!title) continue;
      results.push({ title, url: link, image: m[1] || "" });
    }
    // Fallback: solo i link "bookmark" se il pattern con immagine non aggancia.
    if (!results.length) {
      const re2 = /<a href="(https:\/\/www\.ricettedellanonna\.net\/[a-z0-9-]+\/)"[^>]*rel="bookmark"[^>]*>([^<]+)<\/a>/gi;
      let m2;
      while ((m2 = re2.exec(html)) && results.length < 20) {
        const link = m2[1];
        if (seen.has(link)) continue;
        seen.add(link);
        const title = clean(m2[2]);
        if (title) results.push({ title, url: link, image: "" });
      }
    }
    return json({ results }, 200);
  } catch (e) { return json({ error: "unreachable", results: [] }, 200); }
}

// Ricettario Moulinex Companion (italiano): sfoglia la selezione di ricette per
// il robot Companion dal sito Moulinex. La ricerca testuale non è esposta dal
// sito (è via JS), quindi qui si restituisce la lista curata; le foto e i
// dettagli arrivano all'import della singola ricetta (hanno JSON-LD Recipe).
async function handleSearchMoulinex(q) {
  const query = (q || "").trim();
  // Con una ricerca: filtra l'intero catalogo ricette Moulinex (sitemap), il cui
  // slug contiene il nome del piatto. Senza ricerca: la selezione curata Companion.
  if (query) {
    try {
      const res = await fetch("https://www.moulinex.it/Recipe-it-EUR.xml", { headers: BROWSER_HEADERS, cf: { cacheTtl: 86400, cacheEverything: true } });
      if (!res.ok) return json({ error: "unreachable", results: [] }, 200);
      const xml = await res.text();
      const terms = query.toLowerCase().split(/\s*,\s*|\s+/).filter(Boolean);
      const results = [];
      const seen = new Set();
      let total = 0; // quante combaciano in tutto (anche oltre le 30 mostrate)
      const re = /<loc>(https:\/\/www\.moulinex\.it\/ricette\/detail\/PRO\/([^/<]+)\/[^<]+)<\/loc>/g;
      let m;
      while ((m = re.exec(xml))) {
        const link = m[1], slug = m[2].toLowerCase();
        if (terms.length && !terms.every((t) => slug.includes(t))) continue;
        if (seen.has(slug)) continue;
        seen.add(slug);
        total++;
        if (results.length < 30) {
          const name = m[2].replace(/-/g, " ");
          results.push({ title: name.charAt(0).toUpperCase() + name.slice(1), url: link, image: "" });
        }
      }
      return json({ results, total }, 200);
    } catch (e) { return json({ error: "unreachable", results: [] }, 200); }
  }
  try {
    const u = "https://www.moulinex.it/ricette/elenco/crp/companion-ricette";
    const res = await fetch(u, { headers: BROWSER_HEADERS, cf: { cacheTtl: 3600, cacheEverything: true } });
    if (!res.ok) return json({ error: "unreachable", results: [] }, 200);
    const html = await res.text();
    const results = [];
    const seen = new Set();
    const re = /<a [^>]*class="is-full-area[^"]*"[^>]*href="(\/ricette\/detail\/[^"]+)"[^>]*>\s*<span[^>]*class="is-visually-hidden[^"]*"[^>]*>([^<]+)<\/span>/gi;
    let m;
    while ((m = re.exec(html)) && results.length < 24) {
      const link = "https://www.moulinex.it" + m[1];
      if (seen.has(link)) continue;
      seen.add(link);
      const title = clean(m[2]);
      if (!title) continue;
      results.push({ title, url: link, image: "" });
    }
    return json({ results }, 200);
  } catch (e) { return json({ error: "unreachable", results: [] }, 200); }
}

// Ricerca su Spoonacular (database enorme in inglese): serve env.SPOON_KEY.
async function handleSpoon(q, env) {
  if (!env || !env.SPOON_KEY) return json({ error: "nokey", results: [] }, 200);
  if (!q || !q.trim()) return json({ results: [] }, 200);
  try {
    const u = "https://api.spoonacular.com/recipes/complexSearch?apiKey=" + env.SPOON_KEY +
      "&number=10&addRecipeInformation=true&fillIngredients=true&query=" + encodeURIComponent(q.trim());
    const res = await fetch(u);
    if (!res.ok) return json({ error: "spoonerr", results: [] }, 200);
    const data = await res.json();
    const results = (data.results || []).map((r) => {
      const steps = ((r.analyzedInstructions || [])[0] || {}).steps || [];
      return {
        id: r.id || null,
        title: r.title || "",
        image: r.image || "",
        link: r.sourceUrl || ("https://spoonacular.com/recipes/" + (r.id || "")),
        ingredients: (r.extendedIngredients || []).map((i) => clean(i.original || i.name || "")).filter(Boolean),
        steps: steps.map((s) => clean(s.step || "")).filter(Boolean),
        servings: r.servings || null,
        time: r.readyInMinutes || null
      };
    });
    return json({ results }, 200);
  } catch (e) { return json({ error: "spoonerr", results: [] }, 200); }
}

// Dettagli completi di una ricetta Spoonacular (con i passi), al salvataggio.
async function handleSpoonInfo(id, env) {
  if (!env || !env.SPOON_KEY) return json({ error: "nokey" }, 200);
  if (!id) return json({ error: "missing" }, 400);
  try {
    const u = "https://api.spoonacular.com/recipes/" + encodeURIComponent(id) + "/information?includeNutrition=false&apiKey=" + env.SPOON_KEY;
    const res = await fetch(u);
    if (!res.ok) return json({ error: "spoonerr" }, 200);
    const r = await res.json();
    let steps = (((r.analyzedInstructions || [])[0] || {}).steps || []).map((s) => clean(s.step || "")).filter(Boolean);
    if (!steps.length && r.instructions) {
      const li = [...String(r.instructions).matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => clean(m[1])).filter(Boolean);
      steps = li.length ? li : clean(r.instructions).split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
    }
    return json({
      title: r.title || "",
      image: r.image || "",
      link: r.sourceUrl || "",
      ingredients: (r.extendedIngredients || []).map((i) => clean(i.original || i.name || "")).filter(Boolean),
      steps,
      servings: r.servings || null,
      time: r.readyInMinutes || null
    }, 200);
  } catch (e) { return json({ error: "spoonerr" }, 200); }
}

// Abbinamento vino (Spoonacular) per un piatto/ingrediente.
async function handleWine(food, env) {
  if (!env || !env.SPOON_KEY) return json({ error: "nokey" }, 200);
  if (!food || !food.trim()) return json({ error: "missing" }, 400);
  try {
    const u = "https://api.spoonacular.com/food/wine/pairing?food=" + encodeURIComponent(food.trim()) + "&apiKey=" + env.SPOON_KEY;
    const res = await fetch(u);
    if (!res.ok) return json({ error: "spoonerr" }, 200);
    const r = await res.json();
    return json({ wines: r.pairedWines || [], text: r.pairingText || "" }, 200);
  } catch (e) { return json({ error: "spoonerr" }, 200); }
}

// Ricerca diretta su Cookist (in italiano): ritorna titolo + link + foto.
async function handleSearchCookist(q) {
  if (!q || !q.trim()) return json({ results: [] }, 200);
  try {
    const u = "https://www.cookist.it/?s=" + encodeURIComponent(q.trim());
    const res = await fetch(u, { headers: BROWSER_HEADERS, cf: { cacheTtl: 1800, cacheEverything: true } });
    if (!res.ok) return json({ error: "unreachable", results: [] }, 200);
    const html = await res.text();
    // Mappa immagine per ricetta: <a href="URL" class="ac__image"> … srcset="IMG …"
    const imgMap = {};
    const imgRe = /<a[^>]+href="(https:\/\/www\.cookist\.it\/[^"]+)"[^>]*class="ac__image"[\s\S]{0,600}?srcset="([^" ]+)/gi;
    let im;
    while ((im = imgRe.exec(html))) { if (!imgMap[im[1]]) imgMap[im[1]] = im[2]; }
    const results = [];
    const seen = new Set();
    // Card Cookist: <a href="URL" class="ac__title">Titolo</a>
    const re = /<a[^>]+href="(https:\/\/www\.cookist\.it\/[^"]+)"[^>]*class="ac__title"[^>]*>([^<]+)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && results.length < 20) {
      const link = m[1];
      if (seen.has(link)) continue;
      if (/\/(ricette|news|show|category|tag|author|cookie-policy|privacy-policy|redazione)\//.test(link)) continue;
      seen.add(link);
      const title = clean(m[2]);
      if (!title) continue;
      results.push({ title, url: link, image: imgMap[link] || "" });
    }
    return json({ results }, 200);
  } catch (e) { return json({ error: "unreachable", results: [] }, 200); }
}

// Ricerca su Edamam (database in inglese): servono env.EDAMAM_ID + EDAMAM_KEY.
async function handleEdamam(q, env) {
  if (!env || !env.EDAMAM_ID || !env.EDAMAM_KEY) return json({ error: "nokey", results: [] }, 200);
  if (!q || !q.trim()) return json({ results: [] }, 200);
  try {
    const u = "https://api.edamam.com/api/recipes/v2?type=public" +
      "&field=label&field=image&field=url&field=ingredientLines&field=yield&field=totalTime" +
      "&q=" + encodeURIComponent(q.trim()) +
      "&app_id=" + encodeURIComponent(env.EDAMAM_ID) + "&app_key=" + encodeURIComponent(env.EDAMAM_KEY);
    const res = await fetch(u, { headers: { "Edamam-Account-User": env.EDAMAM_USER || env.EDAMAM_ID } });
    if (!res.ok) return json({ error: "edamamerr", results: [] }, 200);
    const data = await res.json();
    const results = (data.hits || []).slice(0, 12).map((h) => {
      const r = h.recipe || {};
      return {
        title: r.label || "",
        image: r.image || "",
        link: r.url || "",
        ingredients: (r.ingredientLines || []).map((s) => clean(s)).filter(Boolean),
        steps: [],
        servings: r.yield ? Math.round(r.yield) : null,
        time: r.totalTime || null
      };
    });
    return json({ results }, 200);
  } catch (e) { return json({ error: "edamamerr", results: [] }, 200); }
}

// Proxy immagini: scarica l'immagine lato server (niente blocchi di referer/hotlink
// sul telefono) e la riserve dal dominio del worker. Solo host di ricette noti.
const IMG_HOSTS = /(^|\.)(misya\.info|giallozafferano\.it|cookist\.it|akamaized\.net|ricettedellanonna\.net|moulinex\.it|twicpics\.moulinex\.it|groupe-seb\.com)$/i;
async function handleImageProxy(target) {
  if (!target) return new Response("missing url", { status: 400, headers: CORS });
  let host;
  try { host = new URL(target).host; } catch (e) { return new Response("bad url", { status: 400, headers: CORS }); }
  if (!IMG_HOSTS.test(host)) return new Response("forbidden", { status: 403, headers: CORS });
  try {
    const res = await fetch(target, { headers: BROWSER_HEADERS, cf: { cacheTtl: 86400, cacheEverything: true } });
    if (!res.ok) return new Response("unreachable", { status: 502, headers: CORS });
    const ct = res.headers.get("content-type") || "image/jpeg";
    if (!/^image\//i.test(ct)) return new Response("not an image", { status: 415, headers: CORS });
    return new Response(res.body, {
      status: 200,
      headers: { ...CORS, "Content-Type": ct, "Cache-Control": "public, max-age=86400" }
    });
  } catch (e) { return new Response("error", { status: 502, headers: CORS }); }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    if (url.pathname === "/img") return handleImageProxy(url.searchParams.get("u"));
    if (url.pathname === "/searchgz") return handleSearchGz(url.searchParams.get("q"));
    if (url.pathname === "/searchmisya") return handleSearchMisya(url.searchParams.get("q"));
    if (url.pathname === "/searchcookist") return handleSearchCookist(url.searchParams.get("q"));
    if (url.pathname === "/searchricettenonna") return handleSearchRicettenonna(url.searchParams.get("q"));
    if (url.pathname === "/searchmoulinex") return handleSearchMoulinex(url.searchParams.get("q"));
    if (url.pathname === "/edamam") return handleEdamam(url.searchParams.get("q"), env);
    if (url.pathname === "/spoon") return handleSpoon(url.searchParams.get("q"), env);
    if (url.pathname === "/spoon-info") return handleSpoonInfo(url.searchParams.get("id"), env);
    if (url.pathname === "/wine") return handleWine(url.searchParams.get("food"), env);

    const target = url.searchParams.get("url");
    if (!target) return json({ error: "missing", message: "Parametro 'url' mancante" }, 400);

    let res, html;
    try {
      const origin = new URL(target).origin + "/";
      res = await fetch(target, {
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
          "Upgrade-Insecure-Requests": "1",
          Referer: origin
        },
        cf: { cacheTtl: 3600, cacheEverything: true }
      });
    } catch (e) {
      return json({ error: "unreachable", message: "Lettura pagina fallita" }, 502);
    }

    // Siti dietro una "sfida" anti-bot (Cloudflare, ecc.): rispondono con un
    // codice di errore. NB: la sola presenza di script Cloudflare in una pagina
    // valida non è un blocco, quindi prima si prova comunque a estrarre.
    if (res.status === 403 || res.status === 503 || res.status === 429) {
      return json({ error: "blocked", message: "Questo sito blocca la lettura automatica." }, 200);
    }
    if (!res.ok) return json({ error: "unreachable", message: "Pagina non raggiungibile" }, 502);

    html = await res.text();
    const recipe = extractRecipe(html) || extractMicrodata(html) || extractHeuristic(html);
    if (recipe) return json(recipe, 200);

    // Nessuna ricetta trovata: distingui una pagina di sfida anti-bot da una
    // pagina senza dati. Qui l'estrazione è GIÀ fallita, quindi i segnali tipici
    // di Cloudflare/Turnstile indicano con buona certezza un blocco (su una
    // ricetta vera la pagina sarebbe stata estratta sopra).
    if (/Just a moment|cf-browser-verification|Checking your browser|Attention Required|challenge-platform|turnstile|cf-chl|_cf_chl|enable javascript and cookies/i.test(html)) {
      return json({ error: "blocked", message: "Questo sito blocca la lettura automatica." }, 200);
    }
    return json({ error: "notfound", message: "Nessuna ricetta strutturata trovata" }, 404);
  }
};

// Prende gli <li> della prima lista (ul/ol) che segue un'intestazione (h1-h4)
// il cui testo combacia con `re`. Usato dall'estrazione euristica.
function listAfterHeading(html, re) {
  const hRe = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi;
  let m;
  while ((m = hRe.exec(html))) {
    if (re.test(clean(m[1]))) {
      const list = html.slice(m.index).match(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/i);
      if (list) {
        const items = [...list[2].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((x) => clean(x[1])).filter(Boolean);
        if (items.length) return items;
      }
    }
  }
  return [];
}

// Import "più potente": quando non ci sono dati strutturati (schema.org), prova
// a ricavare titolo, foto, ingredienti e passi dall'HTML con euristiche comuni.
function extractHeuristic(html) {
  let title = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || [])[1]
    || (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]
    || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
  title = clean(title);
  const image = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || [])[1] || "";

  let ingredients = [...html.matchAll(/<li[^>]*itemprop=["']recipeIngredient["'][^>]*>([\s\S]*?)<\/li>/gi)].map((m) => clean(m[1])).filter(Boolean);
  if (!ingredients.length) ingredients = [...html.matchAll(/<li[^>]*class=["'][^"']*ingredient[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi)].map((m) => clean(m[1])).filter(Boolean);
  if (!ingredients.length) ingredients = listAfterHeading(html, /ingredient/i);

  let steps = [...html.matchAll(/<li[^>]*itemprop=["']recipeInstructions["'][^>]*>([\s\S]*?)<\/li>/gi)].map((m) => clean(m[1])).filter(Boolean);
  if (!steps.length) steps = [...html.matchAll(/<(?:li|p)[^>]*class=["'][^"']*(?:instruction|step|preparaz|procedimento)[^"']*["'][^>]*>([\s\S]*?)<\/(?:li|p)>/gi)].map((m) => clean(m[1])).filter(Boolean);
  if (!steps.length) steps = listAfterHeading(html, /preparaz|procedimento|istruzion|metodo|come si fa/i);

  // Troppi pochi dati: meglio dichiarare "non trovato" che restituire spazzatura.
  if (ingredients.length < 2 && steps.length < 1) return null;
  return { title, image, servings: null, time: null, ingredients, steps, tags: [] };
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS }
  });
}

// ---------- pulizia testo ----------
const NAMED_ENTITIES = {
  nbsp: " ", apos: "'", quot: '"', lt: "<", gt: ">", amp: "&",
  agrave: "à", egrave: "è", eacute: "é", igrave: "ì", ograve: "ò", ugrave: "ù",
  Agrave: "À", Egrave: "È", Eacute: "É", Igrave: "Ì", Ograve: "Ò", Ugrave: "Ù",
  ndash: "–", mdash: "—", hellip: "…", deg: "°",
  rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»",
  frac12: "½", frac14: "¼", frac34: "¾"
};
export function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeCp(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCp(parseInt(d, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (m, name) => (name in NAMED_ENTITIES ? NAMED_ENTITIES[name] : m))
    .replace(/&amp;/g, "&");
}
function safeCp(n) {
  try { return String.fromCodePoint(n); } catch { return ""; }
}
export function clean(s) {
  return decodeEntities(String(s == null ? "" : s).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

// ---------- estrazione da JSON-LD ----------
export function extractRecipe(html) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const raw of blocks) {
    let data;
    try { data = JSON.parse(raw.trim()); } catch { continue; }
    const node = findRecipe(data);
    if (node) return normalize(node);
  }
  return null;
}

function findRecipe(data) {
  const list = Array.isArray(data) ? data : (data && data["@graph"] ? data["@graph"] : [data]);
  for (const n of list) {
    if (!n || typeof n !== "object") continue;
    const t = n["@type"];
    if (t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"))) return n;
  }
  return null;
}

// Appiattisce recipeInstructions: stringhe, HowToStep, HowToSection (con
// itemListElement), array annidati. Ignora i titoli di sezione, tiene i passi.
export function flattenInstructions(ri) {
  const out = [];
  const walk = (x) => {
    if (!x) return;
    if (typeof x === "string") {
      x.split(/\r?\n+/).forEach((line) => { const t = clean(line); if (t) out.push(t); });
      return;
    }
    if (Array.isArray(x)) { x.forEach(walk); return; }
    if (typeof x === "object") {
      if (x.itemListElement) { walk(x.itemListElement); return; } // HowToSection
      const t = clean(x.text || x.name || "");
      if (t) out.push(t);
    }
  };
  walk(ri);
  return out;
}

function normalize(n) {
  const ingredients = []
    .concat(n.recipeIngredient || n.ingredients || [])
    .map((x) => clean(x))
    .filter(Boolean);

  let servings = null;
  const y = n.recipeYield;
  if (y) {
    const s = Array.isArray(y) ? y[0] : y;
    const m = String(s).match(/\d+/);
    if (m) servings = parseInt(m[0], 10);
  }

  let image = "";
  if (n.image) {
    const img = Array.isArray(n.image) ? n.image[0] : n.image;
    image = (img && (img.url || img)) || "";
  }

  const steps = flattenInstructions(n.recipeInstructions);

  // Tempo: totalTime, oppure prep + cook. Formato ISO 8601 ("PT1H30M").
  let time = isoDurationToMinutes(n.totalTime);
  if (!time) {
    const p = isoDurationToMinutes(n.prepTime);
    const c = isoDurationToMinutes(n.cookTime);
    if (p || c) time = (p || 0) + (c || 0);
  }

  // Categorie/cucina/parole chiave → tag (per arricchire la ricetta importata).
  const tags = [];
  const pushTag = (v) => { const t = clean(v); if (t && t.length <= 22 && !tags.some((x) => x.toLowerCase() === t.toLowerCase())) tags.push(t); };
  [].concat(n.recipeCategory || []).forEach(pushTag);
  [].concat(n.recipeCuisine || []).forEach(pushTag);
  if (n.keywords) String(Array.isArray(n.keywords) ? n.keywords.join(",") : n.keywords).split(",").slice(0, 4).forEach(pushTag);

  return { title: clean(n.name) || "", image: image || "", servings, time: time || null, ingredients, steps, tags: tags.slice(0, 6) };
}

// Converte una durata ISO 8601 (es. "PT1H30M", "PT45M") in minuti.
export function isoDurationToMinutes(v) {
  if (!v) return null;
  const s = Array.isArray(v) ? v[0] : v;
  const m = String(s).match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!m) return null;
  const days = parseInt(m[1] || 0, 10), h = parseInt(m[2] || 0, 10), min = parseInt(m[3] || 0, 10), sec = parseInt(m[4] || 0, 10);
  const total = days * 1440 + h * 60 + min + Math.round(sec / 60);
  return total > 0 ? total : null;
}

// ---------- fallback microdata (siti senza JSON-LD) ----------
export function extractMicrodata(html) {
  const grab = (prop) => [...html.matchAll(new RegExp('itemprop=["\']' + prop + '["\'][^>]*>([\\s\\S]*?)<', "gi"))]
    .map((m) => clean(m[1])).filter(Boolean);
  const ingredients = grab("recipeIngredient").concat(grab("ingredients")).filter(Boolean);
  if (!ingredients.length) return null;
  const names = grab("name");
  const steps = grab("recipeInstructions");
  return { title: names[0] || "", image: "", servings: null, ingredients, steps };
}
