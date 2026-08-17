// Backend di salvataggio CLOUD tramite Firebase Firestore.
// Caricato dinamicamente solo quando la configurazione è presente.
// I dati di ogni utente vivono sotto:  users/{uid}/tools  e  users/{uid}/recipes
// ATTENZIONE — la cache offline NON è attiva. Qui c'era scritto il contrario
// ("l'app funziona anche senza rete"), ma `getFirestore()` con l'SDK 10 usa la
// cache in MEMORIA: chiusa l'app, i dati non ci sono più. In modalità cloud
// senza rete il ricettario si apre VUOTO — con lo schermo davanti ai fornelli.
// Per attivarla davvero servirebbe `initializeFirestore(app, { localCache:
// persistentLocalCache() })`, che è una modifica a questo adapter: da fare solo
// dopo aver messo in piedi una prova su un account Firebase di servizio,
// perché qui non è mai stato eseguito un collaudo.

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

  // Quali delle 8 collezioni hanno già ricevuto il loro PRIMO snapshot.
  // In cloud i dati non arrivano tutti insieme: ogni collezione ha il suo
  // ascolto e arriva per conto suo. Finché non sono arrivate tutte, lo stato
  // è a metà — e una copia di sicurezza scattata adesso fotograferebbe una
  // dispensa vuota che al ripristino cancellerebbe quella vera.
  const arrivate = new Set();
  const inErrore = new Set();
  const TOTALE_COLLEZIONI = 8;
  function segna(nome) { arrivate.add(nome); inErrore.delete(nome); }
  // Un ascolto che fallisce (regola negata, codice Casa sbagliato, rete caduta)
  // non consegnerà MAI il suo primo elenco. Senza questo, `caricamentoCompleto()`
  // resterebbe falso per sempre e chi aspetta di essere "pronto" aspetterebbe in
  // eterno: la copia automatica non si farebbe mai, e — molto peggio — il
  // ripristino da file resterebbe murato dietro un messaggio che dice "aspetta
  // qualche secondo", cioè una bugia. Un errore è una risposta: la collezione
  // smette di essere "in arrivo" e diventa "non disponibile".
  function segnaErrore(nome, err) {
    inErrore.add(nome);
    arrivate.add(nome);
    console.warn("Fornelli: la collezione «" + nome + "» non è raggiungibile.", err && err.code ? err.code : err);
    emit();
  }
  // Ascolto con gestione dell'errore: prima nessuno degli otto ce l'aveva.
  function ascolta(rif, nome, applica) {
    onSnapshot(rif, (snap) => { applica(snap); segna(nome); emit(); }, (err) => segnaErrore(nome, err));
  }

  function emit() {
    onChange({ tools: [...tools], recipes: [...recipes], shopping: [...shopping], plan: [...plan], pantry: [...pantry], menus: [...menus], events: [...events], freezer: [...freezer] });
  }

  return {
    mode: "cloud",

    async start(cb) {
      onChange = cb;
      // Due listener in tempo reale: ogni modifica (anche da un altro
      // dispositivo) aggiorna subito l'interfaccia.
      ascolta(toolsCol, "tools", (s) => { tools = s.docs.map((d) => ({ id: d.id, ...d.data() })); });
      ascolta(recipesCol, "recipes", (s) => { recipes = s.docs.map((d) => ({ id: d.id, ...d.data() })); });
      ascolta(shopTarget, "shopping", (s) => { shopping = s.docs.map((d) => ({ id: d.id, ...d.data() })); });
      ascolta(planCol, "plan", (s) => { plan = s.docs.map((d) => ({ id: d.id, ...d.data() })); });
      ascolta(pantryCol, "pantry", (s) => { pantry = s.docs.map((d) => ({ id: d.id, ...d.data() })); });
      ascolta(menusCol, "menus", (s) => { menus = s.docs.map((d) => ({ id: d.id, ...d.data() })); });
      ascolta(eventsTarget, "events", (s) => { events = s.docs.map((d) => ({ id: d.id, ...d.data() })); });
      ascolta(freezerCol, "freezer", (s) => { freezer = s.docs.map((d) => ({ id: d.id, ...d.data() })); });
    },

    // Vero quando TUTTE le collezioni hanno dato una risposta — un elenco oppure
    // un errore. Serve a chi deve fotografare lo stato completo (la copia di
    // sicurezza): prima di questo momento una collezione vuota non significa
    // "non c'è niente", significa "non è ancora arrivato".
    caricamentoCompleto() { return arrivate.size >= TOTALE_COLLEZIONI; },
    // Le collezioni che hanno risposto con un errore: sono "note" ma il loro
    // contenuto NON è attendibile. Chi sta per sovrascrivere i dati deve saperlo.
    collezioniInErrore() { return [...inErrore]; },

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

    // Ripristino da backup. Due difetti corretti qui:
    //
    // 1. Un solo writeBatch: Firestore ne accetta al massimo 500 operazioni, e
    //    un ricettario grande faceva fallire l'INTERO import senza importare
    //    niente. Ora le operazioni vengono spezzate in blocchi.
    // 2. Non era una sostituzione ma una fusione: i documenti già presenti e
    //    NON contenuti nel backup restavano lì. Chi ripristinava si ritrovava
    //    l'unione dei due stati, mentre la finestra di conferma prometteva
    //    "I dati attuali verranno sostituiti". Ora quelli in più si cancellano.
    async replaceAll(data) {
      const scritture = [], cancellazioni = [];
      // Le collezioni PERSONALI vengono sostituite davvero — ma solo quelle
      // PRESENTI nel file. Una collezione assente (backup esportato prima che
      // quella funzione esistesse) non è una collezione vuota: va lasciata
      // stare, altrimenti ripristinare un backup di primavera cancella il
      // congelatore riempito ad agosto.
      const personali = [
        [toolsCol, data.tools],
        [recipesCol, data.recipes],
        [planCol, data.plan],
        [pantryCol, data.pantry],
        [menusCol, data.menus],
        [freezerCol, data.freezer]
      ];
      for (const [col, righe] of personali) {
        if (!Array.isArray(righe)) continue; // assente nel file: non toccare
        const tenere = new Set(righe.map((x) => x.id));
        const attuali = await getDocs(col);
        attuali.forEach((d) => { if (!tenere.has(d.id)) cancellazioni.push({ del: d.ref }); });
        righe.forEach((x) => { const { id, ...rest } = x; scritture.push({ ref: doc(col, id), data: rest }); });
      }
      // Spesa ed eventi in Casa condivisa appartengono anche all'ALTRA persona:
      // qui non si cancella niente, altrimenti ripristinare un backup dal
      // proprio telefono svuoterebbe la lista della spesa del partner. Senza
      // casa condivisa sono collezioni personali e valgono le regole di sopra.
      const condivise = [[shopTarget, data.shopping], [eventsTarget, data.events]];
      for (const [col, righe] of condivise) {
        if (!Array.isArray(righe)) continue;
        if (!household) {
          const tenere = new Set(righe.map((x) => x.id));
          const attuali = await getDocs(col);
          attuali.forEach((d) => { if (!tenere.has(d.id)) cancellazioni.push({ del: d.ref }); });
        }
        righe.forEach((x) => { const { id, ...rest } = x; scritture.push({ ref: doc(col, id), data: rest }); });
      }
      // PRIMA tutte le scritture, POI le cancellazioni. L'ordine conta: i blocchi
      // si inviano uno dopo l'altro e la rete può cadere a metà. Cancellando per
      // prime si resterebbe con i dati vecchi già spariti e quelli del backup non
      // ancora scritti — un buco. Così invece un'interruzione lascia al massimo
      // l'unione dei due stati, che è recuperabile.
      const ops = scritture.concat(cancellazioni);
      // Blocchi da 450 (sotto il tetto di 500 di Firestore) per stare larghi.
      for (let i = 0; i < ops.length; i += 450) {
        const batch = writeBatch(db);
        for (const op of ops.slice(i, i + 450)) {
          if (op.del) batch.delete(op.del); else batch.set(op.ref, op.data);
        }
        await batch.commit();
      }
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
