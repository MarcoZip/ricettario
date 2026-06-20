// Backend di salvataggio LOCALE (solo su questo dispositivo) tramite localStorage.
// Espone la stessa interfaccia del backend cloud, così l'app non vede differenze.

const KEY = "ricettario.data.v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { tools: [], recipes: [], shopping: [], plan: [], pantry: [], menus: [], events: [] };
    const data = JSON.parse(raw);
    return { tools: data.tools || [], recipes: data.recipes || [], shopping: data.shopping || [], plan: data.plan || [], pantry: data.pantry || [], menus: data.menus || [], events: data.events || [] };
  } catch {
    return { tools: [], recipes: [], shopping: [], plan: [], pantry: [], menus: [], events: [] };
  }
}

function write(state) {
  localStorage.setItem(KEY, JSON.stringify({ tools: state.tools, recipes: state.recipes, shopping: state.shopping, plan: state.plan, pantry: state.pantry, menus: state.menus, events: state.events }));
}

export function createLocalAdapter() {
  const state = read();
  let onChange = () => {};

  function commit() {
    write(state);
    onChange({ tools: [...state.tools], recipes: [...state.recipes], shopping: [...state.shopping], plan: [...state.plan], pantry: [...state.pantry], menus: [...state.menus], events: [...state.events] });
  }

  return {
    mode: "local",

    async start(cb) {
      onChange = cb;
      // Emissione iniziale dello stato salvato.
      onChange({ tools: [...state.tools], recipes: [...state.recipes], shopping: [...state.shopping], plan: [...state.plan], pantry: [...state.pantry], menus: [...state.menus], events: [...state.events] });
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

    async addShopping(item) {
      state.shopping.push(item);
      commit();
    },
    async updateShopping(id, patch) {
      const s = state.shopping.find((x) => x.id === id);
      if (s) Object.assign(s, patch);
      commit();
    },
    async deleteShopping(id) {
      state.shopping = state.shopping.filter((s) => s.id !== id);
      commit();
    },
    async clearShopping(ids) {
      const set = new Set(ids);
      state.shopping = state.shopping.filter((s) => !set.has(s.id));
      commit();
    },

    async addPlan(entry) {
      state.plan.push(entry);
      commit();
    },
    async deletePlan(id) {
      state.plan = state.plan.filter((p) => p.id !== id);
      commit();
    },

    async addPantry(item) {
      state.pantry.push(item);
      commit();
    },
    async updatePantry(id, patch) {
      const p = state.pantry.find((x) => x.id === id);
      if (p) Object.assign(p, patch);
      commit();
    },
    async deletePantry(id) {
      state.pantry = state.pantry.filter((p) => p.id !== id);
      commit();
    },

    async addMenu(menu) {
      state.menus.push(menu);
      commit();
    },
    async updateMenu(id, patch) {
      const mm = state.menus.find((x) => x.id === id);
      if (mm) Object.assign(mm, patch);
      commit();
    },
    async deleteMenu(id) {
      state.menus = state.menus.filter((mm) => mm.id !== id);
      commit();
    },

    async addEvent(ev) {
      state.events.push(ev);
      commit();
    },
    async updateEvent(id, patch) {
      const ev = state.events.find((x) => x.id === id);
      if (ev) Object.assign(ev, patch);
      commit();
    },
    async deleteEvent(id) {
      state.events = state.events.filter((ev) => ev.id !== id);
      commit();
    },

    async replaceAll(data) {
      state.tools = data.tools || [];
      state.recipes = data.recipes || [];
      state.shopping = data.shopping || [];
      state.plan = data.plan || [];
      state.pantry = data.pantry || [];
      state.menus = data.menus || [];
      state.events = data.events || [];
      commit();
    }
  };
}
