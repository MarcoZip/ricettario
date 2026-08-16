// COLLAUDO RAPIDO DEI PULSANTI — da incollare nella console del browser con
// l'app aperta (o da eseguire con javascript_tool). NON fa parte dell'app.
//
// A cosa serve: trovare i pulsanti "morti", cioè presenti a schermo ma senza
// nessun gestore del clic. È il guasto che nella v8.44 ha lasciato senza
// gestore quasi tutta la scheda ricetta, ed è INVISIBILE in console: un
// pulsante senza gestore non lancia errori, semplicemente non fa niente.
//
// Perché non si limita a cliccare tutto: cliccare alla cieca cancellerebbe
// ricette, segnerebbe cotture e riempirebbe la lista della spesa. Qui invece
// si intercetta `addEventListener` e si guarda CHI ha ricevuto un gestore,
// senza toccare nulla.
//
// Uso: eseguire l'intero file. Ritorna l'elenco dei pulsanti senza gestore.

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const conGestore = new WeakSet();

  // 1. Da qui in avanti registriamo chi riceve un gestore di clic.
  const orig = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (tipo, fn, opz) {
    if (tipo === "click") conGestore.add(this);
    return orig.call(this, tipo, fn, opz);
  };

  const morti = [];
  const visti = new Set();

  // Un pulsante è "vivo" se ha un gestore suo, oppure la proprietà onclick,
  // oppure un antenato con gestore (delega dell'evento).
  const vivo = (el) => {
    if (el.onclick) return true;
    for (let n = el; n && n !== document; n = n.parentElement) {
      if (conGestore.has(n)) return true;
    }
    return false;
  };

  const controlla = (schermata) => {
    document.querySelectorAll("button[id]").forEach((b) => {
      // Header e navigazione in basso vengono collegati UNA volta sola in
      // mount(), all'avvio, cioè prima che questo controllo inizi a registrare:
      // risulterebbero morti pur non essendolo. Vanno provati a mano.
      if (b.closest(".app-header, .bottom-nav")) return;
      const chiave = schermata + "#" + b.id;
      if (visti.has(chiave)) return;
      visti.add(chiave);
      if (!vivo(b)) morti.push({ schermata, id: b.id, testo: b.textContent.trim().slice(0, 40) });
    });
  };

  const vaiA = async (rotta) => {
    const n = document.querySelector(`.bottom-nav__btn[data-route="${rotta}"]`);
    if (!n) return false;
    n.click();
    await wait(900);
    return true;
  };

  // 2. Giro delle schermate principali. La navigazione ridisegna e ricollega,
  //    quindi da qui in poi i gestori vengono registrati.
  // ATTENZIONE ai nomi: la v8.37 ha rinominato le ETICHETTE ("Strumenti" →
  // "Ricette", "Ricettario" → "Scopri") ma NON le rotte interne, che sono
  // rimaste `strumenti` e `ricettario`. Scrivendo qui "scopri" la schermata
  // veniva saltata in silenzio e il collaudo copriva 4 sezioni su 5.
  const rotte = ["strumenti", "ricettario", "spesa", "piano", "impostazioni"];
  for (const r of rotte) {
    if (await vaiA(r)) controlla(r);
    else morti.push("ROTTA INESISTENTE: " + r + " — il collaudo non l'ha visitata");
  }

  // 3. La scheda ricetta, che è la più ricca di pulsanti.
  await vaiA("strumenti");
  const card = document.querySelector(".rotd, .recipe-item, [data-recipe], .pick-row");
  if (card) {
    card.click();
    await wait(1200);
    controlla("ricetta");
  }

  EventTarget.prototype.addEventListener = orig;
  return {
    pulsantiSenzaGestore: morti,
    quanti: morti.length,
    esito: morti.length ? "❌ CI SONO PULSANTI MORTI" : "✅ tutti i pulsanti hanno un gestore"
  };
})();
