// ============================================================
//  CONFIGURAZIONE FIREBASE (backup nel cloud)
// ------------------------------------------------------------
//  L'app funziona SUBITO anche senza Firebase: in tal caso i dati
//  vengono salvati solo su questo telefono (modalità "Locale").
//
//  Per attivare il BACKUP NEL CLOUD e la sincronizzazione:
//   1. Crea un progetto gratuito su  https://console.firebase.google.com
//   2. Attiva  Firestore Database  e  Authentication > Email/Password
//   3. Copia qui sotto i valori del tuo progetto
//      (Impostazioni progetto > Le tue app > Configurazione SDK)
//
//  Trovi la guida passo-passo completa nel file  README.md
// ============================================================

// Versione dell'app (mostrata in Impostazioni). Da alzare a ogni release.
export const APP_VERSION = "7.41";

export const firebaseConfig = {
  apiKey: "AIzaSyDOpr2Q0KXamaMdyAXzLvP9dA_U3kQj14E",
  authDomain: "ricettario-48e86.firebaseapp.com",
  projectId: "ricettario-48e86",
  storageBucket: "ricettario-48e86.firebasestorage.app",
  messagingSenderId: "800404210206",
  appId: "1:800404210206:web:661822566fc0256922240f"
};

// Non modificare: indica se la configurazione cloud è stata compilata.
export function isCloudConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

// ============================================================
//  IMPORT INGREDIENTI DA LINK (opzionale)
// ------------------------------------------------------------
//  Per importare automaticamente gli ingredienti dai link delle ricette
//  (es. GialloZafferano) serve un piccolo "ponte" gratuito (Cloudflare Worker).
//  Dopo averlo creato, incolla qui il suo indirizzo. Guida in README.md.
//  Lasciato vuoto, l'app funziona lo stesso (resta l'incolla manuale).
// ============================================================
export const WORKER_URL = "https://ricette-import.marcozeta73.workers.dev";

export function isImportConfigured() {
  return Boolean(WORKER_URL);
}

// ============================================================
//  NOTIFICHE PUSH (anche ad app chiusa) — opzionale
// ------------------------------------------------------------
//  Per ricevere le notifiche quando l'app è chiusa serve un piccolo
//  servizio che le invia a un orario fisso: un Cloudflare Worker con
//  "Cron Trigger". La chiave pubblica qui sotto è già pronta; dopo aver
//  pubblicato il worker, incolla il suo indirizzo in PUSH_WORKER_URL.
//  Guida completa in README.md. Lasciato vuoto, restano i promemoria
//  locali (che appaiono quando apri l'app).
// ============================================================
export const VAPID_PUBLIC_KEY = "BG6AgCm8Ca2HT0xDX_hdBct0cQXRn-Yj8Rbs-3dbgyYDLgPfrKaktoDMg8ho0PMV99rrg5McH1QeBe1EiYzQJq8";
export const PUSH_WORKER_URL = "https://fornelli-push.marcozeta73.workers.dev";

export function isPushConfigured() {
  return Boolean(VAPID_PUBLIC_KEY && PUSH_WORKER_URL);
}

// Ricerca online su Spoonacular (database enorme in inglese). Per attivarla:
// aggiungi il secret SPOON_KEY al worker import (chiave gratuita di Spoonacular),
// ripubblica il worker e metti true qui sotto. Guida in README.
export const SPOONACULAR_ENABLED = true;

// Ricerca online su Edamam (altro grande database in inglese). Per attivarla:
// crea un'app gratuita su https://developer.edamam.com (piano "Recipe Search API"),
// aggiungi al worker import i secret EDAMAM_ID e EDAMAM_KEY (e, se richiesto,
// EDAMAM_USER = il tuo username Edamam), ripubblica il worker e metti true qui.
export const EDAMAM_ENABLED = true;
