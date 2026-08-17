// Facciata unica per i dati. La UI parla SOLO con questo modulo e non sa se
// dietro c'è il salvataggio locale o quello cloud.

import { createLocalAdapter, setLocalWriteErrorHandler } from "./store-local.js";
import { combine, categorize } from "./ingredients.js";
import { logPurchase } from "./restock.js";

let adapter = null;
// L'app registra qui una funzione per avvisare l'utente se il salvataggio locale
// fallisce (di solito: memoria del telefono piena per via delle foto).
let saveErrorNotifier = null;
export function onSaveError(fn) { saveErrorNotifier = fn; setLocalWriteErrorHandler(() => { if (saveErrorNotifier) saveErrorNotifier(); }); }
let state = { tools: [], recipes: [], shopping: [], plan: [], pantry: [], menus: [], events: [], freezer: [] };
const subscribers = new Set();

function notify() {
  for (const cb of subscribers) cb(state);
}

export function subscribe(cb) {
  subscribers.add(cb);
  cb(state);
  return () => subscribers.delete(cb);
}

export function getMode() {
  return adapter ? adapter.mode : "local";
}

// In una Casa condivisa (solo cloud), marca chi aggiunge un articolo, così
// l'altro riceve l'avviso "X ha aggiunto…". Vuoto se non condivisa.
function shoppingAuthor() {
  try {
    const hh = (localStorage.getItem("ricettario.household") || "").trim();
    if (!hh || getMode() !== "cloud") return "";
    return (localStorage.getItem("ricettario.nickname") || "").trim() || "Qualcuno";
  } catch (e) { return ""; }
}

function newId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(16).slice(2);
}

function now() {
  return new Date().toISOString();
}

// ---- Inizializzazione ----
export async function initLocal() {
  adapter = createLocalAdapter();
  await adapter.start((s) => {
    state = s;
    notify();
  });
  if (state.tools.length === 0) await seedDefaults();
}

export async function initCloud(userId, { seedIfEmpty = false } = {}) {
  const { createFirebaseAdapter } = await import("./store-firebase.js");
  adapter = await createFirebaseAdapter(userId);
  await adapter.start((s) => {
    state = s;
    notify();
    riconciliaSpesa();
  });
  if (seedIfEmpty && state.tools.length === 0) await seedDefaults();
}

// ---- Strumenti di cottura predefiniti ----
const DEFAULT_TOOLS = [
  { name: "Friggitrice ad aria", icon: "fan" },
  { name: "Forno", icon: "oven" },
  { name: "Piano a induzione", icon: "lightning" },
  { name: "Fornello a gas", icon: "fire" },
  { name: "Vaporiera", icon: "wind" },
  { name: "Pentola a pressione", icon: "cooking-pot" },
  { name: "Microonde", icon: "bowl-steam" },
  { name: "Barbecue", icon: "fire" },
  { name: "Planetaria", icon: "cake" },
  { name: "Tostapane", icon: "bread" },
  { name: "Wok", icon: "bowl-food" }
];

// Aggiunge gli strumenti predefiniti che mancano (per nome). Non duplica quelli
// già presenti e non tocca quelli personalizzati. Ritorna quanti ne ha aggiunti.
export async function seedDefaults() {
  const existing = new Set(state.tools.map((t) => (t.name || "").toLowerCase().trim()));
  let order = state.tools.length ? Math.max(...state.tools.map((t) => t.order ?? 0)) + 1 : 0;
  let added = 0;
  for (const t of DEFAULT_TOOLS) {
    if (existing.has(t.name.toLowerCase())) continue;
    await adapter.addTool({ id: newId(), name: t.name, icon: t.icon, order: order++, createdAt: now() });
    added++;
  }
  return added;
}

// ---- Letture (sincrone, dallo stato in memoria) ----
export function getTools() {
  // `a.name || ""`: un backup ritoccato a mano può contenere uno strumento senza
  // nome, e qui si esplode a OGNI disegno della Home — cioè dopo che l'import ha
  // già sostituito i dati, lasciando l'app inutilizzabile.
  return [...state.tools].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name || "").localeCompare(String(b.name || "")));
}

export function getTool(id) {
  return state.tools.find((t) => t.id === id) || null;
}

// Sposta uno strumento su (-1) o giù (+1) nell'ordine, riscrivendo i campi order.
export async function moveTool(id, dir) {
  const arr = getTools();
  const i = arr.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return;
  const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  for (let k = 0; k < arr.length; k++) {
    if ((arr[k].order ?? null) !== k) await adapter.updateTool(arr[k].id, { order: k });
  }
}

