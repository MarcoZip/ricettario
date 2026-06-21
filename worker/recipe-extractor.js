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
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
async function handleSearchMoulinex(q, pageStr) {
  const query = (q || "").trim();
  // Con una ricerca: filtra l'intero catalogo ricette Moulinex (sitemap), il cui
  // slug contiene il nome del piatto, con paginazione. Senza ricerca: selezione curata.
  if (query) {
    try {
      const res = await fetch("https://www.moulinex.it/Recipe-it-EUR.xml", { headers: BROWSER_HEADERS, cf: { cacheTtl: 86400, cacheEverything: true } });
      if (!res.ok) return json({ error: "unreachable", results: [] }, 200);
      const xml = await res.text();
      const terms = query.toLowerCase().split(/\s*,\s*|\s+/).filter(Boolean);
      const PAGE = 12;
      const page = Math.max(0, parseInt(pageStr, 10) || 0);
      const start = page * PAGE, end = start + PAGE;
      const results = [];
      const seen = new Set();
      let total = 0; // quante combaciano in tutto
      const re = /<loc>(https:\/\/www\.moulinex\.it\/ricette\/detail\/PRO\/([^/<]+)\/[^<]+)<\/loc>/g;
      let m;
      while ((m = re.exec(xml))) {
        const link = m[1], slug = m[2].toLowerCase();
        if (terms.length && !terms.every((t) => slug.includes(t))) continue;
        if (seen.has(slug)) continue;
        seen.add(slug);
        const idx = total;
        total++;
        if (idx >= start && idx < end) {
          const name = m[2].replace(/-/g, " ");
          results.push({ title: name.charAt(0).toUpperCase() + name.slice(1), url: link, image: "" });
        }
      }
      return json({ results, total, page, pageSize: PAGE }, 200);
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

// Miniatura di una ricetta Moulinex: la foto sta nel JSON-LD della pagina. Qui
// risolviamo l'URL dell'immagine e la riserviamo (proxy) dal dominio del worker.
async function handleMoulinexImg(target) {
  if (!target) return new Response("missing", { status: 400, headers: CORS });
  try { if (!/(^|\.)moulinex\.it$/i.test(new URL(target).host)) return new Response("forbidden", { status: 403, headers: CORS }); }
  catch (e) { return new Response("bad url", { status: 400, headers: CORS }); }
  try {
    const page = await fetch(target, { headers: BROWSER_HEADERS, cf: { cacheTtl: 86400, cacheEverything: true } });
    if (!page.ok) return new Response("no page", { status: 502, headers: CORS });
    const html = await page.text();
    const m = html.match(/"image":\s*\[\s*"([^"]+)"/) || html.match(/property="og:image"[^>]+content="([^"]+)"/i);
    if (!m) return new Response("no image", { status: 404, headers: CORS });
    const img = await fetch(m[1].replace(/\\u002F/g, "/"), { headers: BROWSER_HEADERS, cf: { cacheTtl: 86400, cacheEverything: true } });
    if (!img.ok) return new Response("img fail", { status: 502, headers: CORS });
    const ct = img.headers.get("content-type") || "image/jpeg";
    return new Response(img.body, { status: 200, headers: { ...CORS, "Content-Type": ct, "Cache-Control": "public, max-age=86400" } });
  } catch (e) { return new Response("error", { status: 502, headers: CORS }); }
}

// Ricerca ricette Bimby su Cookidoo (la piattaforma ufficiale). La ricerca passa da
// Algolia con una chiave pubblica che il sito rigenera a ogni caricamento (scade in
// ~1 settimana): la preleviamo al volo dalla pagina (cache 1h). I risultati pubblici
// danno titolo, foto e link; l'import porta titolo + ingredienti (i passaggi sono
// contenuto in abbonamento e non vengono inclusi).
const COOKIDOO_ALGOLIA_APP = "3TA8NT85XJ";
async function getCookidooKey() {
  const res = await fetch("https://cookidoo.it/search/it-IT", { headers: BROWSER_HEADERS, cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(/"algoliaApiKeyData":\{"apiKey":"([^"]+)"/);
  return m ? m[1] : null;
}
async function handleSearchBimby(q, pageStr) {
  const query = (q || "").trim();
  if (!query) return json({ results: [], total: 0 }, 200);
  try {
    const key = await getCookidooKey();
    if (!key) return json({ error: "unreachable", results: [] }, 200);
    const page = Math.max(0, parseInt(pageStr, 10) || 0);
    const res = await fetch(`https://${COOKIDOO_ALGOLIA_APP}-dsn.algolia.net/1/indexes/recipes-production/query`, {
      method: "POST",
      headers: { "X-Algolia-Application-Id": COOKIDOO_ALGOLIA_APP, "X-Algolia-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ query, hitsPerPage: 12, page, facetFilters: [["language:it"]] })
    });
    if (!res.ok) return json({ error: "unreachable", results: [] }, 200);
    const data = await res.json();
    const results = (data.hits || []).map((h) => {
      let image = h.image || "";
      if (image) {
        image = image.replace("{assethost}", "assets.tmecosys.com").replace("{transformation}", "t_web_rdp_recipe_584x480");
        if (!/\.(jpg|jpeg|png|webp)$/i.test(image)) image += ".jpg";
      }
      return { title: clean(h.title || ""), url: "https://cookidoo.it/recipes/recipe/it-IT/" + (h.id || h.objectID), image };
    }).filter((r) => r.title);
    return json({ results, total: data.nbHits || results.length, page: data.page || page, pageSize: 12 }, 200);
  } catch (e) { return json({ error: "unreachable", results: [] }, 200); }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    if (url.pathname === "/vision") return handleVision(request, env);
    if (url.pathname === "/ask") return handleAsk(request, env);
    if (url.pathname === "/generate") return handleGenerate(request, env);
    if (url.pathname === "/importvideo") return handleImportVideo(request, env);
    if (url.pathname === "/robot") return handleRobot(request, env);
    if (url.pathname === "/fridge") return handleFridge(request, env);
    if (url.pathname === "/planweek") return handlePlanWeek(request, env);
    if (url.pathname === "/convert") return handleConvert(request, env);
    if (url.pathname === "/apphelp") return handleAppHelp(request, env);
    if (url.pathname === "/img") return handleImageProxy(url.searchParams.get("u"));
    if (url.pathname === "/moulinex-img") return handleMoulinexImg(url.searchParams.get("u"));
    if (url.pathname === "/searchbimby") return handleSearchBimby(url.searchParams.get("q"), url.searchParams.get("page"));
    if (url.pathname === "/searchgz") return handleSearchGz(url.searchParams.get("q"));
    if (url.pathname === "/searchmisya") return handleSearchMisya(url.searchParams.get("q"));
    if (url.pathname === "/searchcookist") return handleSearchCookist(url.searchParams.get("q"));
    if (url.pathname === "/searchricettenonna") return handleSearchRicettenonna(url.searchParams.get("q"));
    if (url.pathname === "/searchmoulinex") return handleSearchMoulinex(url.searchParams.get("q"), url.searchParams.get("page"));
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
    if (recipe) {
      // Se la pagina contiene anche un video (YouTube/Vimeo/TikTok), allego il link.
      if (!recipe.video) { const v = extractVideo(html); if (v) recipe.video = v; }
      return json(recipe, 200);
    }

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

// Cerca nella pagina un video incorporato (YouTube/Vimeo/TikTok) e ne ricava il
// link da salvare con la ricetta. Restituisce "" se non trova nulla.
function extractVideo(html) {
  const deEsc = (s) => String(s || "").replace(/\\\//g, "/").replace(/&amp;/g, "&").replace(/&#0?38;/g, "&");
  const fix = (u) => { u = deEsc(u).trim(); if (u.startsWith("//")) u = "https:" + u; return u; };
  // 1) meta og:video (spesso un embed YouTube/Vimeo)
  let m = html.match(/<meta[^>]+(?:property|name)=["']og:video(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i);
  if (m && /youtu|vimeo|tiktok/i.test(m[1])) return fix(m[1]);
  // 2) iframe di embed
  m = html.match(/<iframe[^>]+src=["']([^"']*(?:youtube(?:-nocookie)?\.com\/embed|player\.vimeo\.com\/video|youtu\.be|tiktok\.com\/embed)[^"']*)["']/i);
  if (m) return fix(m[1]);
  // 3) JSON-LD VideoObject (embedUrl o contentUrl)
  m = html.match(/"(?:embedUrl|contentUrl)"\s*:\s*"([^"]*(?:youtu|vimeo|tiktok)[^"]*)"/i);
  if (m) return fix(m[1]);
  // 4) primo link YouTube/Vimeo trovato nel testo (anche con slash escappati)
  const flat = deEsc(html);
  m = flat.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[A-Za-z0-9_\-]{6,}|youtu\.be\/[A-Za-z0-9_\-]{6,}|vimeo\.com\/\d{6,})/i);
  if (m) return m[0];
  return "";
}

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

// ---------- Analisi foto del piatto (Cloudflare Workers AI) ----------
//  Riceve in POST { image: base64, title } e restituisce un breve parere in
//  italiano su come sembra venuto il piatto (cottura, colore, consistenza).
//  Usa il modello di visione gratuito di Cloudflare (entro la quota giornaliera).
//  RICHIEDE: un binding "Workers AI" chiamato  AI  collegato a questo worker
//  (Dashboard → Worker → Settings → Bindings → Add → Workers AI → nome: AI).
async function handleVision(request, env) {
  if (request.method !== "POST") return json({ error: "method", message: "Usa POST" }, 405);
  if (!env || !env.AI) return json({ error: "noai", message: "Workers AI non collegato: aggiungi al worker un binding chiamato AI." }, 200);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "badreq", message: "Richiesta non valida" }, 400); }
  const b64 = String((body && body.image) || "").replace(/^data:[^,]+,/, "");
  if (!b64) return json({ error: "noimage", message: "Foto mancante" }, 400);

  let bytes;
  try {
    const bin = atob(b64);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } catch (e) { return json({ error: "badimage", message: "Foto non leggibile" }, 400); }

  const title = String((body && body.title) || "").slice(0, 120);
  const prompt = [
    "Sei un aiuto-cuoco gentile ed esperto. Guardi la foto di un piatto fatto in casa" + (title ? ` chiamato "${title}"` : "") + ".",
    "Rispondi SOLO in italiano, in massimo 3 frasi brevi e semplici.",
    "Valuta come sembra venuto guardando colore, grado di cottura, doratura, consistenza e impiattamento:",
    "ad esempio se appare ben cotto, bruciato, poco cotto o pallido, troppo liquido o troppo asciutto.",
    "Se sembra a posto, dillo con un piccolo complimento. Se vedi un possibile difetto, segnalalo con gentilezza e dai un consiglio pratico per la prossima volta.",
    "Non inventare ingredienti che non vedi. Non parlare di sale o sapore: dalla foto non si percepiscono."
  ].join(" ");

  // Prova prima un modello più capace e multilingue; se non disponibile o con
  // input diverso, ricade su LLaVA (stesso formato { image, prompt, max_tokens }).
  const models = ["@cf/meta/llama-3.2-11b-vision-instruct", "@cf/llava-hf/llava-1.5-7b-hf"];
  const input = { image: [...bytes], prompt, max_tokens: 320 };
  let lastErr = "";
  for (const model of models) {
    try {
      const out = await env.AI.run(model, input);
      const text = String((out && (out.response || out.description || out.text)) || "").trim();
      if (text) return json({ feedback: text }, 200);
    } catch (e) { lastErr = (e && e.message) || String(e); }
  }
  return json({ error: "aifail", message: "Analisi non riuscita. Riprova tra poco." + (lastErr ? " (" + lastErr.slice(0, 120) + ")" : "") }, 200);
}

// ---------- Funzioni AI testuali (Cloudflare Workers AI, gratis entro quota) ----------
//  Modelli di testo multilingue, provati in cascata (alcuni account ne hanno
//  solo alcuni). Richiede lo stesso binding "AI".
const TEXT_MODELS = [
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3-8b-instruct",
  "@cf/meta/llama-3.1-8b-instruct-fast",
  "@cf/mistralai/mistral-7b-instruct-v0.1",
  "@cf/qwen/qwen1.5-14b-chat-awq"
];
async function aiText(env, messages, maxTokens, schema) {
  let lastErr = "";
  const input = { messages, max_tokens: maxTokens || 700 };
  if (schema) input.response_format = { type: "json_schema", json_schema: schema };
  for (const model of TEXT_MODELS) {
    try {
      const out = await env.AI.run(model, input);
      // In JSON mode alcuni modelli ritornano out.response già come oggetto.
      if (out && out.response && typeof out.response === "object") return JSON.stringify(out.response);
      const t = String((out && (out.response || out.text)) || "").trim();
      if (t) return t;
    } catch (e) { lastErr = (e && e.message) || String(e); }
  }
  const err = new Error(lastErr || "Nessun modello di testo disponibile.");
  err.detail = lastErr;
  throw err;
}
// Estrae il primo oggetto JSON da un testo del modello (tollera code-fence,
// prefazioni e virgole finali).
function extractJson(text) {
  if (!text) return null;
  let s = String(text).replace(/```(?:json)?/gi, "").trim();
  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i < 0 || j <= i) return null;
  s = s.slice(i, j + 1);
  for (const cand of [s, s.replace(/,\s*([}\]])/g, "$1")]) {
    try { return JSON.parse(cand); } catch (e) { /* prova la variante */ }
  }
  return null;
}
// Schema JSON per le ricette (forza un output strutturato valido).
const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    servings: { type: "number" },
    ingredients: { type: "array", items: { type: "string" } },
    steps: { type: "array", items: { type: "string" } }
  },
  required: ["title", "ingredients", "steps"]
};
// Schema JSON per un "programma robot" (Companion/Bimby): passi con azione + impostazioni.
const ROBOT_SCHEMA = {
  type: "object",
  properties: {
    note: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: { azione: { type: "string" }, impostazioni: { type: "string" } },
        required: ["azione", "impostazioni"]
      }
    }
  },
  required: ["steps"]
};

// "Chiedi allo chef": risposta in italiano a una domanda di cucina, con
// eventuale contesto della ricetta. POST { question, title?, ingredients?, steps? }.
async function handleAsk(request, env) {
  if (request.method !== "POST") return json({ error: "method", message: "Usa POST" }, 405);
  if (!env || !env.AI) return json({ error: "noai", message: "Workers AI non collegato (binding AI mancante)." }, 200);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "badreq" }, 400); }
  const q = String((body && body.question) || "").trim().slice(0, 600);
  if (!q) return json({ error: "noq", message: "Domanda mancante" }, 400);
  let ctx = "";
  if (body.title) ctx += `\nRicetta in corso: ${String(body.title).slice(0, 120)}.`;
  if (Array.isArray(body.ingredients) && body.ingredients.length) ctx += `\nIngredienti: ${body.ingredients.slice(0, 40).join(", ").slice(0, 600)}.`;
  const messages = [
    { role: "system", content: "Sei un aiuto-cuoco esperto, gentile e pratico. Rispondi SEMPRE in italiano, in modo conciso e concreto (massimo 6 frasi). Dai consigli utili e sicuri in cucina. Se la domanda non riguarda la cucina, riportala gentilmente al tema." },
    { role: "user", content: q + (ctx ? "\n\nContesto:" + ctx : "") }
  ];
  try {
    const answer = await aiText(env, messages, 500);
    if (!answer) return json({ error: "empty", message: "Nessuna risposta. Riprova." }, 200);
    return json({ answer }, 200);
  } catch (e) { return json({ error: "aifail", message: "Servizio AI non disponibile ora. Riprova tra poco." + (e && (e.detail || e.message) ? " (" + String(e.detail || e.message).slice(0, 140) + ")" : "") }, 200); }
}

// "Inventa una ricetta" dagli ingredienti disponibili. POST { ingredients, note? }.
// Ritorna { title, servings, ingredients:[stringhe], steps:[stringhe] }.
async function handleGenerate(request, env) {
  if (request.method !== "POST") return json({ error: "method", message: "Usa POST" }, 405);
  if (!env || !env.AI) return json({ error: "noai", message: "Workers AI non collegato (binding AI mancante)." }, 200);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "badreq" }, 400); }
  const ing = String((body && body.ingredients) || "").trim().slice(0, 600);
  if (!ing) return json({ error: "noing", message: "Indica almeno qualche ingrediente" }, 400);
  const note = String((body && body.note) || "").trim().slice(0, 200);
  const messages = [
    { role: "system", content: "Sei uno chef di casa. Inventa UNA ricetta semplice, realistica e gustosa, in italiano, usando soprattutto gli ingredienti indicati (puoi assumere sale, olio, acqua, spezie comuni). Rispondi SOLO con un oggetto JSON valido, senza testo extra, in questo formato: {\"title\": string, \"servings\": number, \"ingredients\": [string], \"steps\": [string]}. Gli ingredienti come stringhe del tipo \"200 g di pasta\". I passi chiari e numerabili. Niente markdown." },
    { role: "user", content: `Ingredienti disponibili: ${ing}.${note ? " Nota: " + note + "." : ""}` }
  ];
  try {
    const raw = await aiText(env, messages, 800, RECIPE_SCHEMA);
    const r = extractJson(raw);
    if (!r || !r.title) return json({ error: "parse", message: "Non sono riuscito a creare la ricetta. Riprova." }, 200);
    return json({
      title: String(r.title).slice(0, 140),
      servings: Number(r.servings) > 0 ? Math.min(20, Math.round(Number(r.servings))) : null,
      ingredients: Array.isArray(r.ingredients) ? r.ingredients.map((x) => String(x)).slice(0, 40) : [],
      steps: Array.isArray(r.steps) ? r.steps.map((x) => String(x)).slice(0, 40) : []
    }, 200);
  } catch (e) { return json({ error: "aifail", message: "Servizio AI non disponibile ora. Riprova tra poco." + (e && (e.detail || e.message) ? " (" + String(e.detail || e.message).slice(0, 140) + ")" : "") }, 200); }
}

// Import ricetta da link video social (TikTok/Instagram/YouTube) o da testo
// incollato. POST { url? , text? }. Legge la didascalia/descrizione e la
// struttura con l'AI in { title, servings, ingredients[], steps[] }.
async function fetchCaption(rawUrl) {
  let host = "";
  try { host = new URL(rawUrl).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
  let caption = "";
  // oEmbed TikTok: dà la didascalia nel campo "title".
  if (/tiktok\.com$/.test(host) || host.endsWith(".tiktok.com")) {
    try {
      const r = await fetch("https://www.tiktok.com/oembed?url=" + encodeURIComponent(rawUrl), { headers: BROWSER_HEADERS });
      if (r.ok) { const d = await r.json(); caption = clean(d && d.title || ""); }
    } catch (e) { /* continua */ }
  }
  // Fallback generico: leggi og:description / description / og:title dalla pagina.
  if (caption.length < 40) {
    try {
      const r = await fetch(rawUrl, { headers: BROWSER_HEADERS, redirect: "follow", cf: { cacheTtl: 600 } });
      if (r.ok) {
        const html = await r.text();
        const grab = (re) => { const m = html.match(re); return m ? clean(decodeEntities(m[1])) : ""; };
        const ogd = grab(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
          || grab(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
        const ogt = grab(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
        if ((ogd || "").length > caption.length) caption = [ogt, ogd].filter(Boolean).join(". ");
      }
    } catch (e) { /* niente */ }
  }
  return caption;
}
async function handleImportVideo(request, env) {
  if (request.method !== "POST") return json({ error: "method", message: "Usa POST" }, 405);
  if (!env || !env.AI) return json({ error: "noai", message: "Workers AI non collegato (binding AI mancante)." }, 200);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "badreq" }, 400); }
  let text = String((body && body.text) || "").trim();
  const url = String((body && body.url) || "").trim();
  if (!text && url) text = await fetchCaption(url);
  text = text.slice(0, 4000);
  if (text.replace(/\s/g, "").length < 30) {
    return json({ error: "nocaption", message: "Non sono riuscito a leggere la ricetta dal link. Apri il video, copia la descrizione e incollala qui." }, 200);
  }
  const messages = [
    { role: "system", content: "Ricevi la didascalia/descrizione di un video di cucina. Estrai la ricetta e traducila/normalizzala in italiano. Rispondi SOLO con un oggetto JSON valido, senza testo extra: {\"title\": string, \"servings\": number|null, \"ingredients\": [string], \"steps\": [string]}. Gli ingredienti come stringhe \"quantità + nome\". I passi a frasi brevi. Se mancano i passi, deducili in modo ragionevole. Niente markdown." },
    { role: "user", content: text }
  ];
  try {
    const raw = await aiText(env, messages, 900, RECIPE_SCHEMA);
    const r = extractJson(raw);
    if (!r || !r.title) return json({ error: "parse", message: "Non sono riuscito a strutturare la ricetta. Prova a incollare la descrizione completa." }, 200);
    return json({
      title: String(r.title).slice(0, 140),
      servings: Number(r.servings) > 0 ? Math.min(20, Math.round(Number(r.servings))) : null,
      ingredients: Array.isArray(r.ingredients) ? r.ingredients.map((x) => String(x)).slice(0, 50) : [],
      steps: Array.isArray(r.steps) ? r.steps.map((x) => String(x)).slice(0, 50) : [],
      sourceUrl: url || ""
    }, 200);
  } catch (e) { return json({ error: "aifail", message: "Servizio AI non disponibile ora. Riprova tra poco." + (e && (e.detail || e.message) ? " (" + String(e.detail || e.message).slice(0, 140) + ")" : "") }, 200); }
}

// "Modalità robot": converte la ricetta in un programma per Moulinex Companion o
// Bimby (TM6), passo per passo con accessorio/velocità/temperatura/tempo da
// IMPOSTARE A MANO sul robot (NON lo pilota). POST { title, ingredients[], steps[], device }.
async function handleRobot(request, env) {
  if (request.method !== "POST") return json({ error: "method", message: "Usa POST" }, 405);
  if (!env || !env.AI) return json({ error: "noai", message: "Workers AI non collegato (binding AI mancante)." }, 200);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "badreq" }, 400); }
  const device = String((body && body.device) || "").toLowerCase() === "bimby" ? "bimby" : "companion";
  const title = String((body && body.title) || "").slice(0, 140);
  const ingredients = Array.isArray(body.ingredients) ? body.ingredients.map((x) => String(x)).slice(0, 50) : [];
  const steps = Array.isArray(body.steps) ? body.steps.map((x) => String(x)).slice(0, 50) : [];
  if (!title && !ingredients.length) return json({ error: "norecipe", message: "Ricetta insufficiente" }, 400);

  const sys = device === "bimby"
    ? "Sei un esperto del Bimby (Thermomix TM6). Converti la ricetta in un programma passo-passo in stile Bimby da impostare A MANO. Per ogni passo indica nelle impostazioni, quando ha senso: velocità (da 1 a 10, oppure Turbo, oppure 'antiorario' per non sminuzzare), temperatura (da 37 a 160°C, oppure Varoma, oppure nessuna se a freddo) e tempo. Esempio impostazioni: \"Vel 2 · 100°C · 10 min\" oppure \"Vel 4 · 30 sec\". Usa valori realistici e prudenti. Rispondi SOLO con JSON valido: {\"note\": string, \"steps\": [{\"azione\": string, \"impostazioni\": string}]}. La nota ricorda all'utente di verificare i valori sul proprio Bimby. Tutto in italiano. Niente markdown."
    : "Sei un esperto del robot da cucina Moulinex i-Companion. Converti la ricetta in un programma passo-passo da impostare A MANO sul Companion. Per ogni passo indica nelle impostazioni, quando ha senso: l'accessorio (Ultrablade/lama, mescolatore, sbattitore a farfalla/frusta, lama impastatrice, cestello vapore), la velocità (da 1 a 12), la temperatura (da 30 a 130°C, o nessuna se a freddo) e il tempo. Esempio impostazioni: \"Mescolatore · Vel 5 · 100°C · 10 min\". Usa valori realistici e prudenti. Rispondi SOLO con JSON valido: {\"note\": string, \"steps\": [{\"azione\": string, \"impostazioni\": string}]}. La nota ricorda di verificare i valori sul proprio Companion. Tutto in italiano. Niente markdown.";

  const userMsg = `Ricetta: ${title}\nIngredienti:\n${ingredients.join("\n")}\n\nPreparazione:\n${steps.join("\n")}`;
  try {
    const raw = await aiText(env, [{ role: "system", content: sys }, { role: "user", content: userMsg.slice(0, 3500) }], 900, ROBOT_SCHEMA);
    const r = extractJson(raw);
    if (!r || !Array.isArray(r.steps) || !r.steps.length) return json({ error: "parse", message: "Non sono riuscito a creare il programma. Riprova." }, 200);
    return json({
      device,
      note: String(r.note || "").slice(0, 300),
      steps: r.steps.map((s) => ({ azione: String(s.azione || "").slice(0, 300), impostazioni: String(s.impostazioni || "").slice(0, 120) })).slice(0, 40)
    }, 200);
  } catch (e) { return json({ error: "aifail", message: "Servizio AI non disponibile ora. Riprova tra poco." + (e && (e.detail || e.message) ? " (" + String(e.detail || e.message).slice(0, 140) + ")" : "") }, 200); }
}

// "Fotografa il frigo": elenca gli alimenti visibili in una foto. POST { image: base64 }.
async function handleFridge(request, env) {
  if (request.method !== "POST") return json({ error: "method", message: "Usa POST" }, 405);
  if (!env || !env.AI) return json({ error: "noai", message: "Workers AI non collegato (binding AI mancante)." }, 200);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "badreq" }, 400); }
  const b64 = String((body && body.image) || "").replace(/^data:[^,]+,/, "");
  if (!b64) return json({ error: "noimage", message: "Foto mancante" }, 400);
  let bytes;
  try { const bin = atob(b64); bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); }
  catch (e) { return json({ error: "badimage", message: "Foto non leggibile" }, 400); }
  const prompt = "Guarda questa foto di un frigorifero o di una dispensa. Elenca SOLO gli alimenti e ingredienti che riconosci con ragionevole sicurezza. Rispondi in italiano con un semplice elenco separato da virgole (esempio: uova, latte, zucchine, parmigiano, pomodori). Niente frasi, niente quantità: solo i nomi degli alimenti.";
  const models = ["@cf/meta/llama-3.2-11b-vision-instruct", "@cf/llava-hf/llava-1.5-7b-hf"];
  let lastErr = "";
  for (const model of models) {
    try {
      const out = await env.AI.run(model, { image: [...bytes], prompt, max_tokens: 300 });
      const text = String((out && (out.response || out.description || out.text)) || "").trim();
      if (text) {
        const items = text.replace(/^[^:]*:/, "").split(/[,\n;•\-]+/)
          .map((s) => clean(s).toLowerCase().replace(/^(e |ed |un |una |dei |del |della |delle |degli )/, "").trim())
          .filter((s) => s.length >= 2 && s.length <= 30 && /[a-zà-ù]/i.test(s));
        const uniq = [...new Set(items)].slice(0, 30);
        if (uniq.length) return json({ ingredients: uniq }, 200);
      }
    } catch (e) { lastErr = (e && e.message) || String(e); }
  }
  return json({ error: "empty", message: "Non ho riconosciuto alimenti. Riprova con una foto più chiara." + (lastErr ? " (" + lastErr.slice(0, 100) + ")" : "") }, 200);
}

// Pianificatore settimanale: l'AI compone 7 giorni scegliendo tra i titoli forniti.
// POST { titles:[string], includeLunch:bool, expiring:[string] } → { days:[{pranzo?,cena}] }.
const PLAN_SCHEMA = {
  type: "object",
  properties: {
    days: {
      type: "array",
      items: { type: "object", properties: { pranzo: { type: "string" }, cena: { type: "string" } }, required: ["cena"] }
    }
  },
  required: ["days"]
};
async function handlePlanWeek(request, env) {
  if (request.method !== "POST") return json({ error: "method", message: "Usa POST" }, 405);
  if (!env || !env.AI) return json({ error: "noai", message: "Workers AI non collegato (binding AI mancante)." }, 200);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "badreq" }, 400); }
  const titles = Array.isArray(body.titles) ? body.titles.map((x) => String(x)).filter(Boolean).slice(0, 60) : [];
  if (titles.length < 2) return json({ error: "few", message: "Servono almeno 2 ricette salvate." }, 200);
  const includeLunch = !!body.includeLunch;
  const expiring = Array.isArray(body.expiring) ? body.expiring.map((x) => String(x)).slice(0, 20) : [];
  const sys = `Sei un aiuto-cuoco. Devi comporre un menù settimanale di 7 giorni scegliendo i piatti SOLO dall'elenco di titoli di ricette forniti (usa i titoli ESATTI, copiati identici). Per ogni giorno scegli una "cena"${includeLunch ? ' e un "pranzo"' : ""}. Regole: varia il più possibile, NON ripetere lo stesso piatto nella settimana se ci sono abbastanza ricette, alterna i tipi di piatto.${expiring.length ? " Dai priorità ai piatti che usano questi ingredienti in scadenza: " + expiring.join(", ") + "." : ""} Rispondi SOLO con JSON valido: {"days":[{"pranzo":string,"cena":string}]} con esattamente 7 elementi. Tutto in italiano, nessun markdown.`;
  const userMsg = "Ricette disponibili (scegli SOLO tra questi titoli):\n- " + titles.join("\n- ");
  try {
    const raw = await aiText(env, [{ role: "system", content: sys }, { role: "user", content: userMsg.slice(0, 3500) }], 900, PLAN_SCHEMA);
    const r = extractJson(raw);
    if (!r || !Array.isArray(r.days) || !r.days.length) return json({ error: "parse", message: "Non sono riuscito a creare il menù. Riprova." }, 200);
    return json({
      days: r.days.slice(0, 7).map((d) => ({ pranzo: String((d && d.pranzo) || "").slice(0, 140), cena: String((d && d.cena) || "").slice(0, 140) }))
    }, 200);
  } catch (e) { return json({ error: "aifail", message: "Servizio AI non disponibile ora. Riprova tra poco." + (e && (e.detail || e.message) ? " (" + String(e.detail || e.message).slice(0, 140) + ")" : "") }, 200); }
}

// "Adatta la ricetta" a una dieta (vegano, senza glutine, più leggero…): l'AI
// riscrive l'intera ricetta in modo coerente. POST { title, ingredients[], steps[], diet }.
const DIET_PROMPTS = {
  vegano: "Adatta la ricetta in versione VEGANA: sostituisci ogni ingrediente di origine animale (carne, pesce, uova, latte, burro, formaggio, miele) con alternative vegetali adeguate, regolando tecniche e tempi di conseguenza.",
  vegetariano: "Adatta la ricetta in versione VEGETARIANA: elimina carne e pesce sostituendoli con alternative adeguate (uova e latticini sono ammessi).",
  senzaglutine: "Adatta la ricetta in versione SENZA GLUTINE: sostituisci farine e ingredienti con glutine con alternative senza glutine, regolando dosi/liquidi se serve.",
  senzalattosio: "Adatta la ricetta in versione SENZA LATTOSIO: sostituisci latte, burro, panna e formaggi con alternative senza lattosio.",
  leggero: "Adatta la ricetta in versione PIÙ LEGGERA: riduci grassi e zuccheri, usa metodi di cottura più leggeri e alleggerisci gli ingredienti mantenendo il gusto."
};
async function handleConvert(request, env) {
  if (request.method !== "POST") return json({ error: "method", message: "Usa POST" }, 405);
  if (!env || !env.AI) return json({ error: "noai", message: "Workers AI non collegato (binding AI mancante)." }, 200);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "badreq" }, 400); }
  const diet = String((body && body.diet) || "").toLowerCase();
  if (!DIET_PROMPTS[diet]) return json({ error: "baddiet", message: "Dieta non valida" }, 400);
  const title = String((body && body.title) || "").slice(0, 140);
  const ingredients = Array.isArray(body.ingredients) ? body.ingredients.map((x) => String(x)).slice(0, 50) : [];
  const steps = Array.isArray(body.steps) ? body.steps.map((x) => String(x)).slice(0, 50) : [];
  if (!ingredients.length) return json({ error: "norecipe", message: "Ricetta insufficiente" }, 400);
  const sys = `Sei uno chef esperto di cucina adattata. ${DIET_PROMPTS[diet]} Mantieni il piatto realistico e gustoso. Rispondi SOLO con JSON valido: {"title": string, "servings": number|null, "ingredients": [string], "steps": [string], "note": string}. Il titolo deve indicare la variante (es. "... (vegano)"). Gli ingredienti come stringhe "quantità + nome". La nota (1 frase) spiega le sostituzioni principali. Tutto in italiano, nessun markdown.`;
  const userMsg = `Ricetta originale: ${title}\nIngredienti:\n${ingredients.join("\n")}\n\nPreparazione:\n${steps.join("\n")}`;
  try {
    const raw = await aiText(env, [{ role: "system", content: sys }, { role: "user", content: userMsg.slice(0, 3500) }], 1000, RECIPE_SCHEMA);
    const r = extractJson(raw);
    if (!r || !r.title || !Array.isArray(r.ingredients)) return json({ error: "parse", message: "Non sono riuscito ad adattare la ricetta. Riprova." }, 200);
    return json({
      title: String(r.title).slice(0, 140),
      servings: Number(r.servings) > 0 ? Math.min(20, Math.round(Number(r.servings))) : null,
      ingredients: r.ingredients.map((x) => String(x)).slice(0, 50),
      steps: Array.isArray(r.steps) ? r.steps.map((x) => String(x)).slice(0, 50) : [],
      note: String(r.note || "").slice(0, 300)
    }, 200);
  } catch (e) { return json({ error: "aifail", message: "Servizio AI non disponibile ora. Riprova tra poco." + (e && (e.detail || e.message) ? " (" + String(e.detail || e.message).slice(0, 140) + ")" : "") }, 200); }
}

// "Chiedi a Fornelli": risponde a una domanda sull'app usando SOLO le voci di
// manuale fornite dal client, e indica l'id della voce più pertinente (per il
// bottone "Aprilo per me"). Non inventa azioni. POST { question, topics:[{id,title,answer}] }.
async function handleAppHelp(request, env) {
  if (request.method !== "POST") return json({ error: "method", message: "Usa POST" }, 405);
  if (!env || !env.AI) return json({ error: "noai", message: "Workers AI non collegato (binding AI mancante)." }, 200);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "badreq" }, 400); }
  const question = String((body && body.question) || "").trim().slice(0, 400);
  const topics = Array.isArray(body.topics) ? body.topics.filter((t) => t && t.id).slice(0, 8) : [];
  if (!question || !topics.length) return json({ error: "few", message: "Domanda o voci mancanti" }, 200);
  const sys = "Sei l'assistente dell'app di ricette \"Fornelli\". Ti fornisco alcune VOCI del manuale (id, titolo, risposta). Rispondi alla domanda dell'utente in italiano, in modo BREVE (max 3 frasi), gentile e pratico, USANDO SOLO le informazioni di queste voci. Se la domanda non riguarda queste voci, dillo gentilmente e invita ad aprire la guida. Indica anche l'id della voce più pertinente (o stringa vuota). Rispondi SOLO con JSON valido: {\"reply\": string, \"id\": string}. Nessun markdown.";
  const userMsg = "Domanda: " + question + "\n\nVoci del manuale:\n" + topics.map((t) => `[${t.id}] ${String(t.title || "")}: ${String(t.answer || "")}`).join("\n");
  try {
    const raw = await aiText(env, [{ role: "system", content: sys }, { role: "user", content: userMsg.slice(0, 3500) }], 400);
    const r = extractJson(raw) || {};
    const validIds = new Set(topics.map((t) => t.id));
    return json({ reply: String(r.reply || "").slice(0, 600), id: validIds.has(r.id) ? r.id : "" }, 200);
  } catch (e) { return json({ error: "aifail", message: "Assistente non disponibile ora." + (e && (e.detail || e.message) ? " (" + String(e.detail || e.message).slice(0, 120) + ")" : "") }, 200); }
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
