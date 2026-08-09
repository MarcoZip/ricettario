// Quanto dura in frigo e in congelatore, e a che temperatura al cuore è cotto.
// ------------------------------------------------------------------------
// Sono TABELLE STATICHE, non generate dall'AI: si tratta di sicurezza
// alimentare e un'invenzione qui non è un fastidio, è un rischio. Stessa
// filosofia di js/appliances.js — dati dichiarati, con la fonte scritta accanto.
//
// Fonti: FoodSafety.gov "Cold Food Storage Chart" e USDA FoodKeeper (tempi di
// conservazione), USDA "Safe Minimum Internal Temperature Chart" (temperature al
// cuore, convertite da °F a °C e arrotondate).
//
// I giorni in frigo sono per il piatto GIÀ COTTO, coperto e messo in frigo entro
// due ore. I mesi in congelatore riguardano la QUALITÀ: oltre restano sicuri ma
// peggiorano. Sono indicazioni prudenti, non una garanzia.

export const FONTE_CONSERVAZIONE = "FoodSafety.gov / USDA FoodKeeper";

// Ordine importante: la prima regola che corrisponde vince, quindi le voci
// specifiche stanno PRIMA di quelle generiche.
const CONSERVAZIONE = [
  { rx: /\bpesce\b|salmon|merluzz|orata|branzin|spigola|tonn|spada|platess|sogliol/i, frigo: "3-4 giorni", freezer: 3, nota: "Il pesce cotto perde qualità in fretta: consumalo entro pochi giorni." },
  { rx: /gamber|cozze|vongole|calamar|seppi|polp[oi]\b|frutti di mare|crostace/i, frigo: "3-4 giorni", freezer: 3, nota: "Frutti di mare cotti: non ricongelarli dopo lo scongelamento." },
  { rx: /pollo|tacchin|gallin|petto di pollo|coscia|ali di pollo/i, frigo: "3-4 giorni", freezer: 4 },
  { rx: /manzo|vitell|maial|agnell|arrost|brasat|spezzatin|bollit|stufat/i, frigo: "3-4 giorni", freezer: 3 },
  { rx: /rag[uù]|sugo di carne|bologne|polpett|polpetton|hamburger|macinat/i, frigo: "3-4 giorni", freezer: 3 },
  { rx: /zupp|minestr|vellutat|brodo|passato di verdur|crema di verdur/i, frigo: "3-4 giorni", freezer: 3 },
  { rx: /lasagn|cannellon|pasta al forno|parmigian|sformat|timball|gratin/i, frigo: "3-4 giorni", freezer: 3 },
  { rx: /risott|riso\b|orzott|farro\b|cous ?cous|quinoa/i, frigo: "3-4 giorni", freezer: 2, nota: "Raffredda il riso in fretta e mettilo in frigo entro un'ora." },
  { rx: /uov[ao]|frittat|omelette|carbonar/i, frigo: "3-4 giorni", freezer: 0, nota: "Le preparazioni con uovo non si congelano bene: cambiano consistenza." },
  { rx: /torta|crostat|biscott|ciambell|plumcake|muffin|pan di spagna/i, frigo: "5-7 giorni", freezer: 4, nota: "I dolci da forno si congelano bene già porzionati." },
  { rx: /tiramis|panna cotta|budin|crema pasticcer|mousse|cheesecake/i, frigo: "2-3 giorni", freezer: 1, nota: "Dolci al cucchiaio con uova o panna: pochi giorni, sempre in frigo." },
  { rx: /pane|focacc|pizza|schiacciat|grissin/i, frigo: "2-3 giorni", freezer: 3, nota: "Il pane in frigo indurisce: meglio a temperatura ambiente o congelato." },
  { rx: /insalat|verdur|contorn|ratatouille|caponata|melanzan|zucchin|peperon/i, frigo: "3-4 giorni", freezer: 2 },
  { rx: /legum|ceci|fagiol|lenticchi|fave\b|piselli/i, frigo: "3-4 giorni", freezer: 3 },
  { rx: /pesto|salsa|besciamell|maionese|hummus/i, frigo: "3-4 giorni", freezer: 2 }
];

