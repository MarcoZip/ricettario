// Punto di ingresso dell'app: sceglie la modalità (locale o cloud), gestisce
// l'autenticazione e avvia l'interfaccia.
import * as store from "./store.js";
import * as ui from "./ui.js";
import { isCloudConfigured } from "./config.js";
import { applyTheme, applyAccent, applyTextScale } from "./theme.js";
import { runDailyReminders } from "./notify.js";
import { isPushSubscribed, refreshReminders } from "./push.js";
import { getNickname, setNickname } from "./profile.js";

// Gestisce i promemoria lasciando il tempo ai dati (cloud) di arrivare. Se le
// push "vere" sono attive, aggiorna i promemoria sul worker (le manda lui, anche
// ad app chiusa); altrimenti usa il fallback locale (notifica all'apertura).
async function doReminders() {
  try {
    if (await isPushSubscribed()) await refreshReminders(store);
    else await runDailyReminders(store);
  } catch (e) { /* offline o non supportato */ }
}
function scheduleReminders() {
  setTimeout(doReminders, 3000);
}

applyTheme();
applyAccent();
applyTextScale();

const root = document.getElementById("view");
let mounted = false;
let accountEmail = null;

function ensureMounted() {
  if (!mounted) {
    ui.mount(root);
    mounted = true;
  }
}

function updateBadge() {
  const badge = document.getElementById("syncBadge");
  // In modalità cloud (anche nella schermata di accesso) mostra "Cloud".
  const cloud = store.getMode() === "cloud" || isCloudConfigured();
  const online = navigator.onLine;
  if (cloud) {
    badge.textContent = online ? "Cloud ✓" : "Offline";
    badge.className = "badge " + (online ? "badge--cloud" : "badge--offline");
  } else {
    badge.textContent = "Locale";
    badge.className = "badge badge--local";
  }
}

ui.handlers.getAccountInfo = () => ({
  configured: isCloudConfigured(),
  cloud: store.getMode() === "cloud",
  email: accountEmail
});

async function startLocal() {
  await store.initLocal();
  ensureMounted();
  ui.setLoginMode(false);
  ui.navigate("strumenti");
  updateBadge();
  scheduleReminders();
  ui.maybeShowWhatsNew();
  ui.promptNicknameIfMissing();
}

async function startCloud() {
  const auth = await import("./auth.js");

  ui.handlers.onLogin = async (email, pass) => {
    try {
      await auth.signIn(email, pass);
    } catch (e) {
      throw new Error(auth.authErrorMessage(e));
    }
  };
  ui.handlers.onSignup = async (email, pass, nickname) => {
    try {
      sessionStorage.setItem("ricettario.seed", "1");
      await auth.signUp(email, pass, nickname);
    } catch (e) {
      sessionStorage.removeItem("ricettario.seed");
      throw new Error(auth.authErrorMessage(e));
    }
  };
  ui.handlers.onLogout = async () => {
    await auth.logout();
  };
  // Salva il nickname anche sull'account (sincronizzato tra dispositivi).
  ui.handlers.onSetNickname = async (nick) => { try { await auth.setDisplayName(nick); } catch (e) { /* ignora */ } };
  ui.handlers.onSendReset = async (email) => {
    try { await auth.sendReset(email); } catch (e) { throw new Error(auth.authErrorMessage(e)); }
  };
  ui.handlers.onChangeEmail = async (newEmail, pass) => {
    try { await auth.changeEmail(newEmail, pass); } catch (e) { throw new Error(auth.authErrorMessage(e)); }
  };
  ui.handlers.onChangePassword = async (newPass, pass) => {
    try { await auth.changePassword(newPass, pass); } catch (e) { throw new Error(auth.authErrorMessage(e)); }
  };

  // Reagisce ai cambi di stato dell'accesso.
  await auth.observeAuth(async (user) => {
    if (user) {
      accountEmail = user.email;
      const seed = sessionStorage.getItem("ricettario.seed") === "1";
      sessionStorage.removeItem("ricettario.seed");
      await store.initCloud(user.uid, { seedIfEmpty: seed });
      store.recordAccess(user.email).catch(() => {});
      // Sincronizza il nickname dall'account (displayName) se non l'abbiamo qui.
      if (!getNickname() && user.displayName) setNickname(user.displayName);
      ensureMounted();
      ui.setLoginMode(false);
      ui.navigate("strumenti");
      updateBadge();
      scheduleReminders();
      ui.maybeShowWhatsNew();
      ui.promptNicknameIfMissing();
    } else {
      accountEmail = null;
      ensureMounted();
      ui.renderLogin();
      updateBadge();
    }
  });
}

async function boot() {
  try {
    if (isCloudConfigured()) {
      await startCloud();
    } else {
      await startLocal();
    }
  } catch (e) {
    console.error("Avvio fallito, passo alla modalità locale:", e);
    ui.toast("Cloud non disponibile: uso il salvataggio locale", "error");
    await startLocal();
  }
}

window.addEventListener("online", updateBadge);
window.addEventListener("offline", updateBadge);

// Ricontrolla i promemoria quando l'app torna in primo piano.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") doReminders();
});

// Registrazione del service worker (per il funzionamento offline / installazione).
// Quando arriva una versione nuova, la pagina si ricarica da sola così l'utente
// vede subito l'aggiornamento (niente più "chiudi e riapri" manuale).
if ("serviceWorker" in navigator) {
  let refreshing = false;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing || !hadController) return; // non ricaricare alla primissima installazione
    refreshing = true;
    window.location.reload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      // Controlla se c'è una versione nuova quando l'app torna in primo piano.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reg.update().catch(() => {});
      });
    }).catch(() => {});
  });
}

boot();
