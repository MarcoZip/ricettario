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

export async function signUp(email, password, nickname) {
  const auth = await ensureApp();
  const cred = await mod.createUserWithEmailAndPassword(auth, email, password);
  if (nickname) { try { await mod.updateProfile(cred.user, { displayName: nickname }); } catch (e) { /* ignora */ } }
  return cred.user;
}

// Salva/aggiorna il nickname (displayName) sull'account corrente.
export async function setDisplayName(nickname) {
  const auth = await ensureApp();
  if (auth.currentUser && nickname) {
    try { await mod.updateProfile(auth.currentUser, { displayName: nickname }); } catch (e) { /* ignora */ }
  }
}

export async function logout() {
  const auth = await ensureApp();
  await mod.signOut(auth);
}

export function currentEmail() {
  return authInstance && authInstance.currentUser ? (authInstance.currentUser.email || "") : "";
}

// Invia l'email per reimpostare la password (password dimenticata).
export async function sendReset(email) {
  const auth = await ensureApp();
  await mod.sendPasswordResetEmail(auth, email);
}

// Ri-autentica con la password attuale (richiesto prima di cambi sensibili).
async function reauth(currentPassword) {
  const auth = await ensureApp();
  const u = auth.currentUser;
  if (!u || !u.email) throw new Error("Non sei connesso.");
  const cred = mod.EmailAuthProvider.credential(u.email, currentPassword);
  await mod.reauthenticateWithCredential(u, cred);
}

// Cambia email: invia un link di conferma al NUOVO indirizzo (poi diventa attivo).
export async function changeEmail(newEmail, currentPassword) {
  const auth = await ensureApp();
  await reauth(currentPassword);
  if (mod.verifyBeforeUpdateEmail) await mod.verifyBeforeUpdateEmail(auth.currentUser, newEmail);
  else await mod.updateEmail(auth.currentUser, newEmail);
}

export async function changePassword(newPassword, currentPassword) {
  const auth = await ensureApp();
  await reauth(currentPassword);
  await mod.updatePassword(auth.currentUser, newPassword);
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
    "auth/too-many-requests": "Troppi tentativi. Attendi qualche minuto.",
    "auth/requires-recent-login": "Per sicurezza, esci e rientra, poi riprova.",
    "auth/missing-password": "Inserisci la password.",
    "auth/operation-not-allowed": "Operazione non consentita dal provider."
  };
  return map[code] || "Si è verificato un errore. Riprova.";
}