export function getRecipesByTool(toolId) {
  return state.recipes
    .filter((r) => r.toolId === toolId)
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export function countRecipes(toolId) {
  return state.recipes.filter((r) => r.toolId === toolId).length;
}

export function getRecipe(id) {
  return state.recipes.find((r) => r.id === id) || null;
}

// ---- Scritture ----
export async function addTool({ name, icon, model, howto }) {
  const order = state.tools.length ? Math.max(...state.tools.map((t) => t.order ?? 0)) + 1 : 0;
  await adapter.addTool({
    id: newId(), name: name.trim(), icon: icon || "🍽️", order,
    model: (model || "").trim(),   // es. "Samsung Dual Cook NV7B5740TBS": chiesto una volta, resta salvato
    howto: (howto || "").trim(),   // note dell'utente su come si imposta (dal manuale)
    createdAt: now()
  });
}

export async function updateTool(id, patch) {
  await adapter.updateTool(id, patch);
}

export async function deleteTool(id) {
  await adapter.deleteTool(id);
}

export async function addRecipe({ toolId, title, url, notes, ingredients, servings, steps, favorite, rating, photo, tags, time, allergens, difficulty, videoUrl, source }) {
  await adapter.addRecipe({
    id: newId(),
    toolId,
    title: title.trim(),
    url: (url || "").trim(),
    notes: (notes || "").trim(),
    ingredients: Array.isArray(ingredients) ? ingredients : [],
    servings: servings || null,
    time: time || null,
    difficulty: difficulty || null,
    allergens: Array.isArray(allergens) ? allergens : [],
    steps: Array.isArray(steps) ? steps : [],
    favorite: Boolean(favorite),
    rating: rating || 0,
    photo: photo || "",
    tags: Array.isArray(tags) ? tags : [],
    videoUrl: (videoUrl || "").trim(),
    source: source || "",
    createdAt: now(),
    updatedAt: now()
  });
}

// Tutti i tag usati (per i filtri).
export function getAllTags() {
  const set = new Set();
  for (const r of state.recipes) for (const t of r.tags || []) set.add(t);
  return [...set].sort((a, b) => a.localeCompare(b));
}

// Tutte le ricette (per ricerca e selettori).
export function getAllRecipes() {
  return [...state.recipes];
}
export function getFavorites() {
  return state.recipes.filter((r) => r.favorite);
}
export function searchRecipes(q) {
  const s = (q || "").toLowerCase().trim();
  if (!s) return [];
  const toolName = (r) => { const t = state.tools.find((x) => x.id === r.toolId); return t ? (t.name || "").toLowerCase() : ""; };
  // Stesso trattamento della ricerca online: accenti tolti e singolare/plurale
  // equivalenti. Senza, cercare "torta mela" nel PROPRIO ricettario non trovava
  // "Torta di mele" mentre online funzionava — due comportamenti diversi per la
  // stessa cosa scritta nella stessa casella.
  // Il confronto è per PAROLA, non per sottostringa: cercando "mela" non devono
  // uscire le marmellate né la pancetta cercando "pane" (vedi stessaParola).
  const contiene = (testo, term) => {
    const cercate = paroleDi(term);
    if (!cercate.length) return false;
    const parole = paroleDi(testo);
    return cercate.every((tp) => parole.some((p) => stessaParola(p, tp)));
  };
  const matchesTerm = (r, term) =>
    contiene(r.title || "", term) ||
    (r.tags || []).some((t) => contiene(t || "", term)) ||
    (r.ingredients || []).some((i) => contiene(i.name || "", term)) ||
    // Anche nelle NOTE: sono le annotazioni scritte a mano ("meno sale", "per il
    // compleanno di Anna") ed erano l'unica cosa dell'app che non si poteva più
    // ritrovare. NON nei passi, invece: cercando "sale" mezzo ricettario
    // risponderebbe, riportando il rumore tolto con il filtro di pertinenza.
    contiene(r.notes || "", term) ||
    contiene(toolName(r), term); // così "costolette friggitrice" filtra anche per strumento
  // Più parole (separate da spazi, virgole o " e ") devono comparire TUTTE —
  // ma le PAROLINE di servizio vanno tolte dall'elenco, non pretese. Scrivendo
  // "torta di mele" il "di" non compare da nessuna parte come parola portante,
  // quindi preteso insieme alle altre azzerava ogni risultato: cercare il
  // titolo esatto di una ricetta non ne trovava nessuna.
  const terms = s.split(/[\s,]+/).map((t) => t.trim()).filter((t) => t && paroleDi(t).length);
  if (!terms.length) return [];
  if (terms.length > 1) return state.recipes.filter((r) => terms.every((term) => matchesTerm(r, term)));
  return state.recipes.filter((r) => matchesTerm(r, terms[0]));
}
export function getByTag(tag) {
  const t = (tag || "").toLowerCase();
  return state.recipes.filter((r) => (r.tags || []).some((x) => (x || "").toLowerCase() === t));
}

// Statistiche cucina.
// Ritorna true se la cottura è stata contata, false se era un doppione scartato:
// chi chiama deve dirlo all'utente, altrimenti il tocco sembra riuscito ma non lo è.
export async function markCooked(id) {
  const r = getRecipe(id);
  if (!r) return false;
  // Finendo la Modalità cucina la ricetta viene già segnata: se subito dopo si
  // tocca anche "Segna come cucinata" la stessa cena verrebbe contata due volte
  // (falsando statistiche, diario e sfide). Ignoriamo il doppione ravvicinato.
  if (r.lastCooked) {
    const passati = Date.now() - new Date(r.lastCooked).getTime();
    if (isFinite(passati) && passati >= 0 && passati < 30 * 60 * 1000) return false;
  }
  const log = Array.isArray(r.cookLog) ? r.cookLog.slice(-99) : [];
  log.push(now());
  await adapter.updateRecipe(id, { cookCount: (r.cookCount || 0) + 1, lastCooked: now(), cookLog: log });
  return true;
}

// Diario: tutte le volte che hai cucinato, con data, dalla più recente.
export function getCookDiary(limit = 60) {
  const events = [];
  for (const r of state.recipes) {
    for (const ts of (r.cookLog || [])) events.push({ recipeId: r.id, title: r.title, ts });
  }
  events.sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));
  return events.slice(0, limit);
}
export function getMostCooked() {
  return state.recipes.filter((r) => (r.cookCount || 0) > 0).sort((a, b) => (b.cookCount || 0) - (a.cookCount || 0));
}
export function getRecentCooked() {
  return state.recipes.filter((r) => r.lastCooked).sort((a, b) => (b.lastCooked || "").localeCompare(a.lastCooked || ""));
}

