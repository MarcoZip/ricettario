// Facciata unica per i dati. La UI parla SOLO con questo modulo e non sa se
// dietro c'è il salvataggio locale o quello cloud.

import { createLocalAdapter } from "./store-local.js";
import { combine, categorize } from "./ingredients.js";

let adapter = null;
let state = { tools: [], recipes: [], shopping: [], plan: [], pantry: [], menus: [] };
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
  return [...state.tools].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
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
export async function addTool({ name, icon }) {
  const order = state.tools.length ? Math.max(...state.tools.map((t) => t.order ?? 0)) + 1 : 0;
  await adapter.addTool({ id: newId(), name: name.trim(), icon: icon || "🍽️", order, createdAt: now() });
}

export async function updateTool(id, patch) {
  await adapter.updateTool(id, patch);
}

export async function deleteTool(id) {
  await adapter.deleteTool(id);
}

export async function addRecipe({ toolId, title, url, notes, ingredients, servings, steps, favorite, rating, photo, tags, time, allergens, difficulty }) {
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
  const matchesTerm = (r, term) =>
    (r.title || "").toLowerCase().includes(term) ||
    (r.tags || []).some((t) => (t || "").toLowerCase().includes(term)) ||
    (r.ingredients || []).some((i) => (i.name || "").toLowerCase().includes(term)) ||
    toolName(r).includes(term); // così "costolette friggitrice" filtra anche per strumento
  // Più parole (separate da spazi, virgole o " e ") devono comparire TUTTE.
  const terms = s.split(/[\s,]+|\s+e\s+/).map((t) => t.trim()).filter(Boolean);
  if (terms.length > 1) return state.recipes.filter((r) => terms.every((term) => matchesTerm(r, term)));
  return state.recipes.filter((r) => matchesTerm(r, s));
}
export function getByTag(tag) {
  const t = (tag || "").toLowerCase();
  return state.recipes.filter((r) => (r.tags || []).some((x) => (x || "").toLowerCase() === t));
}

// Statistiche cucina.
export async function markCooked(id) {
  const r = getRecipe(id);
  if (!r) return;
  const log = Array.isArray(r.cookLog) ? r.cookLog.slice(-99) : [];
  log.push(now());
  await adapter.updateRecipe(id, { cookCount: (r.cookCount || 0) + 1, lastCooked: now(), cookLog: log });
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
export function inPantry(name) {
  const n = (name || "").toLowerCase().trim();
  if (!n) return false;
  return state.pantry.some((p) => {
    const pn = (p.name || "").toLowerCase().trim();
    return pn && (pn === n || n.includes(pn) || pn.includes(n));
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

// Suggerisce ricette in base a ciò che è in dispensa.
export function suggestFromPantry() {
  if (!state.pantry.length) return [];
  const res = [];
  for (const r of state.recipes) {
    const ings = r.ingredients || [];
    if (!ings.length) continue;
    let have = 0;
    for (const it of ings) if (inPantry(it.name)) have++;
    if (have > 0) res.push({ recipe: r, have, total: ings.length });
  }
  res.sort((a, b) => b.have / b.total - a.have / a.total || b.have - a.have);
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
  return { version: 5, exportedAt: now(), tools: state.tools, recipes: state.recipes, shopping: state.shopping, plan: state.plan, pantry: state.pantry, menus: state.menus };
}

export async function importData(data, { merge = false } = {}) {
  if (!data || !Array.isArray(data.tools) || !Array.isArray(data.recipes)) {
    throw new Error("File di backup non valido.");
  }
  if (merge) {
    const existingTools = new Set(state.tools.map((t) => t.id));
    const existingRecipes = new Set(state.recipes.map((r) => r.id));
    for (const t of data.tools) if (!existingTools.has(t.id)) await adapter.addTool(t);
    for (const r of data.recipes) if (!existingRecipes.has(r.id)) await adapter.addRecipe(r);
  } else {
    await adapter.replaceAll({ tools: data.tools, recipes: data.recipes, shopping: data.shopping || [], plan: data.plan || [], pantry: data.pantry || [], menus: data.menus || [] });
  }
}
