// Facciata unica per i dati. La UI parla SOLO con questo modulo e non sa se
// dietro c'è il salvataggio locale o quello cloud.

import { createLocalAdapter } from "./store-local.js";

let adapter = null;
let state = { tools: [], recipes: [] };
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
  { name: "Friggitrice ad aria", icon: "🍟" },
  { name: "Forno", icon: "🔥" },
  { name: "Piano a induzione", icon: "⚡" },
  { name: "Fornello a gas", icon: "🍳" },
  { name: "Vaporiera", icon: "♨️" },
  { name: "Pentola a pressione", icon: "⏲️" }
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

export async function addRecipe({ toolId, title, url, notes }) {
  await adapter.addRecipe({
    id: newId(),
    toolId,
    title: title.trim(),
    url: (url || "").trim(),
    notes: (notes || "").trim(),
    createdAt: now(),
    updatedAt: now()
  });
}

export async function updateRecipe(id, patch) {
  await adapter.updateRecipe(id, { ...patch, updatedAt: now() });
}

export async function deleteRecipe(id) {
  await adapter.deleteRecipe(id);
}

// ---- Esporta / Importa (backup manuale) ----
export function exportData() {
  return { version: 1, exportedAt: now(), tools: state.tools, recipes: state.recipes };
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
    await adapter.replaceAll({ tools: data.tools, recipes: data.recipes });
  }
}