export async function updateRecipe(id, patch) {
  await adapter.updateRecipe(id, { ...patch, updatedAt: now() });
}

export async function deleteRecipe(id) {
  await adapter.deleteRecipe(id);
}

// ---- Lista della spesa ----
export function getShopping() {
  return [...state.shopping];
}

function shopKey(it) {
  return (it.name || "").toLowerCase().trim() + "|" + (it.unit || "").toLowerCase();
}

// In Casa condivisa due telefoni che aggiungono lo stesso articolo nello stesso
// istante non si vedono a vicenda — ognuno decide guardando la propria copia
// della lista — e creano due voci identiche. Senza transazioni non si può
// impedire la collisione, ma la si può RIPARARE: a ogni aggiornamento le voci
// non spuntate con la stessa chiave vengono fuse in una sola.
//
// È deterministica di proposito: vince sempre l'id più piccolo e le quantità si
// sommano allo stesso modo ovunque, quindi se entrambi i telefoni la eseguono
// insieme scrivono lo stesso identico risultato e cancellano lo stesso perdente
// (ricancellare un documento già sparito non fa niente). Gli articoli già
// spuntati non si toccano mai, per non far riapparire nella lista una cosa che
// hai già messo nel carrello.
let riconciliaInCorso = false;
async function riconciliaSpesa() {
  if (riconciliaInCorso || getMode() !== "cloud") return;
  const gruppi = new Map();
  for (const s of state.shopping) {
    if (s.checked) continue;
    const k = shopKey(s);
    if (!gruppi.has(k)) gruppi.set(k, []);
    gruppi.get(k).push(s);
  }
  const doppioni = [...gruppi.values()].filter((g) => g.length > 1);
  if (!doppioni.length) return;
  riconciliaInCorso = true;
  try {
    for (const g of doppioni) {
      const ord = g.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
      const vincitore = ord[0];
      const perdenti = ord.slice(1);
      // `assorbiti` è la memoria di quali doppioni sono GIÀ stati sommati qui
      // dentro. Senza, il secondo telefono può vedere il vincitore già
      // aggiornato ma il perdente non ancora cancellato — Firestore consegna le
      // modifiche una alla volta — e sommare una seconda volta la stessa
      // quantità: due bottiglie di latte diventavano tre. Con la memoria, la
      // fusione si può rieseguire quante volte si vuole e dà sempre lo stesso
      // risultato, da qualunque telefono.
      const assorbiti = new Set(Array.isArray(vincitore.mergedIds) ? vincitore.mergedIds : []);
      let qty = vincitore.qty;
      const from = new Set(String(vincitore.from || "").split(",").map((x) => x.trim()).filter(Boolean));
      let nuovi = false;
      for (const p of perdenti) {
        if (assorbiti.has(p.id)) continue; // già sommato in un giro precedente
        assorbiti.add(p.id);
        nuovi = true;
        if (p.qty != null) qty = qty != null ? qty + p.qty : p.qty;
        String(p.from || "").split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => from.add(x));
      }
      if (nuovi) {
        await adapter.updateShopping(vincitore.id, {
          qty: qty != null ? qty : null,
          from: [...from].join(", "),
          mergedIds: [...assorbiti].slice(-20) // non far crescere la lista all'infinito
        });
      }
      for (const p of perdenti) await adapter.deleteShopping(p.id);
    }
  } catch (e) {
    // Offline o permessi: si riproverà da sé al prossimo aggiornamento.
  } finally {
    riconciliaInCorso = false;
  }
}

// Aggiunge una lista di ingredienti, unendo quelli uguali (anche con l'esistente).
export async function addShoppingItems(rawItems) {
  const merged = combine(rawItems.filter((i) => i && i.name));
  let added = 0;
  let skipped = 0;
  const addedNames = [];
  for (const it of merged) {
    if (inPantry(it.name)) { skipped++; continue; } // già in dispensa
    addedNames.push(it.name);
    const key = shopKey(it);
    const existing = state.shopping.find((s) => !s.checked && shopKey(s) === key);
    if (existing) {
      const qty = existing.qty != null && it.qty != null ? existing.qty + it.qty : (existing.qty != null ? existing.qty : it.qty);
      const patch = { qty };
      if (it.from) { // unisci l'origine (ricetta) senza duplicati
        const set = new Set((existing.from || "").split(",").map((x) => x.trim()).filter(Boolean));
        it.from.split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => set.add(x));
        patch.from = [...set].join(", ");
      }
      await adapter.updateShopping(existing.id, patch);
    } else {
      await adapter.addShopping({
        id: newId(),
        name: it.name,
        qty: it.qty != null ? it.qty : null,
        unit: it.unit || "",
        category: it.category || categorize(it.name),
        from: it.from || "",
        checked: false,
        order: state.shopping.filter((s) => !s.checked).length,
        by: shoppingAuthor(),
        createdAt: now()
      });
    }
    added++;
  }
  // Casa condivisa: avvisa l'altra persona (push, anche ad app chiusa).
  if (addedNames.length && shoppingAuthor()) {
    try { const p = await import("./push.js"); p.notifyHousehold(addedNames); } catch (e) { /* ignora */ }
  }
  return { added, skipped };
}

