// Base di conoscenza degli apparecchi: dati VERIFICATI sui manuali ufficiali.
// Serve a dare istruzioni vere (nomi reali delle funzioni, sequenza dei comandi,
// livelli consigliati dal costruttore) invece di farle inventare all'AI.
// Ogni voce dichiara la fonte. Se un modello non è qui, l'app resta sul generico.

export const APPLIANCE_KB = [
  {
    id: "samsung-nv7b5-dualcook",
    // Serie NV7B5xxx Dual Cook Flex (verificato sul manuale del NV7B5740TBS)
    match: /nv7b5\d{3}|dual\s?cook/i,
    label: "Samsung Dual Cook Flex (serie NV7B5)",
    source: "Manuale utente ufficiale Samsung in italiano",
    levels: 5,
    // Livelli e temperature dalle tabelle di cottura Samsung: hanno priorità
    // sulle regole generiche perché sono del costruttore per QUESTO forno.
    racks: [
      { rx: /lasagn|cannellon|pasta al forno|gratin|sformat/i, rack: "livello 3", temp: "190-200°C", note: "tabella Samsung: lasagne al livello 3" },
      { rx: /quiche|torta salata/i, rack: "livello 2", temp: "180-190°C", note: "tabella Samsung" },
      { rx: /pizza/i, rack: "livello 2", temp: "190-210°C", note: "pizza fatta in casa, tabella Samsung", mode: "Riscaldamento inferiore + Convezione" },
      { rx: /crostat|torta marmorizz|soufflé|souffle|crumble|meringh/i, rack: "livello 3", temp: null, note: "tabella Samsung" },
      { rx: /torta|pan di spagna|ciambell|plumcake|cheesecake/i, rack: "livello 2", temp: "160-170°C", note: "tabella Samsung: torte al livello 2" },
      { rx: /biscott|frollin/i, rack: "livello 3 (o 1+3 su due teglie)", temp: "140-165°C", note: "tabella Samsung" },
      { rx: /arrost|pollo|maial|agnello|manzo|lombata|cosciotto/i, rack: "griglia al livello 3 + teglia al livello 1", temp: null, note: "Samsung: teglia sotto per raccogliere i sughi" },
      { rx: /toast/i, rack: "livello 5", temp: "270°C", note: "Samsung: toast sotto il grill" },
      { rx: /grigliat|spiedin|braciol|salsicc/i, rack: "griglia al livello 4 + teglia al livello 1", temp: null, note: "tabella Samsung grigliatura" }
    ],
    // Testo compatto passato all'AI come fonte attendibile sui comandi reali.
    howto: [
      "PANNELLO (verificato dal manuale): display + UNA manopola chiamata 'Selettore' + tasti touch.",
      "Tasti: Accensione, Selettore zona alta/bassa, Avvio/Arresto, Tempo di cottura, Luce, Smart Control, Opzioni, Indietro.",
      "SEQUENZA REALE: 1) premi Accensione. 2) RUOTA il Selettore per scegliere la modalità e PREMI il Selettore per confermare. 3) RUOTA il Selettore per la temperatura e PREMI per confermare. 4) per la durata tocca il tasto 'Tempo di cottura' (oppure ruota fino a 'Impostazione tempo di cottura'), imposta e conferma. 5) parte il preriscaldamento: un segnale acustico avvisa quando è pronto per infornare.",
      "NOMI ESATTI DELLE MODALITÀ (con temperatura suggerita da Samsung): Convezione (160°C, ventilata, più livelli insieme); Convenzionale (180°C, sopra+sotto, cottura standard); Convezione Eco (160°C, NON va preriscaldata); Grill grande (220°C, per rosolare la superficie di carne, lasagne o gratin); Grill Eco (220°C, porzioni piccole); Grill ventilato (180°C); Riscaldamento superiore + Convezione (180°C, per doratura in superficie); Riscaldamento inferiore + Convezione (200°C, consigliata per pizza, pane e torte); Riscaldamento inferiore (150°C, per dorare il fondo a fine cottura); Rosolatura (160°C); Sottovuoto ad aria (60°C); Air Fry (220°C).",
      "RIPIANI: 5 livelli numerati DAL BASSO (1 = più basso, 5 = più alto).",
      "DUAL COOK: il divisorio va inserito al LIVELLO 3; il forno lo rileva da solo e attiva la doppia cottura preselezionando la zona superiore. Le zone si scelgono con i tasti 'Selettore zona alta/bassa', attivi solo col divisorio inserito. Avvio: il tasto Avvio superiore per la zona alta, quello inferiore per la zona bassa.",
      "Air Fry: richiede il divisorio, va nella zona superiore con la teglia al livello 4, non serve preriscaldare e blocca l'uso della zona inferiore."
    ].join(" "),
    quirks: [
      "L'ordine delle modalità nel menu cambia da solo dopo 10 utilizzi (dalle più usate): non fidarti della posizione, cerca il nome.",
      "Se il divisorio resta dentro, la cottura singola non parte (compare -dC-). Toglilo per cuocere a forno intero.",
      "Il display touch non risponde con i guanti da forno.",
      "In doppia cottura le due temperature non sono libere: si limitano a vicenda (es. con 200°C sopra, sotto puoi stare tra 145 e 250°C).",
      "La 'Convezione Eco' è l'unica che non va preriscaldata.",
      "Vapore naturale: acqua nella teglia a forno FREDDO e solo insieme alla modalità Convezione."
    ]
  }
];

export function applianceKB(model) {
  const m = String(model || "").trim();
  if (!m) return null;
  return APPLIANCE_KB.find((k) => k.match.test(m)) || null;
}

// Livello/temperatura consigliati dal costruttore per questo piatto, se noti.
export function kbRackFor(kb, text) {
  if (!kb || !kb.racks) return null;
  const hay = String(text || "");
  return kb.racks.find((r) => r.rx.test(hay)) || null;
}
