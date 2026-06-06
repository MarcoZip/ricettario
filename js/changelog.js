// Storico delle novità (il più recente in cima). A ogni pubblicazione: aggiungere
// una voce qui e alzare APP_VERSION in config.js. La finestra "Novità" mostra le
// voci più recenti di quella già vista dall'utente, MA solo quelle "degne di nota"
// (le voci con `minor: true` — correzioni/ritocchi — restano nello storico in
// Opzioni ma non fanno comparire il popup).

export const CHANGELOG = [
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