export async function toggleShoppingItem(id, checked) {
  await adapter.updateShopping(id, { checked });
}
// Ordine manuale della lista: assicura un campo `order` su tutti gli articoli
// attivi e scambia due posizioni adiacenti.
export function shoppingActiveOrdered() {
  const active = state.shopping.filter((s) => !s.checked);
  return active.sort((a, b) => {
    const oa = a.order != null ? a.order : Number.MAX_SAFE_INTEGER;
    const ob = b.order != null ? b.order : Number.MAX_SAFE_INTEGER;
    if (oa !== ob) return oa - ob;
    return (a.createdAt || "").localeCompare(b.createdAt || "");
  });
}
export async function moveShoppingItem(id, dir) {
  const ord = shoppingActiveOrdered();
  const i = ord.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ord.length) return;
  [ord[i], ord[j]] = [ord[j], ord[i]];
  // Riassegna gli indici e salva solo quelli cambiati.
  for (let k = 0; k < ord.length; k++) {
    if (ord[k].order !== k) await adapter.updateShopping(ord[k].id, { order: k });
  }
}
export async function updateShoppingItem(id, patch) {
  await adapter.updateShopping(id, patch);
}
export async function deleteShoppingItem(id) {
  await adapter.deleteShopping(id);
}
export async function clearCheckedShopping() {
  const ids = state.shopping.filter((s) => s.checked).map((s) => s.id);
  if (ids.length) await adapter.clearShopping(ids);
}
export async function clearAllShopping() {
  const ids = state.shopping.map((s) => s.id);
  if (ids.length) await adapter.clearShopping(ids);
}
// Sposta gli articoli "presi" (spuntati) nella dispensa e li toglie dalla lista.
export async function moveCheckedToPantry() {
  const checked = state.shopping.filter((s) => s.checked);
  for (const s of checked) await addPantryItem(s.name);
  const ids = checked.map((s) => s.id);
  if (ids.length) await adapter.clearShopping(ids);
  return checked.length;
}

// Alimenti in dispensa in scadenza entro N giorni (inclusi gli scaduti).
export function getExpiringPantry(days = 3) {
  const t = new Date();
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const res = [];
  for (const p of state.pantry) {
    if (!p.expiry) continue;
    const [y, m, d] = p.expiry.split("-").map(Number);
    const diff = Math.round((new Date(y, m - 1, d) - today) / 86400000);
    if (diff <= days) res.push({ ...p, days: diff });
  }
  return res.sort((a, b) => a.days - b.days);
}

// ---- Menu / collezioni ----
export function getMenus() {
  return [...state.menus].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}
export function getMenu(id) {
  return state.menus.find((m) => m.id === id) || null;
}
export async function addMenu(name) {
  const clean = (name || "").trim();
  if (!clean) return null;
  const id = newId();
  await adapter.addMenu({ id, name: clean, recipeIds: [], createdAt: now() });
  return id;
}
export async function renameMenu(id, name) {
  await adapter.updateMenu(id, { name: (name || "").trim() });
}
export async function deleteMenu(id) {
  await adapter.deleteMenu(id);
}
export async function toggleRecipeInMenu(menuId, recipeId) {
  const m = getMenu(menuId);
  if (!m) return;
  const ids = Array.isArray(m.recipeIds) ? [...m.recipeIds] : [];
  const i = ids.indexOf(recipeId);
  if (i >= 0) ids.splice(i, 1); else ids.push(recipeId);
  await adapter.updateMenu(menuId, { recipeIds: ids });
}
export function getMenuRecipes(id) {
  const m = getMenu(id);
  if (!m) return [];
  return (m.recipeIds || []).map((rid) => getRecipe(rid)).filter(Boolean);
}

