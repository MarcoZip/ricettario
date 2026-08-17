// COLLAUDO RAPIDO DEI PULSANTI — da incollare nella console del browser con
// l'app aperta (o da eseguire con javascript_tool). NON fa parte dell'app.
//
// A cosa serve: trovare i pulsanti "morti", cioè presenti a schermo ma senza
// nessun gestore del clic. È un guasto INVISIBILE in console — un pulsante
// senza gestore non lancia errori, semplicemente non fa niente — e ha già
// colpito due volte:
//   v8.44  un `return` fuori posto lasciò senza gestore quasi tutta la scheda
//          ricetta: rispondeva solo "Indietro".
//   v8.58  un elemento mancante in "Modifica ricetta" interrompeva il
//          cablaggio e lasciava scollegati Salva e Annulla.
//
// Il secondo caso NON fu visto da questo stesso collaudo, perché la versione
// precedente guardava solo le SCHERMATE e non apriva mai una finestra. Da qui
// la seconda parte: si aprono le finestre più usate e si controllano anche
// quelle. Dentro le finestre si guardano TUTTI i pulsanti, non solo quelli con
// un id: Salva e Annulla, per esempio, sono marcati con `data-act`.
//
// Perché non clicca alla cieca: cliccare tutto cancellerebbe ricette,
// segnerebbe cotture e riempirebbe la spesa. Si intercetta `addEventListener`
// e si guarda CHI ha ricevuto un gestore, senza toccare nulla.
//
// Uso: eseguire l'intero file. Ritorna l'elenco dei pulsanti senza gestore.

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const conGestore = new WeakSet();

  // Da qui in avanti registriamo chi riceve un gestore di clic.
  const orig = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (tipo, fn, opz) {
    if (tipo === "click") conGestore.add(this);
    return orig.call(this, tipo, fn, opz);
  };

  const morti = [];
  const visti = new Set();
  let controllati = 0;

  // Un pulsante è "vivo" se ha un gestore suo, oppure la proprietà onclick,
  // oppure un antenato con gestore (delega dell'evento).
  const vivo = (el) => {
    if (el.onclick) return true;
    for (let n = el; n && n !== document; n = n.parentElement) {
      // FERMARSI allo sfondo della finestra. Lo sfondo ha SEMPRE un gestore di
      // clic — serve a chiudere toccando fuori — quindi risalendo oltre, ogni
      // pulsante dentro qualunque finestra risultava vivo per costruzione: il
      // controllo era cieco proprio sul caso per cui era stato esteso.
      // Verificato sabotando il codice: senza questa riga, una finestra con
      // tutti e 32 i pulsanti scollegati passava con "0 morti".
      if (n.classList && n.classList.contains("modal-backdrop")) return false;
      if (conGestore.has(n)) return true;
    }
    return false;
  };

  const etichetta = (b) => (b.id ? "#" + b.id : b.dataset && b.dataset.act ? "[" + b.dataset.act + "]" : "«" + b.textContent.trim().slice(0, 24) + "»");

  const controlla = (dove, radice, tutti) => {
    const sel = tutti ? "button" : "button[id]";
    (radice || document).querySelectorAll(sel).forEach((b) => {
      // Header e navigazione in basso vengono collegati UNA volta sola in
      // mount(), all'avvio, cioè prima che questo controllo inizi a registrare:
      // risulterebbero morti pur non essendolo. Vanno provati a mano.
      if (b.closest(".app-header, .bottom-nav")) return;
      const chiave = dove + "|" + etichetta(b);
      if (visti.has(chiave)) return;
      visti.add(chiave);
      controllati++;
      if (!vivo(b)) morti.push(dove + " → " + etichetta(b));
    });
  };

  const vaiA = async (rotta) => {
    const n = document.querySelector(`.bottom-nav__btn[data-route="${rotta}"]`);
    if (!n) return false;
    n.click();
    await wait(900);
    return true;
  };
  const chiudiFinestre = () => document.querySelectorAll("#modalRoot .modal-backdrop").forEach((x) => x.remove());

  // ---------- 1. Le schermate ----------
  // ATTENZIONE ai nomi: la v8.37 ha rinominato le ETICHETTE ("Strumenti" →
  // "Ricette", "Ricettario" → "Scopri") ma NON le rotte interne, rimaste
  // `strumenti` e `ricettario`. Scrivendo qui "scopri" la schermata veniva
  // saltata in silenzio e il collaudo copriva 4 sezioni su 5.
  for (const r of ["strumenti", "ricettario", "spesa", "piano", "impostazioni"]) {
    if (await vaiA(r)) controlla(r, document, false);
    else morti.push("ROTTA INESISTENTE: " + r + " — il collaudo non l'ha visitata");
  }

  // ---------- 2. La scheda ricetta ----------
  await vaiA("strumenti");
  const card = document.querySelector(".rotd, .recipe-item, [data-recipe], .pick-row");
  if (card) {
    card.click();
    await wait(1200);
    controlla("ricetta", document, false);
  }

  // ---------- 3. Le finestre ----------
  // Elenco scelto a mano: si aprono solo quelle SICURE. Restano fuori, di
  // proposito: le finestre che chiamano l'AI (costano richieste e rete), quelle
  // che aprono il selettore di file del telefono (bloccano tutto), la
  // condivisione di sistema e qualunque cosa distruttiva.
  const daAprire = [
    { id: "editRecipe", nome: "Modifica ricetta" },   // qui si nascondeva il guasto della v8.58
    { id: "timelineBtn", nome: "Quando inizio?" },
    { id: "completeMealBtn", nome: "Completa il pasto" },
    { id: "collectionsBtn", nome: "Raccolte" },
    { id: "qrBtn", nome: "Codice QR" },
    { id: "reviewBtn", nome: "Com'è venuta?" },
    { id: "freezeBtn", nome: "Porziona e congela" }
  ];
  for (const f of daAprire) {
    const b = document.getElementById(f.id);
    if (!b) { morti.push("finestra non raggiungibile: " + f.nome + " (#" + f.id + " assente)"); continue; }
    b.click();
    await wait(900);
    const m = document.querySelector("#modalRoot .modal");
    if (!m) { morti.push("NON SI APRE: " + f.nome); continue; }
    controlla("finestra " + f.nome, m, true); // dentro le finestre: TUTTI i pulsanti
    chiudiFinestre();
    await wait(300);
  }

  // Finestre raggiungibili dalle altre schermate.
  const altrove = [
    { rotta: "piano", id: "weekMenuBtn", nome: "Crea il menù", vista: "Settimana" },
    { rotta: "impostazioni", id: "usageBtn", nome: "Cosa usi davvero" }
  ];
  for (const f of altrove) {
    if (!(await vaiA(f.rotta))) { morti.push("ROTTA INESISTENTE: " + f.rotta); continue; }
    // Il Piano si apre in vista Mese, ma "Crea il menù" vive nella Settimana:
    // senza questo passaggio la finestra veniva saltata IN SILENZIO.
    if (f.vista) {
      const tab = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === f.vista);
      if (tab) { tab.click(); await wait(700); }
    }
    const b = document.getElementById(f.id);
    // Mai saltare in silenzio: se non si raggiunge, va detto — altrimenti il
    // collaudo dichiara "tutto a posto" su una finestra che non ha guardato.
    if (!b) { morti.push("finestra non raggiungibile: " + f.nome + " (#" + f.id + " assente in " + f.rotta + ")"); continue; }
    b.click();
    await wait(900);
    const m = document.querySelector("#modalRoot .modal");
    if (!m) { morti.push("NON SI APRE: " + f.nome); continue; }
    controlla("finestra " + f.nome, m, true);
    chiudiFinestre();
    await wait(300);
  }

  EventTarget.prototype.addEventListener = orig;
  chiudiFinestre();
  return {
    controllati,
    pulsantiSenzaGestore: morti,
    esito: morti.length ? "❌ CI SONO PULSANTI MORTI" : "✅ tutti i pulsanti hanno un gestore"
  };
})();
