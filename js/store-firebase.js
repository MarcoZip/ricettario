// Backend di salvataggio CLOUD tramite Firebase Firestore.
// Caricato dinamicamente solo quando la configurazione è presente.
// I dati di ogni utente vivono sotto:  users/{uid}/tools  e  users/{uid}/recipes
// Firestore tiene una cache offline locale: l'app funziona anche senza rete e
// sincronizza automaticamente appena torna online.

import { firebaseConfig } from "./config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.5";

export async function createFirebaseAdapter(uid) {
  const { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch, getDocs } =
    await import(`${SDK}/firebase-firestore.js`);
  const { getApp } = await import(`${SDK}/firebase-app.js`);

  const db = getFirestore(getApp());
  const toolsCol = collection(db, "users", uid, "tools");
  const recipesCol = collection(db, "users", uid, "recipes");
  const shoppingCol = collection(db, "users", uid, "shopping");
  const planCol = collection(db, "users", uid, "plan");

  let tools = [];
  let recipes = [];
  let shopping = [];
  let plan = [];
  let onChange = () => {};

  function emit() {
    onChange({ tools: [...tools], recipes: [...recipes], shopping: [...shopping], plan: [...plan] });
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
      onSnapshot(shoppingCol, (snap) => {
        shopping = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      });
      onSnapshot(planCol, (snap) => {
        plan = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
      await setDoc(doc(shoppingCol, id), data);
    },
    async updateShopping(id, patch) {
      await setDoc(doc(shoppingCol, id), patch, { merge: true });
    },
    async deleteShopping(id) {
      await deleteDoc(doc(shoppingCol, id));
    },
    async clearShopping(ids) {
      const batch = writeBatch(db);
      ids.forEach((id) => batch.delete(doc(shoppingCol, id)));
      await batch.commit();
    },

    async addPlan(entry) {
      const { id, ...data } = entry;
      await setDoc(doc(planCol, id), data);
    },
    async deletePlan(id) {
      await deleteDoc(doc(planCol, id));
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
      await batch.commit();
    }
  };
}
