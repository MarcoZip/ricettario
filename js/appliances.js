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
  },
  {
    id: "moulinex-easyfry-mega",
    // Easy Fry Mega = famiglia EZ855 (verificato sul manuale ufficiale Moulinex)
    match: /easy\s?fry\s?mega|ez855/i,
    label: "Moulinex Easy Fry Mega (EZ855)",
    source: "Manuale utente ufficiale Moulinex (rif. 1820012985)",
    family: "friggitrice",
    ranges: { temp: "80-200 °C", time: "1-60 minuti" },
    // Tabella di cottura del manuale: temperature e tempi ufficiali per cibo.
    table: [
      { rx: /patatin.*(surgelat|congelat)|patate fritte surgelate/i, temp: "180 °C", time: "22-40 min", note: "500 g – 1,5 kg · scuoti · resa migliore con 1,5 kg" },
      { rx: /patatin|patate fritte/i, temp: "180 °C", time: "28-37 min", note: "fatte in casa 8x8 mm · +1 cucchiaio d'olio · scuoti" },
      { rx: /patate arrost|patate al forno/i, temp: "180 °C", time: "45 min", note: "+1 cucchiaio d'olio · scuoti" },
      { rx: /bistecc/i, temp: "180 °C", time: "12 min", note: "100-600 g (1-4 pezzi)" },
      { rx: /pollo arrost|pollo intero/i, temp: "200 °C", time: "45-60 min", note: "fino a 2 kg" },
      { rx: /cosce di pollo|fusi di pollo|alette/i, temp: "200 °C", time: "40 min", note: "500 g – 1,5 kg" },
      { rx: /petto di pollo|pollo/i, temp: "180 °C", time: "30-40 min", note: "200-900 g" },
      { rx: /agnello|costolett/i, temp: "200 °C", time: "33 min", note: "200 g – 1 kg" },
      { rx: /salsicc|wurstel/i, temp: "200 °C", time: "15-20 min", note: "300 g – 1 kg" },
      { rx: /salmone|filetto di pesce|pesce/i, temp: "160 °C", time: "12-18 min", note: "100-700 g" },
      { rx: /gamber/i, temp: "190 °C", time: "6-14 min", note: "300-600 g · scuoti" },
      { rx: /crocchett|nugget/i, temp: "200 °C", time: "10-15 min", note: "surgelate · gira a metà" },
      { rx: /anelli di cipolla/i, temp: "200 °C", time: "5-7 min", note: "congelati · scuoti" },
      { rx: /involtini primavera/i, temp: "200 °C", time: "10 min", note: "scuoti" },
      { rx: /pizza/i, temp: "190 °C", time: "5-15 min", note: "una pizza da 24 cm (surgelata 5-15 min, fresca 5-10)" },
      { rx: /zucchin/i, temp: "180 °C", time: "15-18 min", note: "200-400 g" },
      { rx: /cavolfior|broccol/i, temp: "180 °C", time: "14-16 min", note: "300-600 g" },
      { rx: /muffin/i, temp: "180 °C", time: "18 min", note: "4-9 pezzi · usa una teglia, riempila a metà" },
      { rx: /torta|dolce|ciambell/i, temp: "180 °C", time: "18 min", note: "150-400 g · usa una teglia, riempila a metà" },
      { rx: /riscalda|avanzi/i, temp: "160 °C", time: "max 10 min", note: "per riscaldare gli avanzi" }
    ],
    howto: [
      "PANNELLO (verificato dal manuale): touch screen digitale + una manopola centrale che si preme (integra Avvio/Pausa).",
      "SEQUENZA REALE: 1) metti il cibo nel cestello con la griglia e reinserisci il cestello. 2) premi per accendere: parte il programma 'Manuale' a 200 °C / 15 minuti. 3) per un programma preimpostato premi il pulsante programma (inizia a lampeggiare 'Patatine fritte') e scegli RUOTANDO la manopola. 4) per la temperatura premi il pulsante temperatura e regola con la manopola (lampeggia 6 secondi, poi è confermata). 5) stessa cosa per il tempo col pulsante timer. 6) premi il pulsante per avviare: il display mostra il tempo rimanente. Per spegnere prima, tieni premuto 2 secondi.",
      "PROGRAMMI PREIMPOSTATI (8, nomi esatti): Patatine fritte, Carne, Pollo, Gamberetti, Pesce, Pizza, Verdure, Dolce. Moulinex non pubblica temperatura e tempo di ciascuno.",
      "RANGE: temperatura da 80 a 200 °C, tempo da 1 a 60 minuti.",
      "NON esiste una funzione di preriscaldamento: il cibo si mette dentro prima di accendere.",
      "A META' COTTURA: metti in pausa premendo la manopola, estrai il cestello dalla maniglia, scuoti, reinserisci e riprendi. Non c'è promemoria automatico."
    ].join(" "),
    quirks: [
      "Non c'è il preriscaldamento: si mette il cibo dentro e si accende.",
      "Se togli il cestello va in pausa: rimettilo entro 10 minuti o perdi programma, tempo e temperatura.",
      "Nessun avviso automatico per scuotere: il manuale consiglia di scuotere 2-3 volte durante la cottura.",
      "Non superare le quantità massime della tabella e non mettere olio o liquidi nel cestello (solo 1 cucchiaio d'olio mescolato alle patate).",
      "Per torte e muffin usa una teglia dentro il cestello e riempila non oltre metà.",
      "Il cestello pieno è pesante e bollente: prendilo dalla maniglia con due mani."
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

// Riga della tabella di cottura ufficiale (friggitrici, microonde): temperatura,
// tempo e quantità consigliate dal costruttore per questo cibo.
export function kbTableFor(kb, text) {
  if (!kb || !kb.table) return null;
  const hay = String(text || "");
  return kb.table.find((r) => r.rx.test(hay)) || null;
}
