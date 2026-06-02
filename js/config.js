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
export const WORKER_URL = "";

export function isImportConfigured() {
  return Boolean(WORKER_URL);
}
