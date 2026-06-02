// Punto di ingresso dell'app: sceglie la modalità (locale o cloud), gestisce
// l'autenticazione e avvia l'interfaccia.
import * as store from "./store.js";
import * as ui from "./ui.js";
import { isCloudConfigured } from "./config.js";

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
  ui.handlers.onSignup = async (email, pass) => {
    try {
      sessionStorage.setItem("ricettario.seed", "1");
      await auth.signUp(email, pass);
    } catch (e) {
      sessionStorage.removeItem("ricettario.seed");
      throw new Error(auth.authErrorMessage(e));
    }
  };
  ui.handlers.onLogout = async () => {
    await auth.logout();
  };

  // Reagisce ai cambi di stato dell'accesso.
  await auth.observeAuth(async (user) => {
    if (user) {
      accountEmail = user.email;
      const seed = sessionStorage.getItem("ricettario.seed") === "1";
      sessionStorage.removeItem("ricettario.seed");
      await store.initCloud(user.uid, { seedIfEmpty: seed });
      ensureMounted();
      ui.setLoginMode(false);
      ui.navigate("strumenti");
      updateBadge();
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

// Registrazione del service worker (per il funzionamento offline / installazione).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

boot();