// Temperatura al cuore: serve un termometro da cucina. Dove l'USDA indica anche
// un tempo di riposo, è scritto nella nota.
const AL_CUORE = [
  // Sta per PRIMA di tutte apposta. Una cotoletta può essere di pollo (74°C),
  // di maiale o di vitello (63°C): dal titolo non si capisce, e sbagliare per
  // difetto su una carne impanata è il tipo di errore che non vogliamo fare.
  // Quindi si dà sempre il valore più alto: è sicuro per tutti i tagli, e su una
  // fetta sottile si raggiunge comunque in fretta.
  { rx: /cotolett|cordon bleu/i, gradi: 74, nota: "Valore prudente: va bene per pollo, vitello o maiale. Per le cotolette di verdure non serve." },
  { rx: /pollo|tacchin|gallin|anatra|faraona|volatil/i, gradi: 74, nota: "Tutto il pollame, comprese le parti macinate." },
  { rx: /macinat|hamburger|polpett|polpetton|ragu|rag[uù]|bologne|salsicc/i, gradi: 71, nota: "Le carni macinate vanno più alte dei tagli interi." },
  { rx: /maial|lonza|arista|costine|braciol/i, gradi: 63, nota: "Poi 3 minuti di riposo prima di tagliare." },
  { rx: /manzo|vitell|agnell|roast ?beef|arrost|bistecc|filetto|controfilett/i, gradi: 63, nota: "63°C è la cottura sicura (media); poi 3 minuti di riposo." },
  { rx: /pesce|salmon|merluzz|orata|branzin|spigola|tonn|spada|platess|sogliol/i, gradi: 63, nota: "Oppure finché la polpa si sfalda con la forchetta." },
  { rx: /uov[ao]|frittat|omelette|sformato di uova/i, gradi: 71, nota: "Per i piatti a base di uovo." },
  { rx: /avanz|riscald|scaldare|rihe?at/i, gradi: 74, nota: "Gli avanzi vanno riportati a 74°C, non solo intiepiditi." }
];

// Il PIATTO si riconosce dal titolo, non dalla lista della spesa: una torta di
// mele contiene uova, ma non è "un piatto a base di uovo" e non si conserva come
// una frittata. Quindi si cerca prima nel titolo (più i tag), e solo se lì non
// c'è niente si ripiega sugli ingredienti. È lo stesso errore che faceva
// finire le polpette sul ripiano del pane, in js/ui.js.
function titoloDi(recipe) {
  if (!recipe) return "";
  return `${recipe.title || ""} ${(recipe.tags || []).join(" ")}`;
}
function ingredientiDi(recipe) {
  if (!recipe) return "";
  return (recipe.ingredients || []).map((i) => (i && i.name) || "").join(" ");
}
function trova(tabella, recipe, ripiegoSuIngredienti = true) {
  const t = titoloDi(recipe);
  if (t.trim()) {
    const perTitolo = tabella.find((x) => x.rx.test(t));
    if (perTitolo) return perTitolo;
  }
  if (!ripiegoSuIngredienti) return null;
  const ing = ingredientiDi(recipe);
  return ing.trim() ? tabella.find((x) => x.rx.test(ing)) || null : null;
}

// { frigo, freezer (mesi, 0 = sconsigliato), nota } oppure null se non sappiamo.
export function conservazioneFor(recipe) {
  const r = trova(CONSERVAZIONE, recipe);
  return r ? { frigo: r.frigo, freezer: r.freezer, nota: r.nota || "" } : null;
}

// { gradi, nota } oppure null: solo per i piatti dove la temperatura al cuore
// ha davvero senso (carne, pesce, uova). Per una torta non si propone.
export function alCuoreFor(recipe) {
  // Qui NIENTE ripiego sugli ingredienti: la torta contiene uova, ma scrivere
  // "cotto al cuore a 71°C" su una torta è un consiglio sbagliato dato con
  // l'aria di essere una regola di sicurezza. Meglio non dire nulla.
  const r = trova(AL_CUORE, recipe, false);
  return r ? { gradi: r.gradi, nota: r.nota || "" } : null;
}

// Mesi da proporre come predefinito in "Porziona e congela": prima si guardava
// sempre e comunque 3, che per il pesce è troppo e per un dolce è poco.
export function mesiFreezerSuggeriti(recipe) {
  const c = conservazioneFor(recipe);
  if (!c || !c.freezer) return 3;
  return c.freezer;
}
