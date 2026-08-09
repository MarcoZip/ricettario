// Storico delle novità (il più recente in cima). A ogni pubblicazione: aggiungere
// una voce qui e alzare APP_VERSION in config.js. La finestra "Novità" mostra le
// voci più recenti di quella già vista dall'utente, MA solo quelle "degne di nota"
// (le voci con `minor: true` — correzioni/ritocchi — restano nello storico in
// Opzioni ma non fanno comparire il popup).

export const CHANGELOG = [
  {
    v: "8.47",
    d: "2026-08-09",
    minor: true,
    items: [
      "Le cotolette e il cordon bleu ora mostrano anche la temperatura al cuore: <b>74°C</b>. È il valore prudente — va bene per pollo, vitello o maiale, visto che dal nome del piatto non si capisce quale sia."
    ]
  },
  {
    v: "8.46",
    d: "2026-08-09",
    minor: true,
    items: [
      "Corretto: la casella di \"Detta la ricetta\" appariva bianca e fuori tema rispetto al resto dell'app."
    ]
  },
  {
    v: "8.45",
    d: "2026-08-09",
    items: [
      "Nuovo interruttore in Impostazioni → <b>Vibrazione</b>, con un tasto \"Prova\": prima non c'era modo di spegnerla. Ora si sospende anche da sola quando accendi il risparmio batteria.",
      "Il telefono ora vibra quando qualcosa <b>non riesce</b>: in cucina spesso è appoggiato e non lo guardi, e un errore restava del tutto silenzioso.",
      "Vibra anche quando <b>avvii un timer</b>, così sai che è partito senza doverlo controllare.",
      "Tolta la vibrazione all'apertura di ogni ricetta: è il gesto più frequente, e un colpetto decine di volte al giorno diventa fastidio invece che conferma.",
      "Corretto: salvando una ricetta il telefono vibrava due volte di fila, una sopra l'altra."
    ]
  },
  {
    v: "8.44",
    d: "2026-08-09",
    items: [
      "L'app scorre più fluida sul telefono. Gli effetti legati allo scorrimento — la foto della ricetta che si muove piano, il riflesso di luce sulle schede di vetro — ora li disegna direttamente il browser invece di calcolarli con del codice a ogni movimento del dito.",
      "Le schede con foto fuori dallo schermo non vengono più preparate finché non servono: con tante ricette la lista scorre più leggera.",
      "Gli angoli delle schede sono ora \"a squircle\", con la curva che entra più morbida nei lati — la stessa forma degli angoli del telefono.",
      "Le caselle di testo lunghe (note, dettatura, passaggi) crescono da sole man mano che scrivi, invece di restare piccole con la barra di scorrimento dentro.",
      "Corretto un errore silenzioso che compariva quando si toccava due volte di fila molto in fretta, cambiando schermata o tema."
    ]
  },
  {
    v: "8.43",
    d: "2026-08-09",
    items: [
      "Cercando, le parole che hai scritto vengono <b>evidenziate</b> nei titoli dei risultati, sia nel tuo ricettario sia in Scopri: si capisce a colpo d'occhio perché una ricetta è comparsa.",
      "La ricerca nel tuo ricettario ora capisce il singolare e il plurale come già faceva quella online: <i>\"torta mela\"</i> trova <i>\"Torta di mele e zucca\"</i>, <i>\"zucchina\"</i> trova le ricette con le zucchine.",
      "Nuova scheda nelle ricette: <b>\"Quanto dura, e quando è cotto\"</b> — quanti giorni si conserva in frigo, quanti mesi in congelatore e a che temperatura al cuore la carne o il pesce sono cotti. Sono tabelle ufficiali (FoodSafety.gov / USDA FoodKeeper), non risposte generate dall'AI: funzionano anche senza rete.",
      "\"Porziona e congela\" propone ora i mesi giusti per quel piatto invece di sempre 3: il pesce meno, un dolce da forno di più.",
      "Novità: <b>\"Detta la ricetta a voce\"</b> nel modulo di una nuova ricetta. Parli, l'app scrive, e poi trasforma da sola quello che hai detto in titolo, ingredienti e passaggi. Comodo se te la detta qualcuno al telefono.",
      "Entrando in una ricetta la schermata scorre da destra e tornando indietro rientra da sinistra: prima i due movimenti erano identici e si perdeva il senso di dove si stava andando."
    ]
  },
  {
    v: "8.42",
    d: "2026-08-09",
    minor: true,
    items: [
      "Casa condivisa: se tu e l'altra persona aggiungete lo stesso articolo nello stesso momento, in lista comparivano due voci uguali. Ora l'app se ne accorge e le unisce da sola, sommando le quantità. Gli articoli già spuntati non vengono toccati."
    ]
  },
  {
    v: "8.41",
    d: "2026-08-09",
    items: [
      "Corretto un difetto che faceva sparire ingredienti dalla spesa: se in dispensa avevi \"latte\", aggiungendo <b>\"latte di cocco\"</b> l'app rispondeva \"è già in dispensa\" e non lo metteva in lista. Lo stesso con olio/olio di semi, panna/panna da cucina. Ora il confronto è esatto (restano uguali solo singolare e plurale, come pomodoro/pomodori).",
      "Novità: ricucinando un piatto, al primo passo della Modalità cucina ricompare la nota che avevi lasciato l'ultima volta con \"Com'è venuta?\" — <i>\"meno sale\", \"10 minuti in più\"</i>. Prima quella nota finiva in fondo alla scheda e non tornava mai quando serviva.",
      "La ricerca ora guarda anche dentro le tue note, così ritrovi il piatto che avevi annotato. (Non nei passaggi: cercando \"sale\" risponderebbe mezzo ricettario.)",
      "Ripristino da backup: prima falliva del tutto se il ricettario era grande, e non era una vera sostituzione — quello che avevi e non era nel backup restava lì. Ora funziona anche con molti dati e sostituisce davvero. In Casa condivisa la lista della spesa e i menù delle feste non vengono toccati, perché appartengono anche all'altra persona.",
      "Lo scorrimento della scheda ricetta è più fluido sui telefoni meno recenti, e lo schermo non resta più acceso a consumare batteria se esci subito dalla Modalità cucina o dalla Modalità supermercato.",
      "\"Come lo imposto?\": la regola che impedisce all'assistente di inventarsi il ripiano ora vale anche quando il tuo apparecchio non è fra quelli già noti all'app ma hai scritto tu le note del manuale."
    ]
  },
  {
    v: "8.40",
    d: "2026-08-09",
    items: [
      "Tolti due pulsanti diventati doppioni: \"Modalità cucina\" in fondo alla preparazione e \"Segna come cucinata\" in mezzo alla pagina. Fanno esattamente le stesse cose di <b>Cucina</b> e <b>Fatta</b> nella barra in basso, che è sempre a portata di pollice. Il conteggio delle volte che hai cucinato un piatto ora si legge sul tasto \"Fatta\".",
      "Il pulsante \"Com'è venuto? Controlla con una foto\" si chiama ora <b>\"Giudica la foto del piatto\"</b>: prima stava attaccato a \"Com'è venuta?\" e i due nomi differivano per una sola lettera, pur facendo cose diverse — uno è il tuo voto con nota, l'altro è l'AI che guarda la foto e dice com'è riuscito."
    ]
  },
  {
    v: "8.39",
    d: "2026-08-09",
    minor: true,
    items: [
      "Il pulsante \"Come lo imposto?\" andava a capo su due righe quando il nome dell'apparecchio era lungo (es. Samsung Dual Cook NV7B5740TBS). Ora il nome viene accorciato tagliando fra una parola e l'altra, e il pulsante è alto come tutti gli altri."
    ]
  },
  {
    v: "8.38",
    d: "2026-08-09",
    items: [
      "Aprendo una ricetta ora trovi in basso una barra sempre visibile con le tre cose che si fanno davvero: <b>Cucina</b>, <b>Alla spesa</b>, <b>Fatta</b>. Prima \"Modalità cucina\" era in fondo alla preparazione, a tre o quattro schermate di distanza, da cercare con le mani sporche.",
      "I pulsanti sotto la ricetta erano una colonna di diciassette, tutti uguali: ora sono divisi in tre gruppi con un titolo — \"Mentre cucini\", \"Quando hai finito\", \"Salva e condividi\". Ci sono tutti, sono solo più facili da trovare.",
      "Nuovo tasto ⏱ in alto: il timer è sempre a un tocco, con le durate pronte (3, 5, 10, 15, 30 minuti) per non dover digitare i minuti.",
      "Piano → Settimana: al posto di tre pulsanti che sembravano la stessa cosa (\"Menù AI\", \"Menù settimana\", \"Riempi le cene\") ora c'è <b>Crea il menù</b>, che ti fa scegliere fra le tre strade spiegandole — compreso quale prepara anche la lista della spesa.",
      "In Dispensa un solo pulsante \"Cosa posso cucinare con questi?\": la scelta degli avanzi è dentro, dove serve. E in Scopri il vecchio \"Svuota frigo\" si chiama ora \"Cerca online con quello che hai\", che è ciò che fa davvero.",
      "Impostazioni: dieci sezioni diventano quattro, con i nomi di prima conservati come sotto-titoli. Niente è stato tolto né spostato altrove.",
      "Nuovo in Impostazioni → Dati: \"Cosa usi davvero\", il conteggio di quante volte hai toccato ciascun pulsante. Resta su questo telefono, non viene inviato a nessuno e non entra nel backup: serve a capire cosa vale la pena semplificare, invece di indovinare."
    ]
  },
  {
    v: "8.37",
    d: "2026-08-09",
    items: [
      "Due schede della barra in basso cambiano nome: \"Strumenti\" diventa \"Ricette\" (è lì che stanno le tue, ordinate per forno, friggitrice e compagnia) e \"Ricettario\" diventa \"Scopri\" (è lì che si cercano idee nuove online).",
      "Cambiano solo i nomi: dentro non si è spostato niente, tutto funziona esattamente come prima.",
      "Il motivo: \"Strumenti\" indicava due cose diverse — la schermata delle ricette e i tuoi apparecchi di cottura. Adesso \"Strumenti\" vuol dire una cosa sola, cioè forno, microonde, friggitrice e robot.",
      "Aggiornati di conseguenza la Guida e l'assistente \"Chiedi a Fornelli\", che cercando \"ricettario\" ti porta comunque su Scopri."
    ]
  },
  {
    v: "8.36",
    d: "2026-08-09",
    items: [
      "\"Come lo imposto?\": il riquadro \"Sul tuo pannello\", che viene dal manuale del tuo apparecchio, ora compare subito e resta anche senza rete. Prima spariva insieme ai passaggi, pur essendo già in memoria: proprio in cucina, dove il telefono prende peggio.",
      "Non viene più inventata una temperatura quando la ricetta non la indica: al suo posto trovi \"non indicata nella ricetta — controlla tu\". Prima l'assistente riempiva il vuoto con un valore suo, che appariva identico ai dati presi dal manuale.",
      "Nella stessa schermata i passaggi scritti dall'assistente sono ora separati e indicati come tali, per non confonderli con i dati verificati.",
      "Nel fine settimana il pianificatore si apre sulla settimana che viene: di domenica proponeva quella che stava finendo e ci si pianificavano cene già passate, spesa compresa.",
      "La stima del carrello ora conta anche gli articoli scritti senza quantità (latte, pane): prima ne saltava la maggior parte e il totale era molto più basso del vero.",
      "\"Cuciniamo\" adesso cucina: dal suggerimento della sera si entra diritti in Modalità cucina, invece di dover cercare il pulsante tre schermate più in basso."
    ]
  },
  {
    v: "8.35",
    d: "2026-08-09",
    items: [
      "I timer ora sono veri orologi: prima contavano un secondo per ogni battito dell'app, così mettendo il telefono in tasca o cambiando applicazione il conto si fermava e la pasta scuoceva. Ora tengono il tempo giusto anche a schermo bloccato.",
      "I timer non si perdono più: restano attivi anche se chiudi l'app o se arriva un aggiornamento mentre il forno è acceso.",
      "Corretto: gli avvisi durante la Modalità cucina e la Modalità supermercato erano nascosti dietro la schermata — c'erano ma non si vedevano, compreso \"⏰ timer finito\".",
      "Al supermercato la lista non torna più in cima a ogni spunta: resta dov'eri.",
      "Ricerca migliorata sui plurali corti: \"torta mela\" ora trova anche \"Torta di mele\" (come uovo/uova, fico/fichi, pera/pere), e \"pasta all'uovo\" non nasconde più i risultati giusti.",
      "Il ripiano del forno viene deciso dal piatto e non da una parola qualsiasi dei passi: le polpette non finiscono più sul ripiano del pane solo perché il pane si ammolla nel latte.",
      "Il microonde ora mostra anche i suoi programmi automatici presi dal manuale: c'erano già in memoria ma non venivano mai letti.",
      "Corretto: in casa condivisa, a ogni apertura dell'app compariva \"X ha aggiunto...\" per articoli vecchi di giorni.",
      "Il budget della spesa ora è impostabile subito: prima la riga per impostarlo appariva solo dopo aver già speso.",
      "Corretto: finita la Modalità cucina lo schermo restava acceso, e chiudendola mentre l'assistente rispondeva il telefono continuava a parlare.",
      "\"Segna come cucinata\" ora dice la verità: se la cena era già stata contata poco prima te lo dice, invece di far finta di averla contata.",
      "Corretto un errore che, usando l'app senza account (solo su questo telefono), impediva alla schermata Home di comparire."
    ]
  },
  {
    v: "8.34",
    d: "2026-08-09",
    minor: true,
    items: [
      "Corretto: l'assistente \"Chiedi a Fornelli\" e la Guida parlavano di \"Opzioni\", ma il tasto in basso si chiama \"Impostazioni\" — ora i testi usano il nome giusto.",
      "Aggiunte all'assistente le voci mancanti per: Scansiona lo scontrino, Come lo imposto? (forno/microonde/friggitrice/piano cottura), Porziona e congela, Presto da ricomprare, Svuota il frigo, Bilancio nutrizionale della settimana, Sfide della settimana, Album di cucina, Aggiungi al calendario, Muro delle ricette, Reazioni della famiglia, Copertina personale.",
      "Corretto: finire la Modalità cucina e poi toccare anche \"Segna come cucinata\" contava due volte la stessa cena, falsando statistiche, diario, album e sfide.",
      "Corretto: il tasto \"Cosa posso cucinare con questi?\" apriva una finestra intitolata \"Svuota la dispensa\", che è un'altra cosa."
    ]
  },
  {
    v: "8.33",
    d: "2026-06-24",
    items: [
      "Corretto: in tema chiaro il pulsante \"Nuova ricetta\" in Home era quasi invisibile (scritta chiara su sfondo chiaro).",
      "Protezioni sul servizio online dell'app: limite di richieste ravvicinate, blocco degli indirizzi interni e tetto alla dimensione delle foto inviate. Serve a evitare che estranei consumino le funzioni AI."
    ]
  },
  {
    v: "8.32",
    d: "2026-06-24",
    items: [
      "Corretto: toccando \"Le tue statistiche\" si aprivano due finestre sovrapposte e il pulsante \"Diario di cucina\" non faceva nulla. Ora funzionano entrambi, e tornano raggiungibili Album, Traguardi e Calendario delle cotture.",
      "Corretto un problema che poteva mostrare un ricettario vuoto aprendo l'app senza rete dopo un aggiornamento.",
      "Se la memoria del telefono è piena ora l'app te lo dice, invece di far finta di aver salvato.",
      "Non si possono più inserire porzioni, tempi o quantità negativi (facevano comparire ingredienti con dosi negative).",
      "Corretto il ripristino da backup quando è attiva la Casa condivisa: spesa e menù delle feste finivano in un posto che l'app non leggeva."
    ]
  },
  {
    v: "8.31",
    d: "2026-06-24",
    items: [
      "Ricerca online più precisa: cercando due parole (es. \"risotto peperoni\") non compaiono più ricette che ne contengono solo una, come \"risotto alla zucca\". Singolare e plurale valgono uguale (\"peperone\" trova \"peperoni\"), e se nessuna ricetta ha tutte le parole vedi comunque i risultati, ordinati dal più pertinente."
    ]
  },
  {
    v: "8.30",
    d: "2026-06-24",
    minor: true,
    items: [
      "Forno AEG: aggiunte le posizioni dei comandi lette dalla foto (spegnimento in alto, lampadina in alto a destra, scongelamento in basso a sinistra) e il promemoria che il forno parte da solo girando le manopole, senza tasto avvio."
    ]
  },
  {
    v: "8.29",
    d: "2026-06-24",
    items: [
      "Forno Samsung: inseriti i nomi ESATTI letti sul display (Tradizionale, Ventilato, Eco-Ventilato, Calore superiore/inferiore + Ventilato, Rosolatura, Air Sous Vide…). Erano quasi tutti diversi da quelli del manuale, quindi ora l'app ti dice il nome che vedi davvero girando il Selettore.",
      "Scoperto che il forno ha anche la cottura a vapore e l'Air Sous Vide (il manuale generico lasciava il dubbio). Air Fry invece compare solo in doppia cottura, col divisorio inserito."
    ]
  },
  {
    v: "8.28",
    d: "2026-06-24",
    items: [
      "Nella guida compare ora il riquadro \"Sul tuo pannello\" con la sequenza REALE dei comandi del tuo apparecchio (ruota il Selettore e premi sul Samsung, le due manopole sull'AEG, MANUAL e WATTS sul microonde…). Questo testo è preso dai manuali e dalle foto, non generato dall'AI: è sempre lo stesso e sempre giusto."
    ]
  },
  {
    v: "8.27",
    d: "2026-06-24",
    items: [
      "Forno Samsung: dalla foto del pannello è emerso che il display chiama \"Tradizionale\" la funzione che il manuale chiama \"Convenzionale\". Ora l'app usa il nome che leggi davvero sul forno, e conosce la disposizione reale dei tasti (riga in alto = zona superiore, riga in basso = zona inferiore, manopola a destra)."
    ]
  },
  {
    v: "8.26",
    d: "2026-06-24",
    minor: true,
    items: [
      "Guida all'impostazione più pulita: niente passaggi ripetuti, non ti dice più di \"selezionare il ripiano\" dai comandi (la teglia si infila e basta) né di premere tasti di avvio che sul tuo forno non esistono. Se il servizio ha un problema ora te lo dice, invece di darti di nascosto una guida ridotta."
    ]
  },
  {
    v: "8.25",
    d: "2026-06-24",
    items: [
      "Forno AEG corretto con la foto del pannello vero: le funzioni si scelgono per SIMBOLO (sulla manopola non ci sono scritte), il termostato arriva a 275 °C e i tre tasti sotto il display sono meno, orologio e più. Tolta l'indicazione sbagliata delle \"manopole a scomparsa\"."
    ]
  },
  {
    v: "8.24",
    d: "2026-06-24",
    items: [
      "Correzione importante: l'app non ti propone più impostazioni che il tuo apparecchio non può nemmeno fare. Prima, per il risotto, il Companion riceveva \"180 °C\" quando il suo massimo è 150 °C. Ora i limiti veri di ogni apparecchio (temperature, velocità, durate) sono una regola invalicabile."
    ]
  },
  {
    v: "8.23",
    d: "2026-06-24",
    items: [
      "Aggiunto anche il forno AEG Competence B3101-4: livelli e temperature dalle tabelle del manuale (pizza al livello 1, gratin al 3, arrosti al 2), l'avviso che è ventilato (20-40 °C in meno delle ricette classiche) e le sue stranezze (dopo un blackout non scalda finché non reimposti l'ora, manopole a scomparsa, grill a porta chiusa).",
      "Quando i dati di un apparecchio sono meno certi, ora l'app te lo dice apertamente invece di far finta di sapere."
    ]
  },
  {
    v: "8.22",
    d: "2026-06-24",
    items: [
      "Anche il microonde Whirlpool JT 359 è ora \"conosciuto\": i nomi veri dei tasti (MANUAL, WATTS, FOOD, Avvio), le sequenze reali di ogni funzione, i programmi automatici con le classi e i pesi (Crisp, 6° Senso, Aria Ventilata, Jet Defrost) e le regole del piatto Crisp.",
      "La Modalità robot ora usa i dati ufficiali del Moulinex i-Companion Touch XL: nomi esatti degli accessori (ultrablade, miscelatore, sbattitore, lama per impastare), i 14 programmi coi loro valori e i limiti veri (sbattitore max velocità 9, sopra 135° solo col coperchio aperto)."
    ]
  },
  {
    v: "8.21",
    d: "2026-06-24",
    items: [
      "Anche la friggitrice ad aria Moulinex Easy Fry Mega è ora \"conosciuta\" dall'app: temperature, tempi e dosi presi dalle tabelle del manuale ufficiale (patatine 180°, pollo arrosto 200°, gamberetti 190°…), i nomi veri degli 8 programmi e i trucchi da sapere (niente preriscaldamento, se togli il cestello va in pausa, scuoti 2-3 volte)."
    ]
  },
  {
    v: "8.20",
    d: "2026-06-24",
    minor: true,
    items: [
      "Correzione: la friggitrice ad aria non riceve più consigli da forno (ripiani, statico/ventilato) ma quelli giusti per il cestello: temperatura, durata, quanto riempirlo e quando scuoterlo."
    ]
  },
  {
    v: "8.19",
    d: "2026-06-24",
    items: [
      "\"Come lo imposto?\" ora vale anche per microonde e piano cottura, con i parametri giusti per ciascuno: il microonde ragiona in Watt, durata, coprire e mescolare (niente gradi né ripiani), il piano cottura in livelli di potenza e diametro pentola.",
      "Nello strumento c'è il tasto \"Cerca il manuale\": trova le istruzioni ufficiali del tuo modello, così puoi incollarne i punti utili nelle note."
    ]
  },
  {
    v: "8.18",
    d: "2026-06-24",
    minor: true,
    items: [
      "Se cambi forno: basta aggiornare il modello nello strumento (o toccare \"cambia apparecchio\" dalla guida). Se avevi salvato le note del manuale vecchio, l'app ti chiede se cancellarle, così non ti dà più le istruzioni dell'apparecchio precedente."
    ]
  },
  {
    v: "8.17",
    d: "2026-06-24",
    items: [
      "Il tuo forno Samsung Dual Cook è ora \"conosciuto\" dall'app: nomi veri delle funzioni (Convezione, Convenzionale, Grill grande…), la sequenza reale della manopola Selettore, i livelli consigliati da Samsung per ogni piatto (lasagne al 3, torte al 2, pizza al 2…) e i trucchi da sapere (il menu si riordina da solo, il divisorio va al livello 3, il touch non risponde coi guanti). Dati presi dal manuale ufficiale, non inventati."
    ]
  },
  {
    v: "8.16",
    d: "2026-06-24",
    items: [
      "Novità: \"Come lo imposto?\" — nelle ricette da forno, microonde o friggitrice ad aria l'app ti guida a impostare l'apparecchio: funzione di cottura, temperatura, ripiano, preriscaldamento e come capire che è pronto.",
      "Il modello (es. \"Samsung Dual Cook NV7B5740TBS\") si scrive UNA volta sola nello strumento e resta salvato. Nello strumento puoi anche incollare le note del manuale: in quel caso la guida usa i nomi esatti dei comandi del tuo apparecchio."
    ]
  },
  {
    v: "8.15",
    d: "2026-06-24",
    items: [
      "Novità: \"Presto da ricomprare\" — l'app inizia a imparare ogni quanto ricompri gli alimenti e, col tempo, in Dispensa ti segnala quelli che probabilmente stanno per finire (con un tocco li aggiungi alla spesa). Impara da sola con l'uso: all'inizio è vuoto, si riempie mano a mano. Tutto sul telefono."
    ]
  },
  {
    v: "8.14",
    d: "2026-06-24",
    minor: true,
    items: [
      "Ritocco: le ricette senza foto ora hanno una bella copertina colorata (sfumatura calda, diversa per ogni ricetta) con l'icona dello strumento, invece di restare senza intestazione."
    ]
  },
  {
    v: "8.13",
    d: "2026-06-24",
    minor: true,
    items: [
      "Ritocco: le gallerie orizzontali (es. \"Ti potrebbe piacere\" in una ricetta) ora hanno i puntini indicatori e lo scorrimento a scatti, come un carosello."
    ]
  },
  {
    v: "8.12",
    d: "2026-06-24",
    items: [
      "Migliorato: in Modalità cucina, i timer rapidi di un passo ora hanno un nome automatico in base all'azione (es. \"Cottura · 10 min\", \"Riposo · 5 min\", \"Lievitazione · 1h\") — così con più tempi nello stesso passo capisci al volo quale timer è quale."
    ]
  },
  {
    v: "8.11",
    d: "2026-06-24",
    minor: true,
    items: [
      "Ritocco grafico: una grana sottilissima \"da ricettario\" dà calore e materia allo sfondo. Impercettibile, si spegne con \"Risparmio batteria\"."
    ]
  },
  {
    v: "8.10",
    d: "2026-06-24",
    items: [
      "Novità: dal Piano, toccando un giorno, ora c'è \"Aggiungi al calendario\" — mette i pasti nel calendario del telefono (iPhone e Android) con un promemoria 2 ore prima.",
      "Novità: la \"Spesa per mese\" ora mostra anche un grafico a barre dell'andamento negli ultimi 6 mesi, con media e barre rosse quando superi il budget."
    ]
  },
  {
    v: "8.09",
    d: "2026-06-24",
    items: [
      "Migliorato: \"Scansiona lo scontrino\" ora legge il testo direttamente sul telefono (OCR), invece di affidarsi all'AI di visione: più affidabile (legge quello che c'è scritto, senza inventare) e più privato (la foto non lascia il telefono). La prima volta scarica il riconoscitore (serve internet un momento)."
    ]
  },
  {
    v: "8.08",
    d: "2026-06-24",
    minor: true,
    items: [
      "Ritocco: \"Scansiona lo scontrino\" ora pulisce meglio la lista (toglie descrittori come \"integrale/magro\" e i doppioni)."
    ]
  },
  {
    v: "8.07",
    d: "2026-06-24",
    minor: true,
    items: [
      "Novità: in Spesa › Dispensa arriva \"Scansiona lo scontrino\" — fotografi lo scontrino e l'app riconosce la spesa e la mette in dispensa (niente più inserimento a mano)."
    ]
  },
  {
    v: "8.06",
    d: "2026-06-24",
    items: [
      "Nuovo look: in Home le scorciatoie sono ora \"tessere\" in stile bento — una grande \"Cosa cucino stasera?\" e le piccole Voglia, Sfide, Consigliati e Muro. Più ariose e a colpo d'occhio."
    ]
  },
  {
    v: "8.05",
    d: "2026-06-24",
    items: [
      "Novità: nel Piano (vista Settimana) c'è \"Coordina i piatti\" — aggiungi 2-3 ricette e l'app calcola quando iniziare ognuna per servirle tutte in orario.",
      "Ritocco: la spiegazione del badge \"Impatto ambientale\" ora è una finestrella al tocco della ⓘ (badge più pulito)."
    ]
  },
  {
    v: "8.04",
    d: "2026-06-24",
    items: [
      "Novità: filtro \"Consigliati\" in Home — l'app impara dai tuoi gusti (cosa cucini, preferiti, reazioni della famiglia, categorie che ami, stagione) e ti mette davanti le ricette giuste, variando per non riproporre sempre le stesse. Tutto sul telefono, niente dati fuori."
    ]
  },
  {
    v: "8.03",
    d: "2026-06-24",
    items: [
      "Novità: nel dettaglio ricetta un badge \"Impatto ambientale\" (Basso/Medio/Alto) stimato dagli ingredienti, con un consiglio per alleggerirlo quando è alto. È una stima indicativa, non un dato preciso."
    ]
  },
  {
    v: "8.02",
    d: "2026-06-24",
    items: [
      "Novità: \"Svuota il frigo\" in Dispensa — scegli gli alimenti da consumare (quelli in scadenza sono già spuntati) e l'app ti trova le tue ricette che li usano, oppure te ne inventa una con l'AI. Anti-spreco mirato."
    ]
  },
  {
    v: "8.01",
    d: "2026-06-24",
    minor: true,
    items: [
      "Rifinitura: lo sfondo aurora ha ora un lentissimo movimento a vortice, più organico e vivo. Tenue e disattivabile con \"Risparmio batteria\"."
    ]
  },
  {
    v: "8.00",
    d: "2026-06-24",
    items: [
      "Novità: puoi condividere una ricetta a Fornelli da un'altra app! Su Android, dal tasto \"Condividi\" di un browser/Instagram/blog scegli Fornelli e il link arriva pronto: l'app apre il form e prova a importarlo da solo. (Su iPhone Apple non lo permette ancora.)"
    ]
  },
  {
    v: "7.99",
    d: "2026-06-24",
    minor: true,
    items: [
      "Rifinitura: i titoli scalano in modo fluido sugli schermi di ogni dimensione, e nel dettaglio di una ricetta compare una sottile barra di avanzamento lettura in cima mentre scorri."
    ]
  },
  {
    v: "7.98",
    d: "2026-06-24",
    items: [
      "Novità: se installi l'app in Home, ora compare un pallino con il numero sull'icona quando hai alimenti in dispensa o piatti nel congelatore in scadenza (o già scaduti) — un colpo d'occhio senza aprire l'app.",
      "Ritocco: gli avvisi (toast) entrano con un morbido rimbalzo e seguono il tema caldo."
    ]
  },
  {
    v: "7.97",
    d: "2026-06-24",
    minor: true,
    items: [
      "Rifinitura grafica: tema scuro più caldo (toni pane/antracite invece di grigio freddo), riflesso \"vetro liquido\" sui bordi, titoli bilanciati senza parole a capo orfane, e micro-rimbalzo \"a molla\" su card e barra di navigazione."
    ]
  },
  {
    v: "7.96",
    d: "2026-06-24",
    minor: true,
    items: [
      "Rifinitura: in Home le scorciatoie (Che voglia hai?, Sfide, Muro) sono ora su un'unica riga ordinata; le barre e gli anelli animati rispettano meglio \"riduci movimento\"."
    ]
  },
  {
    v: "7.95",
    d: "2026-06-24",
    items: [
      "Novità: \"Porziona e congela\" — da una ricetta crei un'etichetta per il congelatore (piatto, porzioni, data e \"da consumare entro\"). In Spesa › Dispensa trovi il \"Congelatore\" con il conto alla rovescia e l'avviso quando qualcosa sta per scadere; tocchi \"Consumato\" quando lo usi."
    ]
  },
  {
    v: "7.94",
    d: "2026-06-24",
    items: [
      "Novità: \"Risparmio batteria\" in Opzioni › Aspetto — spegne con un tocco tutti gli effetti continui più pesanti (sfondo aurora, atmosfera stagionale, vetro liquido, Cucina viva, vapore). In \"Automatico\" si attiva da solo quando la batteria del telefono è scarica."
    ]
  },
  {
    v: "7.93",
    d: "2026-06-24",
    items: [
      "Novità: \"Reazioni della famiglia\" — nel dettaglio di una ricetta, tu e Federica lasciate una reazione veloce (😍🔥👍😐); la ricetta mostra chi ha reagito e come. Si sincronizza con le ricette."
    ]
  },
  {
    v: "7.92",
    d: "2026-06-24",
    items: [
      "Novità: \"Copertina personale\" — metti una tua foto (un piatto del cuore, un ricordo) in cima alla Home, con il saluto e \"Il ricettario di …\". La scegli da Opzioni › Account."
    ]
  },
  {
    v: "7.91",
    d: "2026-06-24",
    items: [
      "Novità: \"Sfide della settimana\" — 3 mini-obiettivi che cambiano ogni lunedì (di stagione, una ricetta nuova, anti-spreco, e altri) con barra di progresso e coriandoli quando le completi. Le trovi in Home. Diverse dai Traguardi, che restano fissi a vita."
    ]
  },
  {
    v: "7.90",
    d: "2026-06-24",
    items: [
      "Novità: \"Bilancio della settimana\" — nel Piano tocca il riquadro nutrizionale e vedi calorie per giorno (a barre), la ripartizione di proteine/carboidrati/grassi e un giudizio sull'equilibrio, con consiglio. Stima per porzione sui pasti pianificati."
    ]
  },
  {
    v: "7.89",
    d: "2026-06-24",
    items: [
      "Novità: \"Cosa cucino stasera?\" ora è un assistente intelligente — scegli quanto tempo hai e ti propone il piatto giusto combinando cosa hai in dispensa, la stagione e i tuoi gusti, con un'estrazione animata e il tasto \"Rilancia\". (Il pulsante è in Home.)"
    ]
  },
  {
    v: "7.88",
    d: "2026-06-24",
    items: [
      "Novità: le Raccolte ora hanno una bella copertina a collage (fino a 4 foto delle ricette dentro) e si vedono come schede affiancate. Le trovi nel filtro \"Menu/Raccolte\" del Ricettario."
    ]
  },
  {
    v: "7.87",
    d: "2026-06-24",
    items: [
      "Novità: \"Album di cucina\" — una linea del tempo con foto di tutti i piatti che hai cucinato, raggruppata per mese, da sfogliare come un album di ricordi (con voto se l'hai messo). La apri dal Diario di cucina o da \"I tuoi numeri\"."
    ]
  },
  {
    v: "7.86",
    d: "2026-06-24",
    items: [
      "Novità: \"Muro delle ricette\" — una galleria a mosaico di tutte le ricette con foto, da scorrere e toccare per aprire. Compare in Home (sotto \"Che voglia hai?\") quando hai almeno 4 ricette con foto."
    ]
  },
  {
    v: "7.85",
    d: "2026-06-24",
    items: [
      "Novità: \"I tuoi numeri\" — una schermata che celebra la tua cucina con anelli e barre animate: ricette, preferiti, cotture totali, le tue portate, gli ingredienti del cuore e la ricetta più cucinata. C'è anche un titolo (da Apprendista a Leggenda) e coriandoli quando superi un traguardo! La trovi in Opzioni › I tuoi numeri."
    ]
  },
  {
    v: "7.84",
    d: "2026-06-24",
    items: [
      "Effetto wow: nuovo look \"Vetro liquido\" — card e pannelli in vetro smerigliato con un riflesso di luce che scorre mentre navighi. Attivo di default, si può togliere da Opzioni › Aspetto."
    ]
  },
  {
    v: "7.83",
    d: "2026-06-24",
    items: [
      "Novità: micro-suoni soft opzionali — un \"tin\" cristallino del timer, un fruscio quando sfogli i passi in cucina, uno sparkle quando salvi o completi un piatto. Sono spenti di default: li accendi (con tasto \"Prova\") da Opzioni › Aspetto. Generati al volo, nessun file da scaricare."
    ]
  },
  {
    v: "7.82",
    d: "2026-06-24",
    items: [
      "Effetto wow: la Modalità cucina prende vita! Lo sfondo cambia col modo di cottura del passo — bagliore caldo che pulsa per il forno, bollicine e vapore che salgono per il bollito, scintille dorate per la frittura, fiamma soffusa per la padella. (Rispetta \"riduci movimento\".)"
    ]
  },
  {
    v: "7.81",
    d: "2026-06-24",
    items: [
      "Effetto wow: la barra in basso ha un nuovo indicatore \"a goccia\" che scivola tra le voci con un rimbalzo elastico e una morbida deformazione liquida. (Rispetta \"riduci movimento\".)"
    ]
  },
  {
    v: "7.80",
    d: "2026-06-24",
    items: [
      "Effetto wow: lo sfondo segue l'ora del giorno — tenui rosa all'alba, luce di giorno, arancio al tramonto, blu profondo di notte. L'app \"respira\" con la giornata.",
      "Ritocco: unificata l'atmosfera stagionale (prima due effetti si sovrapponevano)."
    ]
  },
  {
    v: "7.79",
    d: "2026-06-24",
    items: [
      "Effetto wow: aprendo una ricetta con foto, l'immagine si \"serve\" con un cerchio che si espande (come un piatto al tavolo) e il titolo compare con l'effetto macchina-da-scrivere. (Rispetta \"riduci movimento\".)"
    ]
  },
  {
    v: "7.78",
    d: "2026-06-24",
    items: [
      "Effetto wow: atmosfera stagionale sullo sfondo — petali a primavera, pulviscolo dorato d'estate, foglie in autunno, neve d'inverno. Cambia da solo con la stagione; si può spegnere in Opzioni › Aspetto. (Rispetta \"riduci movimento\".)"
    ]
  },
  {
    v: "7.77",
    d: "2026-06-24",
    items: [
      "Effetto wow: scorrendo una ricetta, le sezioni (ingredienti, passi, note…) appaiono con una morbida dissolvenza in salita mano a mano che entrano nello schermo. (Rispetta \"riduci movimento\".)"
    ]
  },
  {
    v: "7.76",
    d: "2026-06-24",
    items: [
      "Effetto wow: un filo di vapore sale dalle foto dei piatti (Ricetta del giorno e dettaglio ricetta) — caldo e appetitoso. (Rispetta \"riduci movimento\".)"
    ]
  },
  {
    v: "7.75",
    d: "2026-06-24",
    items: [
      "Effetto wow: la \"Ricetta del giorno\" si inclina seguendo i movimenti del telefono (giroscopio), con un riflesso di luce che scorre — sembra una carta 3D in mano. (Solo su telefono; rispetta \"riduci movimento\".)"
    ]
  },
  {
    v: "7.74",
    d: "2026-06-24",
    items: [
      "Effetto wow: cambiando tema (chiaro/scuro) in Opzioni, il nuovo tema si espande con un'onda circolare. (Rispetta \"riduci movimento\".)"
    ]
  },
  {
    v: "7.73",
    d: "2026-06-24",
    items: [
      "Nuovo: \"Che voglia hai?\" in Home — scegli un'occasione (comfort food, leggero, veloce, per ospiti, per bambini, voglia di dolce) e l'app pesca dalle tue ricette quelle giuste."
    ]
  },
  {
    v: "7.72",
    d: "2026-06-24",
    items: [
      "Nuovo: \"Completa il pasto\" nel dettaglio di una ricetta — propone cosa abbinare (antipasto, primo, contorno, dolce…) scegliendo dal tuo ricettario, con i piatti di stagione e i preferiti in cima. Tocca \"Altre idee\" per nuovi abbinamenti."
    ]
  },
  {
    v: "7.71",
    d: "2026-06-24",
    items: [
      "Nuovo: \"Modalità supermercato\" nella Spesa — lista a tutto schermo, articoli grandi ordinati per reparto come giri tra le corsie, spunti col dito e una barra mostra quanto manca. Tieni lo schermo acceso mentre fai la spesa."
    ]
  },
  {
    v: "7.70",
    d: "2026-06-20",
    items: [
      "Nuova fonte di ricerca: \"Blog GialloZafferano\" — nel Ricettario online scegli la fonte e cerca tra i tanti blog del network di GialloZafferano (es. \"risotto peperoni\"), poi importi la ricetta che preferisci."
    ]
  },
  {
    v: "7.69",
    d: "2026-06-20",
    items: [
      "Puoi importare le ricette dal Blog di GialloZafferano (blog.giallozafferano.it): incolla il link nella ricetta e tocca \"Importa\". Aggiunto anche tra i \"Siti italiani\" da sfogliare; la fonte viene segnata come \"Blog GialloZafferano\"."
    ]
  },
  {
    v: "7.68",
    d: "2026-06-20",
    items: [
      "Tema festa automatico: in modalità \"Automatico\" (Opzioni → Aspetto) si accende da solo nei giorni di festa (Natale, Capodanno, Epifania, Pasqua e Pasquetta, Ferragosto, Halloween) e nel giorno di un Menù delle feste che hai in programma. Puoi sempre scegliere Spento o Sempre acceso."
    ]
  },
  {
    v: "7.67",
    d: "2026-06-20",
    items: [
      "Nuovo: \"Tema festa\" (Opzioni → Aspetto) — attiva coriandoli e palloncini animati di sottofondo per le occasioni speciali. Si può spegnere quando vuoi."
    ]
  },
  {
    v: "7.66",
    d: "2026-06-20",
    minor: true,
    items: [
      "Tocco grafico: le icone fanno un piccolo \"schiaccia\" quando le tocchi e il tasto \"Cosa cucino oggi?\" ammicca ogni tanto per invitarti a usarlo."
    ]
  },
  {
    v: "7.65",
    d: "2026-06-20",
    minor: true,
    items: [
      "Quando salvi una nuova ricetta parte una piccola festa: coriandoli e un \"Ricetta salvata!\" che entra a molla."
    ]
  },
  {
    v: "7.64",
    d: "2026-06-20",
    minor: true,
    items: [
      "Tocco grafico: sfondo \"vivo\" più ricco (sfumature soffuse che si muovono lentamente) e passaggi tra le schermate più morbidi (lieve dissolvenza con risalita)."
    ]
  },
  {
    v: "7.63",
    d: "2026-06-20",
    minor: true,
    items: [
      "Tocco grafico: gli anelli nutrizionali si riempiono con un'animazione e i numeri (calorie, macro, \"Trovate N ricette\") salgono da zero."
    ]
  },
  {
    v: "7.62",
    d: "2026-06-20",
    minor: true,
    items: [
      "Caricamenti più eleganti: al posto delle rotelline, scheletri animati che \"brillano\" (shimmer) mentre l'app prepara i risultati e le funzioni AI."
    ]
  },
  {
    v: "7.61",
    d: "2026-06-20",
    minor: true,
    items: [
      "Tocco grafico: in Modalità cucina i timer hanno un anello che si svuota col conto alla rovescia e vira all'arancione/rosso verso la fine."
    ]
  },
  {
    v: "7.60",
    d: "2026-06-20",
    items: [
      "Cuciniamo in due: nei Menù delle feste puoi assegnare ogni piatto a un cuoco (\"Chi lo prepara\"). Nel Piano di battaglia compare il riepilogo \"Chi fa cosa\" e ogni passo mostra a chi tocca."
    ]
  },
  {
    v: "7.59",
    d: "2026-06-20",
    items: [
      "Nuovo: \"Prepara in anticipo\" nel Piano (vista Settimana) — guarda cosa hai pianificato nei prossimi giorni e ti ricorda cosa fare la sera prima (scongelare la carne/pesce, mettere in ammollo i legumi, tirare fuori burro e uova per i dolci)."
    ]
  },
  {
    v: "7.58",
    d: "2026-06-20",
    items: [
      "Nuovo: \"Fotografa una ricetta\" — fotografi una ricetta da un libro o una rivista e l'AI la compila intera (titolo, ingredienti, passi). Lo trovi nel form della ricetta.",
      "Nuovo: \"Riconosci un piatto da una foto\" — nel Ricettario online scatti la foto di un piatto e l'app capisce cos'è e ne cerca la ricetta."
    ]
  },
  {
    v: "7.57",
    d: "2026-06-20",
    items: [
      "Importa da video: la ricerca online ora filtra sulla fonte del video (es. da un video di Cookist cerca su Cookist, da uno di GialloZafferano su GialloZafferano), così trovi proprio la ricetta dello stesso autore. Se serve, puoi sempre passare a \"Tutte le fonti\"."
    ]
  },
  {
    v: "7.56",
    d: "2026-06-20",
    items: [
      "Importa da video: quando cerchi la ricetta online partendo da un video e poi la importi, ora il link del video viene agganciato in automatico alla ricetta (campo \"Link video\"), così trovi subito \"▶ Guarda il video\"."
    ]
  },
  {
    v: "7.55",
    d: "2026-06-20",
    items: [
      "Risolto: toccando \"Cerca questa ricetta online\" dalla finestra Importa da video, ora la finestra della ricetta si chiude e vedi davvero i risultati della ricerca (prima restava aperta e li copriva)."
    ]
  },
  {
    v: "7.54",
    d: "2026-06-20",
    minor: true,
    items: [
      "Importa da video: il nome del piatto viene ricavato ancora meglio dal titolo (taglia anche al primo emoji e toglie i caratteri invisibili), quindi la ricerca online è più mirata (es. da un video di tempura trova proprio le ricette di tempura)."
    ]
  },
  {
    v: "7.53",
    d: "2026-06-20",
    minor: true,
    items: [
      "Importa da video: la ricerca online ricava meglio il nome del piatto dal titolo del video (toglie sottotitoli ed emoji), così trova risultati più pertinenti."
    ]
  },
  {
    v: "7.52",
    d: "2026-06-20",
    items: [
      "Import da link più potente: se un sito blocca la lettura automatica (es. Fatto in Casa da Benedetta), l'app riprova con un lettore alternativo e riesce comunque a ricavare ingredienti e passi."
    ]
  },
  {
    v: "7.51",
    d: "2026-06-20",
    items: [
      "Importa da video: ora il tasto \"Cerca questa ricetta nel Ricettario online\" è sempre disponibile — incolli il link del video e cerchi subito quel piatto online, senza dover prima tentare l'estrazione."
    ]
  },
  {
    v: "7.50",
    d: "2026-06-20",
    items: [
      "Importa da video: se l'AI non riesce a ricavare la ricetta dal video, ora riconosce comunque titolo e autore e ti propone di cercare quella ricetta nel Ricettario online (es. \"carbonara sbagliata\"), da dove la importi con ingredienti e passi."
    ]
  },
  {
    v: "7.49",
    d: "2026-06-20",
    items: [
      "Ora vedi la fonte delle ricette importate (GialloZafferano, Misya, Cookist, Moulinex, Bimby…): un'etichetta \"Fonte\" nel dettaglio della ricetta e accanto al titolo negli elenchi.",
      "Vale anche per le ricette già salvate: la fonte si ricava dal link, senza doverle reimportare."
    ]
  },
  {
    v: "7.48",
    d: "2026-06-20",
    items: [
      "Se la pagina di una ricetta contiene un video, ora viene salvato il link: nella ricetta trovi \"▶ Guarda il video\" e lo guardi dentro l'app.",
      "Puoi anche incollare a mano un link video (YouTube, TikTok, Vimeo) nella ricetta (campo \"Link video\")."
    ]
  },
  {
    v: "7.47",
    d: "2026-06-20",
    items: [
      "Controllo \"sicuro per tutti\" più preciso: oltre alle parole chiave, ora usa anche il reparto degli ingredienti (riconosce carne/pesce/latticini anche con nomi insoliti, es. macinato, würstel).",
      "Nuovo: \"Migliora il riconoscimento\" (in Invitati e diete) — se un ingrediente non viene riconosciuto puoi aggiungerlo tu alla categoria giusta (carne, pesce, latticini, glutine…) e l'app lo userà nei controlli."
    ]
  },
  {
    v: "7.46",
    d: "2026-06-20",
    items: [
      "Menù delle feste: aggiungi gli invitati con le loro allergie, intolleranze, diete (vegetariano/vegano) e cibi non graditi (👥 Invitati e diete).",
      "Ogni piatto del menù mostra un'etichetta: ✓ \"per tutti\", \"ok tranne…\" (un cibo non gradito) oppure ⚠️ se non va bene per qualcuno.",
      "\"Completa il menù\": ti propone, portata per portata, ricette del tuo ricettario di stagione e sicure per tutti gli invitati; se non bastano, chiede un'idea nuova all'AI (sempre da controllare).",
      "I suggerimenti tengono conto del mese della festa per la stagionalità."
    ]
  },
  {
    v: "7.45",
    d: "2026-06-20",
    items: [
      "I Menù delle feste ora compaiono anche nel Piano: un 🎉 sul giorno nel calendario e l'elenco \"Prossime feste\" toccabile.",
      "Con la Casa condivisa, i menù delle feste sono condivisi in tempo reale tra i due telefoni (come la lista della spesa): potete organizzarli in due."
    ]
  },
  {
    v: "7.44",
    d: "2026-06-20",
    items: [
      "Nuovo: \"Menù delle feste\" (in Strumenti → filtro \"Menu e feste\") — organizza un grande pranzo (Natale, Pasqua…) con i piatti per portata, i piatti portati dagli ospiti (solo da scaldare) e i tempi.",
      "Piano di battaglia: spesa, preparazioni anticipate giorno per giorno (es. il tiramisù il giorno prima) e la timeline del giorno della festa, con avviso quando due piatti vogliono il forno insieme.",
      "Imposti l'ora \"in tavola\" e il numero di ospiti (la lista della spesa moltiplica le dosi), ricevi i promemoria al momento giusto e generi un messaggio pronto per chi porta un piatto.",
      "I menù si salvano: l'anno dopo li riapri o li duplichi senza rifare tutto."
    ]
  },
  {
    v: "7.43",
    d: "2026-06-20",
    minor: true,
    items: [
      "App più veloce ad aprirsi, soprattutto su rete mobile: ora i file vengono serviti dalla memoria del telefono invece di riscaricarli ogni volta (gli aggiornamenti continuano ad arrivare da soli)."
    ]
  },
  {
    v: "7.42",
    d: "2026-06-20",
    items: [
      "Nuovo: \"Tutto pronto alle…\" — dici a che ora vuoi servire e l'app calcola a ritroso quando iniziare ogni piatto perché arrivino caldi in tavola insieme. Lo trovi nel dettaglio di una ricetta (\"Quando inizio?\") e nel Piano, toccando un giorno (\"A che ora inizio?\")."
    ]
  },
  {
    v: "7.41",
    d: "2026-06-20",
    items: [
      "\"Svuota la dispensa\" (in Dispensa, \"Cosa posso cucinare\"): le ricette più vicine ad essere pronte in cima, con scritto cosa ti manca (\"ti mancano solo 2 cose\") e un tasto per aggiungere alla spesa ciò che serve.",
      "Avanzi: nella stessa schermata puoi cercare le tue ricette che usano un avanzo (es. \"pollo cotto\")."
    ]
  },
  {
    v: "7.40",
    d: "2026-06-20",
    items: [
      "Finita una ricetta in Modalità cucina ora compare una schermata \"Piatto pronto!\" con coriandoli, e da lì puoi subito dare il voto e aggiungere la foto."
    ]
  },
  {
    v: "7.39",
    d: "2026-06-20",
    minor: true,
    items: [
      "Rimossa dalle Impostazioni la dicitura \"Ricette online da TheMealDB\" (riferimento alle primissime versioni, ora superato)."
    ]
  },
  {
    v: "7.38",
    d: "2026-06-20",
    items: [
      "Impostazioni riorganizzate: le voci sono ora raggruppate per argomento con un'intestazione (Account, Aspetto, Preferenze di cucina, Schermata Home, Promemoria, Strumenti, Dati e backup, Informazioni), così trovi tutto più in fretta."
    ]
  },
  {
    v: "7.37",
    d: "2026-06-20",
    minor: true,
    items: [
      "Corrette le date nello storico Novità: dalla v7.19 in poi era rimasta per errore sempre la stessa data."
    ]
  },
  {
    v: "7.36",
    d: "2026-06-20",
    minor: true,
    items: [
      "Ingredienti di stagione: tornano a cercare prima tra le tue ricette salvate; da lì puoi estendere la ricerca al Ricettario online."
    ]
  },
  {
    v: "7.35",
    d: "2026-06-20",
    items: [
      "Risolto: la ricerca avviata toccando un ingrediente di stagione non resta più bloccata sui rettangoli grigi.",
      "Sotto i risultati del Ricettario online ora vedi il tempo impiegato dalla ricerca (es. \"· 1,2 s\")."
    ]
  },
  {
    v: "7.34",
    d: "2026-06-20",
    minor: true,
    items: [
      "Tocchi un ingrediente di stagione e vai dritto al Ricettario con la ricerca già avviata (un solo tocco)."
    ]
  },
  {
    v: "7.33",
    d: "2026-06-20",
    items: [
      "Nuovo: \"Mostrami passo-passo\" — per alcune funzioni (Casa condivisa, Menù della settimana, Fotografa il frigo) l'app ti accompagna aprendo le pagine ed evidenziando cosa toccare. Lo trovi nell'assistente (❓)."
    ]
  },
  {
    v: "7.32",
    d: "2026-06-20",
    items: [
      "Piccoli consigli \"Lo sapevi?\" in Home (uno per volta, ognuno una sola volta) per scoprire le funzioni; un puntino sul ❓ invita a provare l'assistente."
    ]
  },
  {
    v: "7.31",
    d: "2026-06-20",
    items: [
      "Nuovo: \"Chiedi a Fornelli\" (tocca il ? in alto) — scrivi cosa vuoi fare (\"come condivido la spesa?\") e l'app ti risponde e ti apre la pagina giusta."
    ]
  },
  {
    v: "7.30",
    d: "2026-06-20",
    items: [
      "Ricettario online: scrivi il nome di una fonte o del tuo robot nella ricerca (es. \"pollo bimby\", \"costolette moulinex\") e cerca solo lì."
    ]
  },
  {
    v: "7.29",
    d: "2026-06-20",
    items: [
      "Tocchi un ingrediente di stagione e apri il Ricettario: ora la ricerca online parte da sola.",
      "Ricerca tra le tue ricette: puoi aggiungere lo strumento (es. \"costolette friggitrice\") e trova solo quelle di quello strumento."
    ]
  },
  {
    v: "7.28",
    d: "2026-06-20",
    items: [
      "Casa condivisa: ora arriva una NOTIFICA anche ad app chiusa quando l'altra persona aggiunge qualcosa alla lista (servono le notifiche attive su entrambi i telefoni).",
      "Casella di ricerca più grande ed evidente anche nella schermata principale.",
      "Risolto: le schermate di benvenuto e Novità non si perdono più dietro l'animazione d'avvio."
    ]
  },
  {
    v: "7.27",
    d: "2026-06-20",
    items: [
      "Casa condivisa: avviso in tempo reale quando l'altra persona aggiunge qualcosa alla lista (\"👥 … ha aggiunto: latte\").",
      "Ottimizzazioni: scorrimento più fluido sui telefoni di fascia media (effetti alleggeriti)."
    ]
  },
  {
    v: "7.26",
    d: "2026-06-20",
    items: [
      "Nuovo: in Modalità cucina, col microfono attivo puoi fare DOMANDE a voce (\"posso sostituire il burro?\", \"quanto cuocio?\") e lo chef AI risponde a voce — mani libere. Oltre ai comandi avanti/indietro/timer."
    ]
  },
  {
    v: "7.25",
    d: "2026-06-20",
    items: [
      "Nuovo: Casa condivisa — tu e un'altra persona potete avere la STESSA lista della spesa, aggiornata in tempo reale tra i telefoni (Opzioni → Casa condivisa). Serve l'accesso cloud."
    ]
  },
  {
    v: "7.24",
    d: "2026-06-20",
    minor: true,
    items: [
      "Effetto wow: aprendo una ricetta con foto, l'immagine si \"espande\" fluidamente dalla card al dettaglio (come le app native)."
    ]
  },
  {
    v: "7.23",
    d: "2026-06-20",
    items: [
      "Nuovo in Home: \"Suggeriti per te\" — proposte personalizzate in base alle tue abitudini (giorno della settimana, piatti più cucinati, preferiti) e a cosa sta per scadere. Attivabile in Opzioni → Sezioni della Home."
    ]
  },
  {
    v: "7.22",
    d: "2026-06-20",
    items: [
      "Nuovo: \"Adatta la ricetta\" — un tocco e l'AI la riscrive in versione vegana, vegetariana, senza glutine, senza lattosio o più leggera. La salvi come nuova ricetta."
    ]
  },
  {
    v: "7.21",
    d: "2026-06-20",
    items: [
      "Nuovo: \"Adatta alla teglia/stampo\" in una ricetta — hai una teglia diversa? Ricalcola le dosi in base alla superficie (rotonda o rettangolare)."
    ]
  },
  {
    v: "7.20",
    d: "2026-06-20",
    minor: true,
    items: [
      "Tocchi grafici: bordo luminoso animato sulla Ricetta del giorno, foto che entrano in dissolvenza, finestre con apertura elastica e tasti più reattivi."
    ]
  },
  {
    v: "7.19",
    d: "2026-06-20",
    items: [
      "Ricerca nel Ricettario: con \"Tutte le fonti\" ora vedi TUTTI i risultati (paginati), non solo un assaggio.",
      "Riepilogo: quante ricette trovate per ogni fonte.",
      "Cambiando fonte il testo cercato resta e la ricerca si rifà da sola.",
      "Casella di ricerca più grande ed evidente, spostata in alto."
    ]
  },
  {
    v: "7.18",
    d: "2026-06-16",
    minor: true,
    items: [
      "Timer: l'indicatore fluttuante non copre più il tasto Avvia quando il pannello è aperto; caselle più alte e comode."
    ]
  },
  {
    v: "7.17",
    d: "2026-06-16",
    items: [
      "Nuovo: \"Fotografa il frigo\" (in Dispensa) — l'AI riconosce gli alimenti dalla foto e li aggiungi o cerchi ricette.",
      "Nuovo: \"Menù AI\" nel Piano (vista Settimana) — propone le cene della settimana dalle tue ricette, con anteprima e rigenera.",
      "Scorciatoie rapide: tieni premuta l'icona di Fornelli per Nuova ricetta, Cosa cucino oggi, Timer."
    ]
  },
  {
    v: "7.16",
    d: "2026-06-16",
    minor: true,
    items: [
      "Nello strumento Timer le due caselle ora indicano chiaramente \"min\" e \"sec\"."
    ]
  },
  {
    v: "7.15",
    d: "2026-06-16",
    items: [
      "Nuovo: \"Modalità robot\" — converte la ricetta nei comandi del tuo Moulinex Companion o Bimby (accessorio, velocità, temperatura, tempo) da impostare a mano.",
      "I valori sono un aiuto generato dall'AI: controllali sul tuo robot. L'app non comanda il robot."
    ]
  },
  {
    v: "7.14",
    d: "2026-06-16",
    items: [
      "Nuovo: guarda il video della ricetta dentro l'app (YouTube/TikTok), quando il link è un video.",
      "Nuovo strumento Timer: avvia più timer con nome anche fuori dalla Modalità cucina (Opzioni → Timer da cucina); restano attivi mentre usi l'app."
    ]
  },
  {
    v: "7.13",
    d: "2026-06-16",
    items: [
      "In Modalità cucina tocca un ingrediente dentro il passo per vedere la quantità, senza tornare indietro.",
      "I timer rapidi dei passi ora si chiamano da soli (Forno, Cottura, Lievitazione…).",
      "Tocco grafico più moderno: leggero effetto vetro su finestre e card, piccole vibrazioni al tocco."
    ]
  },
  {
    v: "7.12",
    d: "2026-06-16",
    items: [
      "Nuovo: importa una ricetta da un video social (TikTok/Instagram/YouTube) — incolla il link e l'AI ne ricava ingredienti e passi.",
      "Nuovo: \"Inventa una ricetta\" dagli ingredienti che hai (nel form ricetta).",
      "Nuovo: \"Chiedi allo chef\" — un aiuto AI per sostituzioni, tempi e dubbi mentre cucini.",
      "Tutto gratis tramite l'AI di Cloudflare; è un aiuto, non infallibile."
    ]
  },
  {
    v: "7.11",
    d: "2026-06-15",
    items: [
      "Nuovo: \"Com'è venuto?\" — scatta una foto del piatto e l'app ti dà un parere a colpo d'occhio su cottura, colore e consistenza.",
      "È un aiuto, non un giudice: non valuta sale, sapore o cottura interna. Funziona quando il controllo è attivo."
    ]
  },
  {
    v: "7.10",
    d: "2026-06-14",
    items: [
      "Gli ingredienti \"Di stagione\" in Home ora sono toccabili: cerca al volo le tue ricette con quell'ingrediente.",
      "Dai risultati di ricerca puoi estendere la ricerca al ricettario online con un tocco."
    ]
  },
  {
    v: "7.9",
    d: "2026-06-14",
    items: [
      "Budget di spesa mensile: imposta un tetto e vedi la barra di avanzamento nella lista.",
      "Scorte di base in dispensa: segna gli alimenti sempre in casa con la ⭐; quando finiscono tornano nella spesa.",
      "Aggiungi alla spesa incollando una lista (un articolo per riga o separati da virgola).",
      "Ordina la lista della spesa a mano con le frecce su/giù."
    ]
  },
  {
    v: "7.8",
    d: "2026-06-14",
    items: [
      "Preferenze alimentari (vegetariano, senza glutine, senza lattosio): in Home appare il filtro \"Per me\".",
      "Porzioni predefinite: apri le ricette già regolate sul numero di persone che scegli.",
      "Modalità alto contrasto per leggere meglio (Opzioni → Alto contrasto).",
      "Home personalizzabile: scegli quali sezioni mostrare nella schermata iniziale."
    ]
  },
  {
    v: "7.7",
    d: "2026-06-14",
    items: [
      "Spunta gli ingredienti toccandoli mentre cucini.",
      "Allarme timer più evidente in Modalità cucina: suona e vibra finché non lo fermi.",
      "Nel Piano puoi aggiungere anche colazione e spuntino (oltre a pranzo e cena).",
      "Converti al volo le misure estere in una ricetta (cup/oz/°F)."
    ]
  },
  {
    v: "7.6",
    d: "2026-06-14",
    minor: true,
    items: [
      "Corretto il tasto \"Cerca\" che su alcuni telefoni finiva fuori dallo schermo dopo l'aggiunta del microfono."
    ]
  },
  {
    v: "7.5",
    d: "2026-06-14",
    minor: true,
    items: [
      "Schermata di benvenuto al primo avvio: quando non hai ancora strumenti, l'app ti guida a crearne uno (o a usare quelli predefiniti) e non sembra più vuota."
    ]
  },
  {
    v: "7.4",
    d: "2026-06-13",
    items: [
      "Esporta in PDF un'intera raccolta di ricette in un colpo solo.",
      "Condividi una ricetta come link: chi ha Fornelli lo apre e se la ritrova pronta da salvare.",
      "In Dispensa puoi indicare le quantità che hai (es. 2 kg di farina)."
    ]
  },
  {
    v: "7.3",
    d: "2026-06-13",
    items: [
      "Su tablet e schermi larghi le ricette si dispongono su due colonne.",
      "Aprendo una ricetta lo schermo resta acceso mentre cucini (non solo in Modalità cucina).",
      "Comandi vocali in più in Modalità cucina: \"ripeti ingredienti\" e \"quanto manca\"."
    ]
  },
  {
    v: "7.2",
    d: "2026-06-13",
    items: [
      "Categoria automatica: importando una ricetta l'app le assegna da sola un tag (Primi/Secondi/Dolci…) dal titolo.",
      "Ricerca vocale anche nel Ricettario online (tocca il microfono).",
      "Dimensione del testo regolabile in Opzioni (piccolo/normale/grande).",
      "Promemoria per fare un backup delle ricette (in modalità solo-telefono)."
    ]
  },
  {
    v: "7.1",
    d: "2026-06-13",
    items: [
      "Icone dedicate per i robot da cucina: una per il Moulinex Companion e una per il Bimby, da scegliere per i tuoi strumenti."
    ]
  },
  {
    v: "7.0",
    d: "2026-06-13",
    items: [
      "Nuova icona \"robot da cucina\" per gli strumenti (perfetta per Bimby, Moulinex Companion e simili), più l'emoji 🤖."
    ]
  },
  {
    v: "6.9",
    d: "2026-06-13",
    items: [
      "Molte più icone per gli strumenti: oltre a quelle disegnate ora puoi scegliere tra tante emoji (piatti, ingredienti, bevande…)."
    ]
  },
  {
    v: "6.8",
    d: "2026-06-13",
    items: [
      "Valori nutrizionali con anelli colorati (calorie e macro a colpo d'occhio).",
      "Le ricette con foto appaiono come card grandi con il titolo in sovrimpressione.",
      "Illustrazioni anche nelle altre schermate vuote (spesa, dispensa, preferiti)."
    ]
  },
  {
    v: "6.7",
    d: "2026-06-13",
    items: [
      "Sfondo più caldo, con sfumature nel colore d'accento scelto.",
      "Decorazioni stagionali discrete (neve a Natale, petali in primavera, foglie in autunno).",
      "Difficoltà mostrata a pallini e tempo con l'orologio nelle liste.",
      "Passaggio più morbido tra le schede e vapore animato durante i caricamenti."
    ]
  },
  {
    v: "6.6",
    d: "2026-06-13",
    items: [
      "Nel tuo ricettario puoi combinare ricerca e categoria: scrivi \"peperoni\" e tocca una categoria (es. Primi) per trovarli solo lì."
    ]
  },
  {
    v: "6.5",
    d: "2026-06-13",
    items: [
      "Spesa del mese: nella lista della spesa vedi quanto hai speso (stima) toccando \"Spesa fatta\", con lo storico per mese.",
      "Diario di cucina con grafico: quante volte hai cucinato negli ultimi 6 mesi.",
      "Svuota frigo: nel Ricettario online cerca ricette dagli ingredienti che hai (al meglio con Moulinex)."
    ]
  },
  {
    v: "6.4",
    d: "2026-06-13",
    items: [
      "Lista \"Da provare\": dal Ricettario online tocca il segnalibro 🔖 per salvare una ricetta e importarla quando vuoi.",
      "Raccolte: organizza le ricette in collezioni a tema (es. \"Feste\") dal tasto \"Aggiungi a una raccolta\".",
      "Riordina gli strumenti nella schermata principale (tasto \"Riordina strumenti\").",
      "\"Com'è venuta?\": dopo aver cucinato lascia voto, foto e una nota nella ricetta.",
      "Promemoria di preparazione: per le ricette con ammollo/lievitazione un avviso per iniziare in anticipo."
    ]
  },
  {
    v: "6.3",
    d: "2026-06-13",
    items: [
      "Invia la lista della spesa su WhatsApp o messaggi (tasto \"Invia lista\").",
      "Scala su una quantità precisa: in una ricetta tocca \"Ho una quantità precisa…\" e ricalcola le dosi su quanto hai (es. 600 g di pollo).",
      "In home \"Non lo cucini da un po'\": ti ripropone i preferiti che non cucini da oltre un mese."
    ]
  },
  {
    v: "6.2",
    d: "2026-06-13",
    items: [
      "Bimby ora cerca tra le ricette ufficiali Cookidoo (per parola, con foto e a pagine): l'import porta titolo e ingredienti; i passaggi guidati si seguono nell'app Cookidoo col tuo abbonamento."
    ]
  },
  {
    v: "6.1",
    d: "2026-06-13",
    items: [
      "Fonte Bimby ora corretta: si sfoglia il ricettario (le più popolari) a pagine, con foto e import. La ricerca per parola non è disponibile per questa fonte (il sito la fa solo nella sua app)."
    ]
  },
  {
    v: "6.0",
    d: "2026-06-13",
    items: [
      "\"Tutte le fonti\" ora include anche Moulinex e Bimby, ed è chiaro che mostra un assaggio per fonte: per l'elenco completo scegli la singola fonte (es. Moulinex per tutte le sue ricette)."
    ]
  },
  {
    v: "5.9",
    d: "2026-06-13",
    minor: true,
    items: [
      "Finestra Novità: ora compare solo quando sei davvero nell'app, mai durante il lampo della schermata di accesso all'avvio."
    ]
  },
  {
    v: "5.8",
    d: "2026-06-13",
    items: [
      "Le ricette Moulinex ora mostrano la foto anche nell'elenco dei risultati.",
      "Risultati a pagine: la barra di ricerca resta in alto e sfogli 12 ricette per volta con Prec./Succ.",
      "Nuova fonte: Ricettario Bimby — cerca e importa le ricette del Bimby (con foto)."
    ]
  },
  {
    v: "5.7",
    d: "2026-06-13",
    minor: true,
    items: [
      "Nel Ricettario online ora vedi quante ricette sono state trovate (e, per Moulinex, il totale anche oltre quelle mostrate)."
    ]
  },
  {
    v: "5.6",
    d: "2026-06-13",
    items: [
      "Ricettario Moulinex: ora puoi cercare tra oltre 4800 ricette (scrivi un piatto, es. \"pollo\"), non solo la selezione iniziale. Importi quella che vuoi con foto e passaggi."
    ]
  },
  {
    v: "5.5",
    d: "2026-06-13",
    minor: true,
    items: [
      "Le foto di Misya ora passano dal nostro servizio e si vedono sempre, anche dove il sito le bloccava."
    ]
  },
  {
    v: "5.4",
    d: "2026-06-13",
    minor: true,
    items: [
      "Le foto dei risultati Misya ora si vedono anche sul telefono (sistemato un blocco del referer); se un'immagine non carica compare un segnaposto pulito."
    ]
  },
  {
    v: "5.3",
    d: "2026-06-13",
    items: [
      "Condividi il menù della settimana come bella immagine (dal Piano), da inviare su WhatsApp."
    ]
  },
  {
    v: "5.2",
    d: "2026-06-13",
    items: [
      "Nutrizione della settimana: nel Piano vedi la stima di calorie e macro dei 7 giorni, con media giornaliera.",
      "Cerca con più ingredienti: scrivi \"zucchine, pollo\" e trovi le ricette che li contengono tutti.",
      "Lista della spesa raggruppabile per ricetta: sai cosa serve per ogni piatto (tasto \"Per ricetta\").",
      "Idee per il contorno nel dettaglio di una ricetta.",
      "Tema festività: l'app fa gli auguri nei periodi speciali (Natale, Pasqua, Halloween…)."
    ]
  },
  {
    v: "5.1",
    d: "2026-06-13",
    items: [
      "Modalità chef: in una ricetta tocca \"Leggi la ricetta\" e l'app legge a voce ingredienti e passaggi, a mani libere.",
      "Esporta una singola ricetta in PDF (scheda da stampare o conservare).",
      "Sorprendimi col Companion: un tocco e importi una ricetta a caso del robot Moulinex.",
      "L'avviso scadenze in home ora segue i giorni di anticipo scelti in Opzioni.",
      "Schermate vuote del Ricettario con una nuova illustrazione."
    ]
  },
  {
    v: "5.0",
    d: "2026-06-13",
    items: [
      "Ricettario Moulinex Companion: nel Ricettario online scegli la fonte \"Moulinex Companion\" per sfogliare le ricette del robot da cucina e importarle (con foto, ingredienti e passaggi)."
    ]
  },
  {
    v: "4.9",
    d: "2026-06-13",
    items: [
      "Foto della ricetta più elegante: la sfumatura sotto il titolo prende il colore dominante del piatto.",
      "Schermate vuote più curate, con un'illustrazione colorata che segue il tema scelto."
    ]
  },
  {
    v: "4.8",
    d: "2026-06-13",
    items: [
      "Nuova fonte italiana nel Ricettario: Ricette della Nonna (con foto del piatto).",
      "Import da link più potente: ora legge gli ingredienti e i passaggi anche da pagine senza dati strutturati."
    ]
  },
  {
    v: "4.7",
    d: "2026-06-13",
    items: [
      "Menù settimana più intelligente: dà priorità alle ricette che usano gli alimenti in scadenza (anti-spreco) e varia strumento e categoria di giorno in giorno.",
      "Note vocali: registra un promemoria a voce su una ricetta (max 30s, salvato sul telefono).",
      "Misure estere convertite in automatico: importando ricette in inglese, cups/once/°F diventano grammi, ml e °C."
    ]
  },
  {
    v: "4.6",
    d: "2026-06-13",
    items: [
      "Ingredienti di stagione: in home vedi i prodotti del mese e un filtro \"Di stagione\"; nelle ricette un badge segnala gli ingredienti di stagione.",
      "Ricette simili: in fondo a una ricetta, \"Ti potrebbe piacere\" con piatti affini del tuo ricettario.",
      "Modalità cucina con testo grande: tocca \"Aa\" per leggere i passi da lontano.",
      "Tira verso il basso nel Ricettario online per aggiornare i risultati."
    ]
  },
  {
    v: "4.5",
    d: "2026-06-13",
    minor: true,
    items: [
      "La finestra delle Novità ora appare dopo l'accesso (prima sul cellulare lampeggiava tra avvio e login e spariva subito)."
    ]
  },
  {
    v: "4.4",
    d: "2026-06-13",
    items: [
      "Nuova fonte attiva nel Ricettario: Edamam, un grande database di ricette (in inglese, tradotte)."
    ]
  },
  {
    v: "4.3",
    d: "2026-06-13",
    items: [
      "Nuova fonte italiana nel Ricettario: Cookist (con foto del piatto).",
      "Modalità ospiti: nel dettaglio di una ricetta scegli per quante persone cucini, le dosi si adattano e puoi aggiungere la spesa già moltiplicata.",
      "Predisposta la fonte Edamam (grande database in inglese): si attiva con una chiave gratuita."
    ]
  },
  {
    v: "4.2",
    d: "2026-06-13",
    items: [
      "Costo stimato del carrello nella Lista della spesa: vedi quanto spenderai (stima indicativa).",
      "Codice QR della ricetta: aprila o leggila al volo da un altro telefono.",
      "Tocchi più vivi: vibrazione leggera, onde sui pulsanti, passi della cucina in dolce transizione e sfondo aurora animato."
    ]
  },
  {
    v: "4.1",
    d: "2026-06-04",
    minor: true,
    items: [
      "Anche i risultati di Misya mostrano la foto del piatto."
    ]
  },
  {
    v: "4.0",
    d: "2026-06-04",
    minor: true,
    items: [
      "I risultati di GialloZafferano ora mostrano anche la foto del piatto."
    ]
  },
  {
    v: "3.9",
    d: "2026-06-04",
    items: [
      "Cerca su tutte le fonti insieme: ogni risultato mostra da dove arriva (GialloZafferano, Misya, TheMealDB, Spoonacular).",
      "Nuova fonte italiana: Misya. E i risultati entrano con una bella animazione."
    ]
  },
  {
    v: "3.8",
    d: "2026-06-04",
    items: [
      "Traguardi di cucina: sblocca badge mentre usi l'app (nel Diario di cucina).",
      "Calendario del diario: vedi i giorni in cui hai cucinato e cosa.",
      "Scansiona il codice a barre di un prodotto per aggiungerlo in dispensa.",
      "Abbinamento vino consigliato nel dettaglio di una ricetta."
    ]
  },
  {
    v: "3.7",
    d: "2026-06-04",
    minor: true,
    items: [
      "Salvando una ricetta da Spoonacular ora vengono recuperati anche i passaggi di preparazione."
    ]
  },
  {
    v: "3.6",
    d: "2026-06-04",
    items: [
      "Nuova fonte nel Ricettario: Spoonacular, un database enorme di ricette (in inglese, tradotte)."
    ]
  },
  {
    v: "3.5",
    d: "2026-06-04",
    minor: true,
    items: [
      "I tag presi dall'import sono ora più puliti (niente parole generiche dei siti)."
    ]
  },
  {
    v: "3.4",
    d: "2026-06-04",
    items: [
      "Nel Ricettario puoi scegliere la fonte: cerca direttamente su GialloZafferano (in italiano) oltre a TheMealDB.",
      "Più siti italiani tra cui sfogliare, e l'import porta anche le categorie come tag."
    ]
  },
  {
    v: "3.3",
    d: "2026-06-04",
    items: [
      "Ricettario online finalmente in italiano: cerca \"pollo\", \"torta\", \"zuppa\" e i titoli dei risultati appaiono tradotti."
    ]
  },
  {
    v: "3.2",
    d: "2026-06-04",
    minor: true,
    items: [
      "Il tasto Indietro del telefono ora torna alla schermata precedente invece di chiudere l'app."
    ]
  },
  {
    v: "3.1",
    d: "2026-06-04",
    minor: true,
    items: [
      "Tocchi grafici: barra di navigazione animata, card in 3D al tocco, spunta animata nella spesa e foto della ricetta con effetto parallax."
    ]
  },
  {
    v: "3.0",
    d: "2026-06-04",
    items: [
      "Ricetta del giorno in home, con saluto che cambia (Buongiorno/Buonasera).",
      "Difficoltà delle ricette (facile/media/difficile) con filtro dedicato.",
      "Diario: lo storico di cosa hai cucinato, con le date, nel Diario di cucina.",
      "Foto della ricetta più elegante, con il titolo in sovrimpressione."
    ]
  },
  {
    v: "2.9",
    d: "2026-06-04",
    minor: true,
    items: [
      "In Opzioni puoi cambiare email, password e nickname.",
      "Password dimenticata? Dalla schermata di accesso puoi reimpostarla via email."
    ]
  },
  {
    v: "2.8",
    d: "2026-06-04",
    minor: true,
    items: [
      "Ora l'app ti saluta per nome: scegli un nickname alla registrazione (o al primo accesso)."
    ]
  },
  {
    v: "2.7",
    d: "2026-06-04",
    minor: true,
    items: [
      "Le novità distinguono ora le nuove funzioni dalle semplici correzioni.",
      "Statistiche accessi (admin): mostrati anche gli accessi precedenti non datati."
    ]
  },
  {
    v: "2.6",
    d: "2026-06-04",
    items: [
      "Statistiche accessi (admin) più complete: per giorno, settimana e mese, con riepilogo e ordinamento per utente."
    ]
  },
  {
    v: "2.5",
    d: "2026-06-04",
    minor: true,
    items: [
      "La finestra delle Novità ora appare dopo l'animazione di avvio (prima a volte spariva subito)."
    ]
  },
  {
    v: "2.4",
    d: "2026-06-04",
    items: [
      "Sostituzioni ingredienti: nelle ricette trovi alternative pronte (niente burro? usa olio…).",
      "Costo stimato della ricetta, totale e a porzione (prezzi indicativi).",
      "Lista della spesa ordinabile per reparto, nell'ordine in cui giri al supermercato."
    ]
  },
  {
    v: "2.3",
    d: "2026-06-04",
    items: [
      "Convertitore in cucina (Opzioni): tazze, cucchiai, grammi, °C/°F e pesi degli ingredienti.",
      "Allergeni sulle ricette (glutine, lattosio, uova…) con badge e filtri 'Senza glutine' / 'Senza lattosio'.",
      "\"Menù settimana\": riempie le cene pescando dai preferiti senza ripetere e prepara la spesa."
    ]
  },
  {
    v: "2.2",
    d: "2026-06-04",
    items: [
      "Comandi vocali a mani libere in Modalità cucina: di' \"avanti\", \"indietro\", \"timer 10 minuti\".",
      "\"Usa prima che scada\": in home, ricette che usano gli alimenti in scadenza (anti-spreco).",
      "\"Le mie creazioni\": aggiungi le foto dei tuoi piatti a ogni ricetta.",
      "Esporta tutto il ricettario in PDF (da Opzioni) per stamparlo o conservarlo."
    ]
  },
  {
    v: "2.1",
    d: "2026-06-04",
    items: [
      "Diario di cucina: statistiche su piatti più cucinati, ingredienti e strumenti top (in Opzioni).",
      "In Modalità cucina, i tempi citati nei passi (es. \"10 minuti\") diventano timer da avviare al volo.",
      "Aprendo una ricetta, gli ingredienti che non hai in dispensa sono segnati \"manca\", con tasto per aggiungere solo i mancanti alla spesa.",
      "Puoi scegliere il colore dell'app (arancione, rosso, verde, blu, viola, rosa) in Opzioni."
    ]
  },
  {
    v: "2.0",
    d: "2026-06-04",
    items: [
      "\"Cosa cucino oggi?\": un tocco e l'app pesca una ricetta a caso tra le tue.",
      "Condividi una ricetta come bella immagine (cartolina) da inviare su WhatsApp.",
      "Ricerca vocale: tocca il microfono e detta cosa cercare.",
      "Riepilogo nutrizionale del giorno nel Piano (calorie e macro dei pasti)."
    ]
  },
  {
    v: "1.9",
    d: "2026-06-04",
    items: [
      "Nuova finestra \"Novità\" a ogni aggiornamento, con lo storico delle modifiche consultabile in Opzioni."
    ]
  },
  {
    v: "1.8",
    d: "2026-06-04",
    items: [
      "Le ricette salvate dal Ricettario online ora arrivano con la foto."
    ]
  },
  {
    v: "1.7",
    d: "2026-06-04",
    items: [
      "Traduzione automatica in italiano delle ricette online (che sono in inglese), al momento del salvataggio."
    ]
  },
  {
    v: "1.6",
    d: "2026-06-04",
    minor: true,
    items: [
      "L'app ora si aggiorna da sola: vedi sempre l'ultima versione senza fare nulla."
    ]
  },
  {
    v: "1.4",
    d: "2026-06-04",
    minor: true,
    items: [
      "Risolta la ricerca online del Ricettario che restava a caricare all'infinito."
    ]
  },
  {
    v: "1.2",
    d: "2026-06-04",
    items: [
      "L'import di una ricetta da un link prende anche la foto.",
      "Tempo di preparazione letto in automatico dai link."
    ]
  },
  {
    v: "1.1",
    d: "2026-06-04",
    items: [
      "Schermata di avvio animata: 4 effetti del cappello a sorpresa.",
      "Tanti piccoli effetti grafici (coriandoli, cuori, animazioni)."
    ]
  },
  {
    v: "1.0",
    d: "2026-06-03",
    items: [
      "Valori nutrizionali stimati per ricetta (calorie e macro).",
      "Promemoria e notifiche push (anche ad app chiusa), con orari scegliibili.",
      "Ricerca per tempo di preparazione (≤15 / ≤30 min).",
      "Lista della spesa con quantità modificabili e spunta rapida.",
      "Più strumenti di cottura e più categorie predefinite."
    ]
  }
];
