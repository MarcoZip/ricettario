// Storico delle novità (il più recente in cima). A ogni pubblicazione: aggiungere
// una voce qui e alzare APP_VERSION in config.js. La finestra "Novità" mostra le
// voci più recenti di quella già vista dall'utente, MA solo quelle "degne di nota"
// (le voci con `minor: true` — correzioni/ritocchi — restano nello storico in
// Opzioni ma non fanno comparire il popup).

export const CHANGELOG = [
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
