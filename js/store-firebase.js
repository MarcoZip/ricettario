// Backend di salvataggio CLOUD tramite Firebase Firestore.
// Caricato dinamicamente solo quando la configurazione è presente.
// I dati di ogni utente vivono sotto:  users/{uid}/tools  e  users/{uid}/recipes
// Firestore tiene una cache offline locale: l'app funziona anche senza rete e
// sincronizza automaticamente appena torna online.

import { firebaseConfig } from "./config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.5";

export async function createFirebaseAdapter(uid) {
  const { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch, getDocs, increment, serverTimestamp } =
    await import(`${SDK}/firebase-firestore.js`);
  const { getApp } = await import(`${SDK}/firebase-app.js`);

  const db = getFirestore(getApp());
  const toolsCol = collection(db, "users", uid, "tools");
  const recipesCol = collection(db, "users", uid, "recipes");
  const shoppingCol = collection(db, "users", uid, "shopping");
  // Casa condivisa: se è impostato un codice, la lista della spesa vive in una
  // collezione condivisa households/{code}/shopping, così due account la vedono
  // e modificano in tempo reale. Cambiare casa = ricarica (letto qui all'avvio).
  let household = "";
  try { household = (localStorage.getItem("ricettario.household") || "").trim(); } catch (e) {}
  const shopTarget = household ? collection(db, "households", household, "shopping") : shoppingCol;
  const planCol = collection(db, "users", uid, "plan");
  const pantryCol = collection(db, "users", uid, "pantry");
  const menusCol = collection(db, "users", uid, "menus");
  const eventsCol = collection(db, "users", uid, "events");
  // Casa condivisa: come la lista della spesa, i menù delle feste diventano
  // condivisi (households/{code}/events) così entrambi li vedono e modificano.
  const eventsTarget = household ? collection(db, "households", household, "events") : eventsCol;
  const freezerCol = collection(db, "users", uid, "freezer");

  let tools = [];
  let recipes = [];
  let shopping = [];
  let plan = [];
  let pantry = [];
  let menus = [];
  let events = [];
  let freezer = [];
  let onChange = () => {};

  function emit() {
    onChange({ tools: [...tools], recipes: [...recipes], shopping: [...shopping], plan: [...plan], pantry: [...pantry], menus: [...menus], events: [...events], freezer: [...freezer] });
  }

  return {
    mode: "cloud",

    async start(cb) {
      onChange = cb;
      // Due listener in tempo reale: ogni modifica (anche da un altro
      // dispositivo) aggiorna subito l'interfaccia.
      onSnapshot(toolsCol, (snap) => {
        tools = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      });
      onSnapshot(recipesCol, (snap) => {
        recipes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      });
      onSnapshot(shopTarget, (snap) => {
        shopping = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      });
      onSnapshot(planCol, (snap) => {
        plan = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      });
      onSnapshot(pantryCol, (snap) => {
        pantry = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      });
      onSnapshot(menusCol, (snap) => {
        menus = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      });
      onSnapshot(eventsTarget, (snap) => {
        events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      });
      onSnapshot(freezerCol, (snap) => {
        freezer = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      });
    },

    async addTool(tool) {
      const { id, ...data } = tool;
      await setDoc(doc(toolsCol, id), data);
    },
    async updateTool(id, patch) {
      await setDoc(doc(toolsCol, id), patch, { merge: true });
    },
    async deleteTool(id) {
      const batch = writeBatch(db);
      batch.delete(doc(toolsCol, id));
      const rs = await getDocs(recipesCol);
      rs.forEach((r) => {
        if (r.data().toolId === id) batch.delete(r.ref);
      });
      await batch.commit();
    },

    async addRecipe(recipe) {
      const { id, ...data } = recipe;
      await setDoc(doc(recipesCol, id), data);
    },
    async updateRecipe(id, patch) {
      await setDoc(doc(recipesCol, id), patch, { merge: true });
    },
    async deleteRecipe(id) {
      await deleteDoc(doc(recipesCol, id));
    },

    async addShopping(item) {
      const { id, ...data } = item;
      await setDoc(doc(shopTarget, id), data);
    },
    async updateShopping(id, patch) {
      await setDoc(doc(shopTarget, id), patch, { merge: true });
    },
    async deleteShopping(id) {
      await deleteDoc(doc(shopTarget, id));
    },
    async clearShopping(ids) {
      const batch = writeBatch(db);
      ids.forEach((id) => batch.delete(doc(shopTarget, id)));
      await batch.commit();
    },

    async addPlan(entry) {
      const { id, ...data } = entry;
      await setDoc(doc(planCol, id), data);
    },
    async deletePlan(id) {
      await deleteDoc(doc(planCol, id));
    },

    async addPantry(item) {
      const { id, ...data } = item;
      await setDoc(doc(pantryCol, id), data);
    },
    async updatePantry(id, patch) {
      await setDoc(doc(pantryCol, id), patch, { merge: true });
    },
    async deletePantry(id) {
      await deleteDoc(doc(pantryCol, id));
    },

    async addMenu(menu) {
      const { id, ...data } = menu;
      await setDoc(doc(menusCol, id), data);
    },
    async updateMenu(id, patch) {
      await setDoc(doc(menusCol, id), patch, { merge: true });
    },
    async deleteMenu(id) {
      await deleteDoc(doc(menusCol, id));
    },

    async addEvent(ev) {
      const { id, ...data } = ev;
      await setDoc(doc(eventsTarget, id), data);
    },
    async updateEvent(id, patch) {
      await setDoc(doc(eventsTarget, id), patch, { merge: true });
    },
    async deleteEvent(id) {
      await deleteDoc(doc(eventsTarget, id));
    },

    async addFreezer(item) {
      const { id, ...data } = item;
      await setDoc(doc(freezerCol, id), data);
    },
    async updateFreezer(id, patch) {
      await setDoc(doc(freezerCol, id), patch, { merge: true });
    },
    async deleteFreezer(id) {
      await deleteDoc(doc(freezerCol, id));
    },

    async replaceAll(data) {
      const batch = writeBatch(db);
      (data.tools || []).forEach((t) => {
        const { id, ...rest } = t;
        batch.set(doc(toolsCol, id), rest);
      });
      (data.recipes || []).forEach((r) => {
        const { id, ...rest } = r;
        batch.set(doc(recipesCol, id), rest);
      });
      (data.shopping || []).forEach((s) => {
        const { id, ...rest } = s;
        batch.set(doc(shoppingCol, id), rest);
      });
      (data.plan || []).forEach((p) => {
        const { id, ...rest } = p;
        batch.set(doc(planCol, id), rest);
      });
      (data.pantry || []).forEach((p) => {
        const { id, ...rest } = p;
        batch.set(doc(pantryCol, id), rest);
      });
      (data.menus || []).forEach((mn) => {
        const { id, ...rest } = mn;
        batch.set(doc(menusCol, id), rest);
      });
      (data.events || []).forEach((ev) => {
        const { id, ...rest } = ev;
        batch.set(doc(eventsCol, id), rest);
      });
      (data.freezer || []).forEach((fz) => {
        const { id, ...rest } = fz;
        batch.set(doc(freezerCol, id), rest);
      });
      await batch.commit();
    },

    // Registra un accesso dell'utente (per le statistiche admin), con i conteggi
    // per giorno e per mese salvati nel documento dell'utente stesso.
    async recordAccess(email) {
      try {
        const n = new Date();
        const day = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
        const month = day.slice(0, 7);
        await setDoc(doc(db, "accessStats", uid), {
          email: email || "",
          lastAccess: serverTimestamp(),
          count: increment(1),
          days: { [day]: increment(1) },
          months: { [month]: increment(1) }
        }, { merge: true });
      } catch (e) { /* permessi/offline: ignora */ }
    },
    // Legge le statistiche di accesso di tutti gli utenti (solo admin via regole).
    async getAccessStats() {
      const snap = await getDocs(collection(db, "accessStats"));
      return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    }
  };
}
