// Facciata unica per i dati. La UI parla SOLO con questo modulo e non sa se
// dietro c'è il salvataggio locale o quello cloud.

import { createLocalAdapter } from "./store-local.js";
import { combine, categorize } from "./ingredients.js";

let adapter = null;
let state = { tools: [], recipes: [], shopping: [], plan: [], pantry: [] };
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
  { name: "Pentola a pressione", icon: "cooking-pot" }
];

export async function seedDefaults() {
  let order = 0;
  for (const t of DEFAULT_TOOLS) {
    await adapter.addTool({ id: newId(), name: t.name, icon: t.icon, order: order++, createdAt: now() });
  }
}

// ---- Letture (sincrone, dallo stato in memoria) ----
export function getTools() {
  return [...state.tools].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
}

export function getTool(id) {
  return state.tools.find((t) => t.id === id) || null;
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

export async function addRecipe({ toolId, title, url, notes, ingredients, servings, steps, favorite, rating }) {
  await adapter.addRecipe({
    id: newId(),
    toolId,
    title: title.trim(),
    url: (url || "").trim(),
    notes: (notes || "").trim(),
    ingredients: Array.isArray(ingredients) ? ingredients : [],
    servings: servings || null,
    steps: Array.isArray(steps) ? steps : [],
    favorite: Boolean(favorite),
    rating: rating || 0,
    createdAt: now(),
    updatedAt: now()
  });
}

// Tutte le ricette (per ricerca e selettori).
export function getAllRecipes() {
  return [...state.recipes];
}
export function getFavorites() {
  return state.recipes.filter((r) => r.favorite);
}
export function searchRecipes(q) {
  const s = q.toLowerCase().trim();
  if (!s) return [];
  return state.recipes.filter((r) =>
    (r.title || "").toLowerCase().includes(s) ||
    (r.ingredients || []).some((i) => (i.name || "").toLowerCase().includes(s))
  );
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
  for (const it of merged) {
    if (inPantry(it.name)) { skipped++; continue; } // già in dispensa
    const key = shopKey(it);
    const existing = state.shopping.find((s) => !s.checked && shopKey(s) === key);
    if (existing) {
      const qty = existing.qty != null && it.qty != null ? existing.qty + it.qty : (existing.qty != null ? existing.qty : it.qty);
      await adapter.updateShopping(existing.id, { qty });
    } else {
      await adapter.addShopping({
        id: newId(),
        name: it.name,
        qty: it.qty != null ? it.qty : null,
        unit: it.unit || "",
        category: it.category || categorize(it.name),
        checked: false,
        createdAt: now()
      });
    }
    added++;
  }
  return { added, skipped };
}

export async function toggleShoppingItem(id, checked) {
  await adapter.updateShopping(id, { checked });
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
function inPantry(name) {
  const n = (name || "").toLowerCase().trim();
  if (!n) return false;
  return state.pantry.some((p) => {
    const pn = (p.name || "").toLowerCase().trim();
    return pn && (pn === n || n.includes(pn) || pn.includes(n));
  });
}
export async function addPantryItem(name) {
  const clean = (name || "").trim();
  if (!clean) return;
  if (state.pantry.some((p) => (p.name || "").toLowerCase().trim() === clean.toLowerCase())) return;
  await adapter.addPantry({ id: newId(), name: clean, createdAt: now() });
}
export async function deletePantryItem(id) {
  await adapter.deletePantry(id);
}

// ---- Esporta / Importa (backup manuale) ----
export function exportData() {
  return { version: 4, exportedAt: now(), tools: state.tools, recipes: state.recipes, shopping: state.shopping, plan: state.plan, pantry: state.pantry };
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
    await adapter.replaceAll({ tools: data.tools, recipes: data.recipes, shopping: data.shopping || [], plan: data.plan || [], pantry: data.pantry || [] });
  }
}
