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
    id: "moulinex-icompanion-touch-xl",
    // Robot: non usa "Come lo imposto?" ma alimenta la Modalità robot.
    match: /i-?companion|companion\s*(touch|xl)|hf9[0-9]{2}/i,
    label: "Moulinex i-Companion Touch XL (serie HF93x)",
    source: "Manuale utente ufficiale Groupe SEB/Moulinex (cod. 8020007193)",
    family: "robot",
    howto: [
      "SPECIFICHE (dal manuale): potenza 1550 W, temperatura da 30 a 150 °C regolabile a passi di 5 °C, 13 velocità, durata da 5 secondi a 2 ore.",
      "ACCESSORI con i nomi ufficiali: E1 lama tritatutto ultrablade (zuppe, tritare verdura/carne/pesce; NON per prodotti duri); E2 miscelatore (rosolatura, cottura a fuoco lento, risotti, senza rovinare gli ingredienti); E3 sbattitore (albumi a neve max 8, maionese, panna: MAI oltre velocità 9 e mai per impastare); E4 lama per impastare/macinare (pane, brioche, torte, frutta a guscio, prodotti duri, ghiaccio); E5 cestello a vapore.",
      "PROGRAMMI AUTOMATICI (14) con i valori preimpostati: Salse V6 70 °C 8 min; Zuppa vellutata 100 °C 40 min; Zuppa densa 100 °C 45 min; Rosolatura V3 130 °C 5 min (temperatura non regolabile); Cottura lenta V1 95 °C 45 min; Risotto V2 95 °C 20 min; Vapore basso 100 °C 30 min; Vapore alto 100 °C 35 min; Pane V5 2 min 30; Brioche V5+V6 3 min 30; Torta V3+V9 3 min 40; Dessert V4 90 °C 15 min; Riscaldamento V2 90 °C 20 min; Risciacquo V8 80 °C 5 min.",
      "PANNELLO: display touchscreen a colori con 5 tasti (Annullare, Bilancia, START/STOP centrale, Video, Impostazioni) e interruttore 0/I posteriore. In Modalità manuale si sceglie nell'ordine velocità, temperatura e durata con i tasti + e −, poi START.",
      "VAPORE: servono 0,7 litri d'acqua (tacca dedicata) e il tappo in posizione Massimo.",
      "TAPPO DI REGOLAZIONE DEL VAPORE: posizione Massimo per le cotture a vapore e per evitare schizzi; posizione Minimo per risotti, creme e salse, così la condensa esce e la consistenza è migliore."
    ].join(" "),
    quirks: [
      "Sopra i 135 °C si cuoce SOLO col coperchio aperto e senza accessori (solo il perno), niente velocità, massimo 20 minuti.",
      "Lo sbattitore E3 non supera la velocità 9 e non va usato per impastare: per quello serve la lama E4.",
      "Versa prima i solidi e poi i liquidi, senza superare la tacca MAX incisa nel recipiente.",
      "Con temperatura da 50 °C e velocità da 5 in su, il coperchio resta bloccato per 10 secondi (conto alla rovescia a display).",
      "Nei programmi Pane e Brioche parte una lievitazione a 30 °C per 40 minuti: se apri il coperchio o togli il recipiente il programma si ferma.",
      "La cottura senza coperchio non va usata per confetture e preparazioni a base di latte (fuoriescono)."
    ]
  },
  {
    id: "whirlpool-jt359",
    // Microonde combinato: microonde + grill + aria ventilata + crisp + vapore
    match: /jt\s?-?359|amw\s?-?359/i,
    label: "Whirlpool JT 359",
    source: "Manuale d'uso ufficiale Whirlpool in italiano (cod. 4619 694 50162)",
    family: "microonde",
    // Programmi automatici con le classi e i pesi dichiarati dal manuale.
    table: [
      // Lo scongelamento va riconosciuto PRIMA del tipo di alimento.
      { rx: /scongel/i, temp: "Jet Defrost", time: "in base al peso", note: "classi: CARNE, POLLAME, PESCE, VERDURE, PANE · a metà chiede TURN (girare)" },
      { rx: /pizza/i, temp: "6° Senso Crisp", time: "programma automatico", note: "classe PIZZA sottile 250-500 g o PIZZA ALTA 300-800 g · solo surgelati pronti · sul piatto Crisp" },
      { rx: /patatin|patate fritte/i, temp: "6° Senso Crisp", time: "programma automatico", note: "classe PATATE FRITTE 250-600 g · surgelate · sul piatto Crisp" },
      { rx: /ali di pollo|alette/i, temp: "6° Senso Crisp", time: "programma automatico", note: "classe ALI DI POLLO 250-600 g · sul piatto Crisp" },
      { rx: /quiche|torta salata/i, temp: "6° Senso Crisp", time: "programma automatico", note: "classe QUICHE 400-800 g · sul piatto Crisp" },
      { rx: /lasagn/i, temp: "Aria Ventilata Automatica", time: "programma automatico", note: "classe LASAGNE SURGELATE 400 g - 1 kg" },
      { rx: /pollo(?! arrost)|pollo arrost/i, temp: "Aria Ventilata Automatica", time: "programma automatico", note: "classe POLLO 800 g - 1,5 kg" },
      { rx: /biscott/i, temp: "Aria Ventilata Automatica", time: "programma automatico", note: "classe BISCOTTI · il forno preriscalda e poi chiede di inserire il cibo (Add food), teglia sulle guide laterali" },
      { rx: /pane|panin/i, temp: "Aria Ventilata Automatica", time: "programma automatico", note: "classi PASTA PER IL PANE IN SCATOLA o PANINI SURGELATI" },
      { rx: /patate al forno/i, temp: "6° Senso per la Cottura", time: "programma automatico", note: "classe PATATE AL FORNO 2-4 pezzi da circa 250 g" },
      { rx: /patate less|patate bollit/i, temp: "6° Senso per la Cottura", time: "programma automatico", note: "classe PATATE BOLLITE 250 g - 1 kg" },
      { rx: /verdur.*(surgelat|congelat)/i, temp: "6° Senso per la Cottura", time: "programma automatico", note: "classe VERDURE SURGELATE 250-750 g" },
      { rx: /verdur/i, temp: "6° Senso Vapore", time: "2-3 min tenere · 4-5 min dure", note: "con 50-100 ml d'acqua sul fondo · pentola vapore SOLO con microonde" },
      { rx: /riscalda|avanzi/i, temp: "6° Senso per Riscaldare", time: "automatico", note: "250-600 g · usa sempre il coperchio in dotazione (tranne per le zuppe)" },
      { rx: /uovo|uova|pancett|salsicc|hamburger/i, temp: "Crisp", time: "in base al cibo", note: "la funzione Crisp è pensata anche per uova, pancetta, salsicce e hamburger · alimenti direttamente sul piatto Crisp" }
    ],
    howto: [
      "PANNELLO (verificato dal manuale): SOLO tasti e display, NESSUNA manopola.",
      "Tasti principali: MANUAL (sceglie la funzione), WATTS (livello di potenza microonde), FOOD (classe dell'alimento), tasto temperatura, tasti +/- (tempo o peso), Avvio, Arresto, Orologio. Ci sono poi tasti dedicati per Jet Defrost e per le funzioni 6° Senso.",
      "SEQUENZA REALE microonde: premi MANUAL (ripetuto) per scegliere la funzione, poi +/- per il tempo, poi WATTS per la potenza, infine Avvio.",
      "Varianti: Grill e Crisp = MANUAL, +/- tempo, Avvio (nessuna potenza). Grill Combinato = MANUAL, tempo, WATTS, Avvio. Aria Ventilata = MANUAL, tempo, tasto temperatura, Avvio. Aria Ventilata Combinata = MANUAL, tempo, temperatura, WATTS, Avvio. Riscaldamento Rapido = MANUAL, temperatura, Avvio a forno vuoto.",
      "JET START: si preme solo Avvio e parte subito alla massima potenza per 30 secondi; ogni pressione aggiunge 30 secondi (anche durante la cottura).",
      "FUNZIONI (nomi esatti): Jet Start, Grill, Grill Combinato, Crisp, Riscaldamento Rapido, Aria Ventilata, Aria Ventilata Combinata, Jet Defrost, Aria Ventilata Automatica, 6° Senso per Riscaldare, 6° Senso Crisp, 6° Senso per la Cottura a Vapore, 6° Senso per la Cottura. Ha 8 livelli di potenza microonde; per lo scongelamento manuale il manuale indica 160 W.",
      "CRISP: usa SOLO il piatto Crisp in dotazione, sempre al centro del piatto rotante in vetro, con gli alimenti appoggiati direttamente sopra. Il preriscaldamento è facoltativo, massimo 3 minuti e va fatto con la funzione Crisp stessa. Si toglie con la maniglia Crisp o i guanti.",
      "ACCESSORI: coperchio, maniglia per il piatto Crisp, piatto Crisp, guida e piatto rotante in vetro, piatto da forno, griglia di cottura (posizione alta o bassa), pentola per cottura a vapore."
    ].join(" "),
    quirks: [
      "Il piatto da forno va usato SOLO con Aria Ventilata e Aria Ventilata Automatica: mai insieme alle microonde.",
      "La pentola per cottura a vapore va usata ESCLUSIVAMENTE con la funzione microonde, mai con le altre.",
      "Il piatto rotante deve restare sempre al suo posto: non far funzionare il forno senza.",
      "Griglia in posizione alta per il grill, bassa per le cotture combinate e ventilate.",
      "Non toccare il piatto Crisp a mani nude e non appoggiarci sopra contenitori o involucri: solo alimenti.",
      "Mai far funzionare le microonde a vuoto e mai cuocere uova intere (esplodono).",
      "Scritte sul display che sembrano errori ma sono normali: COOL (raffreddamento), door (sicurezza, apri e richiudi), PRE-HEAT, Add food (metti ora il cibo).",
      "Se usi poco il grill, fallo girare da solo 10 minuti una volta al mese per bruciare i residui."
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