// ---- Menù delle feste (eventi) ----
// Un evento è un menù importante salvabile e riusabile, con piatti per portata,
// metadati di preparazione (quando prepararlo, forno, ospiti) e l'ora "in tavola".
export function getEvents() {
  return [...state.events].sort((a, b) => (b.servingAt || "").localeCompare(a.servingAt || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
}
export function getEvent(id) {
  return state.events.find((e) => e.id === id) || null;
}
export async function addEvent(ev) {
  const id = newId();
  const rec = {
    id,
    name: (ev && ev.name || "").trim() || "Menù delle feste",
    servingAt: ev && ev.servingAt || null,
    guests: ev && ev.guests || null,
    dishes: ev && Array.isArray(ev.dishes) ? ev.dishes : [],
    notes: ev && ev.notes || "",
    createdAt: now(),
    updatedAt: now()
  };
  await adapter.addEvent(rec);
  return id;
}
export async function updateEvent(id, patch) {
  await adapter.updateEvent(id, { ...patch, updatedAt: now() });
}
export async function deleteEvent(id) {
  await adapter.deleteEvent(id);
}
// ---- Congelatore (porziona e congela) ----
export function getFreezer() {
  return [...state.freezer].sort((a, b) => (a.bestBefore || "").localeCompare(b.bestBefore || ""));
}
export async function addFreezer(item) {
  const id = newId();
  const rec = {
    id,
    title: (item && item.title || "").trim() || "Piatto",
    recipeId: item && item.recipeId || null,
    portions: item && item.portions || 1,
    frozenAt: item && item.frozenAt || now().slice(0, 10),
    bestBefore: item && item.bestBefore || null,
    note: item && item.note || "",
    createdAt: now()
  };
  await adapter.addFreezer(rec);
  return id;
}
export async function updateFreezer(id, patch) {
  await adapter.updateFreezer(id, patch);
}
export async function deleteFreezer(id) {
  await adapter.deleteFreezer(id);
}

// Crea un nuovo evento partendo da uno esistente (per "rifare" un menù un altro anno).
export async function duplicateEvent(id, newName) {
  const e = getEvent(id);
  if (!e) return null;
  return addEvent({ name: (newName || (e.name + " (copia)")), servingAt: null, guests: e.guests, notes: e.notes,
    dishes: (e.dishes || []).map((d) => ({ ...d, id: newId() })) });
}

// ---- Piano settimanale / calendario ----
export function getPlan() {
  return [...state.plan];
}
export function getPlanByDate(date) {
  return state.plan.filter((p) => p.date === date);
}
export function countPlanByDate(date) {
  return state.plan.filter((p) => p.date === date).length;
}
export async function addPlan(date, recipeId, slot = null) {
  await adapter.addPlan({ id: newId(), date, recipeId, slot: slot || null, createdAt: now() });
}
export async function deletePlan(id) {
  await adapter.deletePlan(id);
}

// ---- Dispensa ----
export function getPantry() {
  return [...state.pantry];
}
// Normalizza per confrontare due nomi di alimento: minuscole, senza accenti né
// punteggiatura, e senza l'ultima lettera sulle parole lunghe (pomodoro/pomodori).
function normAlimento(s) {
  return String(s || "").toLowerCase()
    .replace(/[àáâä]/g, "a").replace(/[èéêë]/g, "e").replace(/[ìíîï]/g, "i")
    .replace(/[òóôö]/g, "o").replace(/[ùúûü]/g, "u")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
    // "fichi" → "fici", "maghi" → "magi": in italiano il plurale di fico/mago
    // infila una h che altrimenti fa sembrare diverse due forme della stessa
    // parola. Va tolta PRIMA di tagliare la desinenza.
    .replace(/chi\b/g, "ci").replace(/ghi\b/g, "gi")
    .split(" ").map((w) => (w.length >= 4 ? w.slice(0, -1) : w)).join(" ");
}
// Paroline di servizio e unità di misura: non identificano nulla. Si scartano
// guardando la parola INTERA, prima del taglio della desinenza — altrimenti si
// perderebbe il caso opposto: "pere" è una parola vera che una volta accorciata
// diventa "per", e va tenuta.
const PAROLINE = new Set(["di", "da", "in", "con", "su", "per", "tra", "fra", "a", "al", "allo", "alla", "ai", "agli", "alle",
  "del", "dello", "della", "dei", "degli", "delle", "dal", "dalla", "nel", "nella", "sul", "sulla",
  "il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "e", "ed", "o", "che", "non", "piu",
  "gr", "kg", "ml", "cl", "dl", "qb", "q", "b", "circa", "tipo"]);
// Solo le lettere e i numeri, senza accenti: la forma "cruda" di ogni parola.
function paroleCrude(s) {
  return String(s || "").toLowerCase()
    .replace(/[àáâä]/g, "a").replace(/[èéêë]/g, "e").replace(/[ìíîï]/g, "i")
    .replace(/[òóôö]/g, "o").replace(/[ùúûü]/g, "u")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
    .split(" ").filter(Boolean);
}
// Parole "portanti" di un testo, già ridotte alla forma confrontabile.
function paroleDi(s) {
  return paroleCrude(s)
    .filter((w) => w.length >= 3 && !PAROLINE.has(w))
    .map((w) => normAlimento(w))
    .filter(Boolean);
}
// Due parole indicano la stessa cosa? Solo se combaciano ESATTAMENTE dopo la
// normalizzazione (accenti via, h del plurale via, ultima lettera tagliata).
//
// Niente tolleranze sulla lunghezza, per quanto sembrino innocue: con la
// sottostringa "mela" trovava "marMELlata"; concedendo anche solo due caratteri
// in più, "pane" trovava "panna" e "pera" i "peperoni". Il taglio della
// desinenza basta già da solo a far combaciare singolare e plurale.
function stessaParola(a, b) {
  return !!a && a === b;
}
// Confronto ESATTO (a meno di accenti e singolare/plurale). Prima si accettava
// la sottostringa nei due versi, e "latte di cocco" spariva dalla spesa perché
// in dispensa c'era del "latte": l'app diceva "è già in dispensa" e l'ingrediente
// non veniva comprato. Meglio sbagliare comprando due volte la farina che
// tornare a casa senza il latte di cocco.
// "Ho già questo ingrediente?" Il confronto è VOLUTAMENTE a senso unico: hai
// l'ingrediente se in dispensa c'è qualcosa di ALMENO altrettanto specifico.
//   dispensa "latte intero"  + ricetta "latte"          → sì, ce l'hai
//   dispensa "latte"         + ricetta "latte di cocco" → no, è un'altra cosa
// Il verso sbagliato è quello che faceva sparire il latte di cocco dalla spesa;
// pretendere invece l'uguaglianza esatta faceva ricomprare il latte perché in
// dispensa era scritto "latte intero".
export function inPantry(name) {
  const cercate = paroleDi(name);
  if (!cercate.length) return false;
  return state.pantry.some((p) => {
    const hai = paroleDi(p.name);
    if (!hai.length) return false;
    return cercate.every((c) => hai.some((h) => stessaParola(c, h)));
  });
}
export async function addPantryItem(name, expiry = null) {
  const clean = (name || "").trim();
  if (!clean) return;
  const existing = state.pantry.find((p) => (p.name || "").toLowerCase().trim() === clean.toLowerCase());
  if (existing) {
    if (expiry && existing.expiry !== expiry) await adapter.updatePantry(existing.id, { expiry });
    return;
  }
  await adapter.addPantry({ id: newId(), name: clean, expiry: expiry || null, createdAt: now() });
  try { logPurchase(clean); } catch (e) { /* restock è best-effort */ }
}
export async function setPantryExpiry(id, expiry) {
  await adapter.updatePantry(id, { expiry: expiry || null });
}
export async function setPantryQty(id, qty) {
  await adapter.updatePantry(id, { qty: (qty || "").trim() || null });
}
// Scorta di base ("sempre in casa"): quando finisce, va proposta per il riacquisto.
export async function setPantryBase(id, on) {
  await adapter.updatePantry(id, { base: !!on });
}
export async function deletePantryItem(id) {
  await adapter.deletePantry(id);
}

// Ricette che usano alimenti in scadenza entro N giorni (anti-spreco).
export function recipesForExpiring(days = 3) {
  const exp = getExpiringPantry(days);
  const names = exp.map((e) => (e.name || "").toLowerCase().trim()).filter(Boolean);
  if (!names.length) return [];
  const res = [];
  for (const r of state.recipes) {
    let count = 0;
    for (const it of (r.ingredients || [])) {
      const n = (it.name || "").toLowerCase().trim();
      if (n && names.some((en) => n.includes(en) || en.includes(n))) count++;
    }
    if (count) res.push({ r, count });
  }
  return res.sort((a, b) => b.count - a.count).map((x) => x.r);
}

// Suggerisce ricette in base a ciò che è in dispensa. Restituisce anche gli
// ingredienti mancanti, così l'app può dire "ti mancano solo 2 cose" e ordinare
// in cima le ricette più vicine ad essere pronte.
export function suggestFromPantry() {
  if (!state.pantry.length) return [];
  const res = [];
  for (const r of state.recipes) {
    const ings = r.ingredients || [];
    if (!ings.length) continue;
    let have = 0;
    const missing = [];
    for (const it of ings) {
      if (inPantry(it.name)) have++;
      else if (it.name) missing.push(it.name);
    }
    if (have > 0) res.push({ recipe: r, have, total: ings.length, missing });
  }
  res.sort((a, b) => a.missing.length - b.missing.length || b.have / b.total - a.have / a.total || b.have - a.have);
  return res;
}

// ---- Statistiche accessi (solo modalità cloud / admin) ----
export async function recordAccess(email) {
  if (adapter && adapter.recordAccess) await adapter.recordAccess(email);
}
export async function getAccessStats() {
  return adapter && adapter.getAccessStats ? adapter.getAccessStats() : [];
}

// ---- Esporta / Importa (backup manuale) ----
export function exportData() {
  return { version: 6, exportedAt: now(), tools: state.tools, recipes: state.recipes, shopping: state.shopping, plan: state.plan, pantry: state.pantry, menus: state.menus, events: state.events, freezer: state.freezer };
}

// ---- Rete di sicurezza dei dati ----
// Il backup esportato è l'unica copia delle ricette di famiglia, e finora
// dipendeva dal fatto che qualcuno si ricordasse di premere "Esporta". Qui
// l'app se ne occupa da sola, e soprattutto rende ANNULLABILE il ripristino,
// che è l'unica operazione distruttiva dell'app — e quella che ha già ceduto
// tre volte (v8.32, v8.41, v8.51).
const BK_AUTO = "ricettario.backupAuto";
const BK_PRIMA = "ricettario.backupPrimaDelRipristino";
// Deposito di passaggio: ci si mette lo stato attuale mentre "Torna com'era" è
// in corso, e diventa la copia automatica solo a operazione riuscita.
const BK_TEMP = "ricettario.backupInCorso";

function scriviCopia(chiave, dati) {
  const testo = JSON.stringify(dati);
  try {
    localStorage.setItem(chiave, testo);
    return true;
  } catch (e) {
    // Memoria piena. Solo la copia "prima del ripristino" può farsi spazio
    // buttando quella automatica: è quella che serve ad annullare un disastro
    // in corso. Mai il contrario — un salvataggio automatico che non entra in
    // memoria non deve cancellare la rete di sicurezza, e succederebbe proprio
    // quando la memoria è piena, cioè quando le cose vanno già male.
    // Prima però si butta SEMPRE l'eventuale copia di passaggio rimasta da un
    // ripristino andato male: è la sola che non serve più a nessuno, e finché
    // restava lì occupava spazio a danno delle due che contano.
    let liberato = false;
    try { if (localStorage.getItem(BK_TEMP) != null) { localStorage.removeItem(BK_TEMP); liberato = true; } } catch (e2) {}
    if (liberato) {
      try { localStorage.setItem(chiave, testo); return true; } catch (e3) { /* ancora piena */ }
    }
    if (chiave !== BK_PRIMA) return false;
    try {
      localStorage.removeItem(BK_AUTO);
      localStorage.setItem(chiave, testo);
      return true;
    } catch (e2) { return false; }
  }
}
function leggiCopia(chiave) {
  try {
    const d = JSON.parse(localStorage.getItem(chiave) || "null");
    return d && Array.isArray(d.recipes) ? d : null;
  } catch (e) { return null; }
}

// Vero quando lo stato in memoria è completo, cioè quando è lecito fotografarlo.
// In cloud le 8 collezioni arrivano da 8 ascolti separati: per qualche istante
// dopo l'avvio ci possono essere le ricette e non ancora la dispensa. Una copia
// scattata in quel momento avrebbe `pantry: []` — non "assente", VUOTA — e al
// ripristino cancellerebbe davvero la dispensa. La distinzione "assente ≠ vuoto"
// della v8.51 qui non protegge: protegge dai campi mancanti, non dai campi
// presenti e sbagliati.
export function statoCompleto() {
  return !adapter || !adapter.caricamentoCompleto ? true : adapter.caricamentoCompleto();
}

// Più esigente di `statoCompleto()`: tutte le collezioni hanno risposto **e**
// nessuna ha risposto con un errore. Una collezione che il server ha negato è
// in memoria come lista vuota: perfetta da guardare, disastrosa da fotografare.
// Le due domande vanno tenute separate — "posso procedere?" e "mi posso fidare
// di quello che vedo?" — altrimenti un errore permanente murerebbe il
// ripristino d'emergenza, che è esattamente il momento in cui serve.
export function datiAttendibili() {
  if (!statoCompleto()) return false;
  if (!adapter || !adapter.collezioniInErrore) return true;
  return adapter.collezioniInErrore().length === 0;
}

// Copia automatica, al massimo una al giorno. Silenziosa: se non entra in
// memoria pazienza, non è il momento di disturbare l'utente.
// Ritorna: true se scritta, "attendi" se i dati non sono ancora tutti arrivati
// (chi chiama deve riprovare), false se non serve o non si può.
// C'è qualcosa che si può perdere? Guarda TUTTE le collezioni, non solo le
// ricette: chi ha zero ricette ma la dispensa e il piano pieni ha comunque
// qualcosa da perdere. Serve a tutti e tre i punti che decidono se fare una
// copia — prima era scritta in uno solo, ed è la classica correzione applicata
// all'esemplare invece che alla classe.
function qualcosaDaPerdere() {
  return !!(state.recipes.length || state.tools.length || state.shopping.length ||
    state.plan.length || state.pantry.length || state.menus.length || state.events.length || state.freezer.length);
}

export function backupAutomatico() {
  if (!statoCompleto()) return "attendi";
  // Meglio nessuna copia che una copia falsa. Ma va detto: con una collezione
  // stabilmente irraggiungibile la copia giornaliera si fermerebbe per sempre,
  // ed è proprio il silenzio il difetto che continua a ripresentarsi qui.
  if (!datiAttendibili()) {
    if (!backupAutomatico._avvisato) {
      backupAutomatico._avvisato = true;
      console.warn("Fornelli: copia di sicurezza sospesa — alcuni dati non sono raggiungibili, una copia adesso sarebbe incompleta.");
    }
    return false;
  }
  if (!qualcosaDaPerdere()) return false; // niente da salvare
  const prec = leggiCopia(BK_AUTO);
  if (prec && prec.exportedAt && Date.now() - Date.parse(prec.exportedAt) < 24 * 3600000) return false;
  return scriviCopia(BK_AUTO, exportData());
}

// { quando, ricette, tipo } della copia più recente disponibile, o null.
// Si preferisce SEMPRE la copia "prima del ripristino", non la più recente.
// Sceglierla per data era un errore sottile: la copia automatica fotografa lo
// stato CORRENTE a ogni avvio, quindi dopo un ripristino sbagliato bastava
// riaprire l'app il giorno dopo — cosa che si fa proprio perché qualcosa non
// torna — e "Torna com'era" rimetteva lo stato rotto, con data più recente.
export function copiaSicurezza() {
  const prima = leggiCopia(BK_PRIMA), auto = leggiCopia(BK_AUTO);
  const d = prima || auto;
  if (!d) return null;
  return { quando: d.exportedAt, ricette: (d.recipes || []).length, tipo: prima ? "prima del ripristino" : "automatica" };
}

// Rimette i dati com'erano. Serve dopo un ripristino andato male.
// Le due copie si SCAMBIANO invece di perderne una: lo stato attuale prende il
// posto della copia automatica, e "prima del ripristino" viene consumata. Senza
// questo, "Torna com'era" sarebbe a sua volta irreversibile, e — siccome
// BK_PRIMA aveva priorità assoluta e non scadeva mai — un ripristino fatto a
// gennaio avrebbe continuato a essere la destinazione del pulsante ad agosto,
// oscurando per mesi la copia automatica fresca. Corretto un difetto e creato
// il suo simmetrico: qui si chiudono tutti e due.
export async function ripristinaCopiaSicurezza() {
  const prima = leggiCopia(BK_PRIMA);
  const d = prima || leggiCopia(BK_AUTO); // stessa priorità di copiaSicurezza()
  if (!d) throw new Error("Non c'è nessuna copia di sicurezza.");
  // Lo stato attuale diventa la nuova copia automatica: così anche l'annullamento
  // si annulla. Ma si scrive PRIMA su una chiave temporanea e la si promuove solo
  // a ripristino riuscito: scrivendo subito su BK_AUTO, un ripristino che cade a
  // metà (rete) bruciava l'unica rete di sicurezza di chi non ha BK_PRIMA — al
  // secondo tentativo "Torna com'era" avrebbe rimesso proprio lo stato rotto.
  let temporanea = false;
  if (datiAttendibili() && qualcosaDaPerdere()) temporanea = scriviCopia(BK_TEMP, exportData());
  try {
    await importData(d, { merge: false, saltaCopia: true });
    // Da qui in poi il ripristino è riuscito: si può riorganizzare la rete.
    if (temporanea) {
      try { localStorage.setItem(BK_AUTO, localStorage.getItem(BK_TEMP)); } catch (e) {}
    }
    // Consumata: ha fatto il suo lavoro. Da adesso la copia giusta è quella
    // automatica, che segue l'uso reale invece di restare ferma a mesi fa.
    if (prima) { try { localStorage.removeItem(BK_PRIMA); } catch (e) {} }
  } finally {
    // In un `finally`: se il ripristino fallisce, la copia di passaggio va tolta
    // comunque. Lasciata lì restava quasi un mega di roba che nessuno legge e
    // nessuno cancella — e siccome `scriviCopia` fa spazio sacrificando SOLO la
    // copia automatica, l'immondizia sarebbe sopravvissuta alla rete di
    // sicurezza vera. È il difetto B3 della v8.59, riaperto da una chiave nuova.
    try { localStorage.removeItem(BK_TEMP); } catch (e) {}
  }
  return (d.recipes || []).length;
}

export async function importData(data, { merge = false, saltaCopia = false } = {}) {
  if (!data || !Array.isArray(data.tools) || !Array.isArray(data.recipes)) {
    throw new Error("File di backup non valido.");
  }
  // Sostituire mentre i dati stanno ancora arrivando è pericoloso due volte:
  // la copia di sicurezza fotograferebbe uno stato a metà, e il confronto con
  // quello che c'è già sarebbe fatto su collezioni non ancora consegnate.
  if (!merge && !statoCompleto()) throw new Error("NONPRONTO");
  // Prima di sostituire, si mette da parte com'era: così un ripristino sbagliato
  // si annulla invece di essere definitivo. `saltaCopia` evita che l'annullamento
  // sovrascriva la copia con lo stato rotto che sta annullando.
  // Se una collezione ha risposto con un errore, la copia sarebbe falsa: meglio
  // NON scriverla che scriverne una che al prossimo "Torna com'era" cancella la
  // dispensa. Non si blocca il ripristino — si è già avvisato l'utente che
  // l'annullamento non sarà disponibile (vedi la conferma in ui.js).
  if (!merge && !saltaCopia && qualcosaDaPerdere() && datiAttendibili()) {
    if (!scriviCopia(BK_PRIMA, exportData())) {
      throw new Error("NOCOPIA");
    }
  }
  if (merge) {
    const existingTools = new Set(state.tools.map((t) => t.id));
    const existingRecipes = new Set(state.recipes.map((r) => r.id));
    for (const t of data.tools) if (!existingTools.has(t.id)) await adapter.addTool(t);
    for (const r of data.recipes) if (!existingRecipes.has(r.id)) await adapter.addRecipe(r);
  } else {
    // ATTENZIONE: NON mettere `|| []` qui. Una collezione ASSENTE dal file e una
    // collezione VUOTA sono due cose diverse: un backup esportato prima che il
    // congelatore esistesse non ha quel campo, e trasformarlo in lista vuota
    // farebbe cancellare tutto il congelatore di oggi. Assente = non toccare.
    await adapter.replaceAll({
      tools: data.tools, recipes: data.recipes,
      shopping: data.shopping, plan: data.plan, pantry: data.pantry,
      menus: data.menus, events: data.events, freezer: data.freezer
    });
  }
}
