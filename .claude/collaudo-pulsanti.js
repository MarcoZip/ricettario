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

  // Una sola esecuzione per volta. Due collaudi sovrapposti si innestano sul
  // prototipo a vicenda: quando il primo finisce ripristina l'originale e il
  // secondo smette di registrare, producendo oltre cento falsi morti. Un elenco
  // così lungo insegna a ignorare lo strumento, che è il danno peggiore.
  // Il rifiuto ha la STESSA forma di un esito, e comincia con ❌: chi controlla
  // `pulsantiSenzaGestore.length` non prende un errore, e chi cerca "❌" non
  // scambia un rifiuto per un via libera.
  if (window.__collaudoInCorso) return { controllati: 0, pulsantiSenzaGestore: [], valido: false, esito: "❌ RISULTATO NON VALIDO: un altro collaudo è già in corso, aspetta che finisca e rilancia" };
  window.__collaudoInCorso = true;

  // Da qui in avanti registriamo chi riceve un gestore di clic.
  const orig = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (tipo, fn, opz) {
    if (tipo === "click") conGestore.add(this);
    return orig.call(this, tipo, fn, opz);
  };
  try {

  const morti = [];
  // Deduplica per ELEMENTO, non per etichetta. Con la chiave "schermata|etichetta"
  // le 12 righe della spesa hanno tutte etichetta [check] e ne veniva esaminata
  // UNA sola: cablando per sbaglio solo la prima riga di una lista — il classico
  // ciclo che si rompe — 11 righe su 12 restavano morte e lo strumento diceva
  // "tutto a posto". La Spesa risultava coperta al 33%.
  const gia = new WeakSet();
  let controllati = 0;
  const perEtichetta = {}; // per non stampare 12 righe identiche nel risultato

  // Un pulsante è "vivo" se ha un gestore suo, oppure la proprietà onclick,
  // oppure un antenato con gestore (delega dell'evento).
  const vivo = (el) => {
    if (el.onclick) return true;
    // `popovertarget`: il browser apre il riquadro da solo, senza JavaScript.
    // Non avere un gestore è corretto, non un guasto. In tutta l'app ce n'è uno
    // solo (la ⓘ dell'impatto ambientale), ma senza questa riga darebbe un
    // falso allarme — e un falso allarme insegna a ignorare lo strumento.
    if (el.hasAttribute && el.hasAttribute("popovertarget")) return true;
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
      if (gia.has(b)) return;
      gia.add(b);
      controllati++;
      if (!vivo(b)) {
        // Se una lista ha molte righe rotte si stampa una riga sola con il
        // conteggio, altrimenti l'elenco diventa illeggibile.
        const k = dove + " → " + etichetta(b);
        perEtichetta[k] = (perEtichetta[k] || 0) + 1;
      }
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
  // La finestra da guardare è quella IN CIMA, come fa l'app stessa
  // (js/ui.js: "agisce solo la finestra in cima"). Con un semplice
  // querySelector si prendeva la più in basso: bastava una finestra rimasta
  // aperta perché il collaudo ispezionasse quella al posto di "Modifica
  // ricetta", cioè proprio dove viveva il guasto.
  const finestraInCima = () => {
    const b = [...document.querySelectorAll("#modalRoot .modal-backdrop")].pop();
    return b ? b.querySelector(".modal") : null;
  };

  // Si comincia da zero: una finestra rimasta aperta (per esempio "Novità",
  // che si apre da sola dopo ogni cambio di versione — cioè proprio quando si
  // esegue questo collaudo) falsava tutto il resto.
  chiudiFinestre();

  // ---------- 1. Le schermate ----------
  // ATTENZIONE ai nomi: la v8.37 ha rinominato le ETICHETTE ("Strumenti" →
  // "Ricette", "Ricettario" → "Scopri") ma NON le rotte interne, rimaste
  // `strumenti` e `ricettario`. Scrivendo qui "scopri" la schermata veniva
  // saltata in silenzio e il collaudo copriva 4 sezioni su 5.
  for (const r of ["strumenti", "ricettario", "spesa", "piano", "impostazioni"]) {
    if (await vaiA(r)) controlla(r, document, true);
    else morti.push("ROTTA INESISTENTE: " + r + " — il collaudo non l'ha visitata");
  }

  // Schede interne: sono schermate a tutti gli effetti, con pulsanti propri, ma
  // non si raggiungono dalla barra in basso. La vista Settimana in particolare
  // veniva attraversata per aprire "Crea il menù" e mai esaminata: quindici
  // pulsanti — Spesa settimana, Prepara in anticipo, Coordina i piatti,
  // Condividi il menù — potevano essere tutti scollegati senza che nessuno
  // se ne accorgesse, a parità di conteggio.
  const schede = [
    { rotta: "piano", etichetta: "Settimana", nome: "piano/Settimana", ritorno: "Mese" },
    { rotta: "spesa", etichetta: "Dispensa", nome: "spesa/Dispensa", ritorno: "Da comprare" }
  ];
  for (const s of schede) {
    if (!(await vaiA(s.rotta))) continue;
    const trova = (t) => [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === t);
    const tab = trova(s.etichetta);
    if (!tab) { morti.push("scheda non raggiungibile: " + s.nome); continue; }
    tab.click();
    await wait(800);
    controlla(s.nome, document, true);
    // Si TORNA sulla scheda di partenza: lasciare l'app su Dispensa o su
    // Settimana cambia ciò che vede l'esecuzione successiva — e una prova
    // fatta sulla schermata sbagliata è una prova che non dimostra niente.
    const back = trova(s.ritorno);
    if (back) { back.click(); await wait(600); }
  }

  // ---------- 2. La scheda ricetta ----------
  // PIÙ di una ricetta: diversi pulsanti compaiono solo per certe ricette
  // (ingredienti mancanti, video, "Come lo imposto?" solo per gli strumenti
  // regolabili). Guardandone una sola, quelli non venivano mai visti.
  await vaiA("strumenti");
  const carte = [...document.querySelectorAll(".rotd, [data-recipe], .pick-row")].slice(0, 3);
  for (let i = 0; i < carte.length; i++) {
    await vaiA("strumenti");
    const c = [...document.querySelectorAll(".rotd, [data-recipe], .pick-row")][i];
    if (!c) continue;
    c.click();
    await wait(1200);
    controlla("ricetta " + (i + 1), document, true);
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
    const m = finestraInCima();
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
    const m = finestraInCima();
    if (!m) { morti.push("NON SI APRE: " + f.nome); continue; }
    controlla("finestra " + f.nome, m, true);
    chiudiFinestre();
    await wait(300);
  }

  chiudiFinestre();
  for (const k of Object.keys(perEtichetta)) {
    morti.push(perEtichetta[k] > 1 ? k + " (×" + perEtichetta[k] + ")" : k);
  }
  return {
    controllati,
    pulsantiSenzaGestore: morti,
    valido: true,
    // Il numero varia con la quantità di dati (con 0 ricette scende a ~45):
    // confrontalo solo con un'esecuzione sulla STESSA app nelle stesse
    // condizioni. Un calo improvviso a parità di dati è un segnale, non rumore.
    nonCoperti: [
      "finestre che chiamano l'AI, che aprono il selettore di file, la condivisione di sistema e le azioni distruttive: escluse di proposito",
      "Modalità cucina, Modalità supermercato, Guida, pannello Timer",
      "la vista Giorno del Piano",
      "gli elementi cliccabili che non sono <button>",
      "le ricette oltre le prime tre"
    ],
    limite: "verifica che un gestore ESISTA, non che faccia la cosa giusta",
    esito: morti.length ? "❌ CI SONO PULSANTI MORTI" : "✅ tutti i pulsanti hanno un gestore"
  };
  } finally {
    // In un `finally`: se l'esecuzione si interrompe a metà, il prototipo va
    // comunque rimesso a posto. Lasciandolo alterato, il collaudo successivo
    // non registra più niente e segnala oltre cento falsi morti.
    EventTarget.prototype.addEventListener = orig;
    window.__collaudoInCorso = false;
  }
})();
