// Backend di salvataggio LOCALE (solo su questo dispositivo) tramite localStorage.
// Espone la stessa interfaccia del backend cloud, così l'app non vede differenze.

const KEY = "ricettario.data.v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { tools: [], recipes: [] };
    const data = JSON.parse(raw);
    return { tools: data.tools || [], recipes: data.recipes || [] };
  } catch {
    return { tools: [], recipes: [] };
  }
}

function write(state) {
  localStorage.setItem(KEY, JSON.stringify({ tools: state.tools, recipes: state.recipes }));
}

export function createLocalAdapter() {
  const state = read();
  let onChange = () => {};

  function commit() {
    write(state);
    onChange({ tools: [...state.tools], recipes: [...state.recipes] });
  }

  return {
    mode: "local",

    async start(cb) {
      onChange = cb;
      // Emissione iniziale dello stato salvato.
      onChange({ tools: [...state.tools], recipes: [...state.recipes] });
    },

    async addTool(tool) {
      state.tools.push(tool);
      commit();
    },
    async updateTool(id, patch) {
      const t = state.tools.find((x) => x.id === id);
      if (t) Object.assign(t, patch);
      commit();
    },
    async deleteTool(id) {
      state.tools = state.tools.filter((t) => t.id !== id);
      state.recipes = state.recipes.filter((r) => r.toolId !== id);
      commit();
    },

    async addRecipe(recipe) {
      state.recipes.push(recipe);
      commit();
    },
    async updateRecipe(id, patch) {
      const r = state.recipes.find((x) => x.id === id);
      if (r) Object.assign(r, patch);
      commit();
    },
    async deleteRecipe(id) {
      state.recipes = state.recipes.filter((r) => r.id !== id);
      commit();
    },

    async replaceAll(data) {
      state.tools = data.tools || [];
      state.recipes = data.recipes || [];
      commit();
    }
  };
}
