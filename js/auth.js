// Gestione account Firebase (login/registrazione via email e password).
// Usato solo in modalità cloud. La sessione resta attiva tra un avvio e l'altro,
// quindi tua moglie fa l'accesso una sola volta sul telefono.

import { firebaseConfig } from "./config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.5";

let authInstance = null;
let mod = null;

async function ensureApp() {
  if (authInstance) return authInstance;
  const appMod = await import(`${SDK}/firebase-app.js`);
  mod = await import(`${SDK}/firebase-auth.js`);
  // initializeApp è idempotente solo se non già creato: gestiamo entrambi i casi.
  let app;
  try {
    app = appMod.getApp();
  } catch {
    app = appMod.initializeApp(firebaseConfig);
  }
  authInstance = mod.getAuth(app);
  await mod.setPersistence(authInstance, mod.browserLocalPersistence).catch(() => {});
  return authInstance;
}

export async function observeAuth(callback) {
  const auth = await ensureApp();
  return mod.onAuthStateChanged(auth, callback);
}

export async function signIn(email, password) {
  const auth = await ensureApp();
  const cred = await mod.signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signUp(email, password) {
  const auth = await ensureApp();
  const cred = await mod.createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  const auth = await ensureApp();
  await mod.signOut(auth);
}

// Traduce i codici di errore Firebase in messaggi in italiano.
export function authErrorMessage(err) {
  const code = err && err.code ? err.code : "";
  const map = {
    "auth/invalid-email": "Indirizzo email non valido.",
    "auth/user-disabled": "Questo account è disabilitato.",
    "auth/user-not-found": "Nessun account con questa email.",
    "auth/wrong-password": "Password errata.",
    "auth/invalid-credential": "Email o password non corretti.",
    "auth/email-already-in-use": "Esiste già un account con questa email.",
    "auth/weak-password": "La password deve avere almeno 6 caratteri.",
    "auth/network-request-failed": "Connessione assente. Riprova quando sei online.",
    "auth/too-many-requests": "Troppi tentativi. Attendi qualche minuto."
  };
  return map[code] || "Si è verificato un errore. Riprova.";
}
