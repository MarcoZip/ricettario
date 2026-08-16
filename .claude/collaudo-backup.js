// PROVA DI ANDATA E RITORNO DEL BACKUP — da eseguire nella console del browser
// con l'app aperta (o con javascript_tool). NON fa parte dell'app.
//
// A cosa serve: il backup è l'unica copia delle ricette di famiglia, e il
// RIPRISTINO ha ceduto tre volte in due mesi (v8.32, v8.41, v8.51) sempre per
// la stessa classe di errore: qualcosa che scompare senza che nessuno se ne
// accorga. Questa prova esporta i dati veri, li reimporta in un magazzino
// FINTO e confronta. Se manca anche un solo id, lo dice.
//
// È SICURA: non scrive mai sui dati veri. La logica di ripristino viene
// estratta dal sorgente ed eseguita su uno stato di prova in memoria.
//
// Uso: eseguire l'intero file. Ritorna l'esito e le differenze trovate.

(async () => {
  const store = await import("./js/store.js");
  const COLLEZIONI = ["tools", "recipes", "shopping", "plan", "pantry", "menus", "events", "freezer"];

  // La logica vera di sostituzione, presa da js/store-local.js: non una copia
  // scritta a mano, altrimenti si collauda il collaudo e non l'app.
  const src = await (await fetch("./js/store-local.js?v=" + Date.now())).text();
  const i = src.indexOf("async replaceAll(data)");
  if (i < 0) return { esito: "❌ non trovo replaceAll in store-local.js" };
  const corpo = src.slice(i, src.indexOf("\n    }", i) + 6);

  const esegui = (statoIniziale, backup) => {
    const state = JSON.parse(JSON.stringify(statoIniziale));
    const fn = new Function("state", "commit", corpo.replace("async replaceAll(data)", "return async function (data)") + ";")(state, () => {});
    return fn(backup).then(() => state);
  };

  const ids = (arr) => new Set((arr || []).map((x) => x && x.id).filter(Boolean));
  const differenze = (a, b, etichetta) => {
    const A = ids(a), B = ids(b);
    const persi = [...A].filter((x) => !B.has(x));
    const inPiu = [...B].filter((x) => !A.has(x));
    return (persi.length || inPiu.length) ? `${etichetta}: ${persi.length} persi, ${inPiu.length} in più` : null;
  };

  const vero = store.exportData();
  const statoVero = {};
  COLLEZIONI.forEach((c) => { statoVero[c] = vero[c] || []; });
  const problemi = [];

  // 1. Andata e ritorno completo: riesportando si deve riottenere tutto.
  const dopo = await esegui(statoVero, JSON.parse(JSON.stringify(vero)));
  COLLEZIONI.forEach((c) => { const d = differenze(statoVero[c], dopo[c], "giro completo · " + c); if (d) problemi.push(d); });

  // 2. Backup VECCHIO (senza le collezioni nate dopo): non deve cancellarle.
  //    È il guasto della v8.41, trovato solo in v8.51.
  const vecchio = { version: 3, exportedAt: vero.exportedAt, tools: vero.tools, recipes: vero.recipes, shopping: vero.shopping, plan: vero.plan };
  const dopoVecchio = await esegui(statoVero, vecchio);
  ["pantry", "menus", "events", "freezer"].forEach((c) => {
    if ((dopoVecchio[c] || []).length !== (statoVero[c] || []).length) {
      problemi.push(`backup vecchio · ${c}: da ${(statoVero[c] || []).length} a ${(dopoVecchio[c] || []).length} — una collezione ASSENTE dal file è stata svuotata`);
    }
  });

  // 3. Collezione esplicitamente VUOTA: quella sì deve svuotare.
  const conVuoto = JSON.parse(JSON.stringify(vero));
  conVuoto.freezer = [];
  const dopoVuoto = await esegui(statoVero, conVuoto);
  if ((dopoVuoto.freezer || []).length !== 0) problemi.push("collezione vuota · freezer: doveva svuotarsi e non l'ha fatto");

  return {
    ricetteVere: (vero.recipes || []).length,
    controlli: ["giro completo", "backup vecchio senza collezioni nuove", "collezione esplicitamente vuota"],
    problemi,
    esito: problemi.length ? "❌ IL BACKUP PERDE DATI" : "✅ andata e ritorno senza perdite"
  };
})();
