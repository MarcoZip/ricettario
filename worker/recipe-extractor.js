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

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const target = new URL(request.url).searchParams.get("url");
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

    // Siti dietro una "sfida" anti-bot (Cloudflare, ecc.): non leggibili automaticamente.
    if (res.status === 403 || res.status === 503 || res.status === 429) {
      return json({ error: "blocked", message: "Questo sito blocca la lettura automatica." }, 200);
    }
    if (!res.ok) return json({ error: "unreachable", message: "Pagina non raggiungibile" }, 502);

    html = await res.text();
    if (/Just a moment\.\.\.|cf-browser-verification|Checking your browser|challenge-platform|Attention Required/i.test(html)) {
      return json({ error: "blocked", message: "Questo sito blocca la lettura automatica." }, 200);
    }

    const recipe = extractRecipe(html) || extractMicrodata(html);
    if (!recipe) return json({ error: "notfound", message: "Nessuna ricetta strutturata trovata" }, 404);
    return json(recipe, 200);
  }
};

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

  return { title: clean(n.name) || "", image: image || "", servings, ingredients, steps };
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
