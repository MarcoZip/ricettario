// Promemoria locali: notifiche di sistema per le scadenze in dispensa e per il
// pasto pianificato di oggi. Appaiono quando l'app viene aperta o torna in primo
// piano e restano nel centro notifiche del telefono. Sono mostrate al massimo
// una volta al giorno per tipo. Il service worker è già predisposto per ricevere
// in futuro anche le push inviate da un server.

const K = {
  enabled: "ricettario.notify.enabled",
  expiry: "ricettario.notify.expiry",
  meals: "ricettario.notify.meals",
  days: "ricettario.notify.days",
  hour: "ricettario.notify.hour",
  evening: "ricettario.notify.evening",
  eveningHour: "ricettario.notify.eveningHour",
  lastExpiry: "ricettario.notify.lastExpiry",
  lastMeals: "ricettario.notify.lastMeals"
};

export function notifySupported() {
  return typeof Notification !== "undefined" && "serviceWorker" in navigator;
}

export function notifyPermission() {
  return notifySupported() ? Notification.permission : "denied";
}

// iPhone: le notifiche PWA funzionano solo se l'app è installata sulla Home.
export function isIosNotInstalled() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  return ios && !standalone;
}

export function notifyEnabled() {
  return notifySupported() &&
    localStorage.getItem(K.enabled) === "1" &&
    Notification.permission === "granted";
}

function flag(key, def) {
  const v = localStorage.getItem(key);
  return v == null ? def : v === "1";
}

export function getNotifyPrefs() {
  const hour = parseInt(localStorage.getItem(K.hour), 10);
  const eveningHour = parseInt(localStorage.getItem(K.eveningHour), 10);
  return {
    enabled: localStorage.getItem(K.enabled) === "1",
    expiry: flag(K.expiry, true),
    meals: flag(K.meals, true),
    days: parseInt(localStorage.getItem(K.days), 10) || 3,
    hour: isNaN(hour) ? 9 : hour,
    evening: flag(K.evening, false),
    eveningHour: isNaN(eveningHour) ? 20 : eveningHour
  };
}

export function setNotifyPref(key, value) {
  if (key === "days" || key === "hour" || key === "eveningHour") localStorage.setItem(K[key], String(value));
  else if (K[key]) localStorage.setItem(K[key], value ? "1" : "0");
}

// Chiede il permesso (deve partire da un tap dell'utente) e attiva i promemoria.
export async function enableNotify() {
  if (!notifySupported()) throw new Error("Le notifiche non sono supportate su questo dispositivo.");
  if (isIosNotInstalled()) throw new Error("Su iPhone aggiungi prima l'app alla schermata Home (Condividi → Aggiungi a Home), poi riprova.");
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") {
    localStorage.setItem(K.enabled, "0");
    throw new Error("Permesso notifiche negato. Puoi riattivarlo dalle impostazioni del telefono.");
  }
  localStorage.setItem(K.enabled, "1");
  return true;
}

export function disableNotify() {
  localStorage.setItem(K.enabled, "0");
}

async function show(title, body, tag) {
  const opts = {
    body,
    tag,
    renotify: true,
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    data: { url: "./" }
  };
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, opts);
  } catch (e) {
    try { new Notification(title, opts); } catch (_) { /* ignora */ }
  }
}

export async function sendTestNotification() {
  await show("Fornelli", "Le notifiche sono attive! Ti avviserò di scadenze e pasti del giorno.", "fornelli-test");
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Controlla scadenze e pasti del giorno e mostra le notifiche (max 1/giorno per
// tipo). store = facciata dati (store.js). Silenzioso se i promemoria sono off.
export async function runDailyReminders(store) {
  if (!notifyEnabled()) return;
  const prefs = getNotifyPrefs();
  const today = todayStr();

  if (prefs.expiry && localStorage.getItem(K.lastExpiry) !== today) {
    const exp = store.getExpiringPantry(prefs.days);
    if (exp.length) {
      const scaduti = exp.filter((e) => e.days < 0).length;
      const body = scaduti
        ? `${exp.length} alimenti da controllare in dispensa (${scaduti} già scaduti).`
        : `${exp.length} ${exp.length === 1 ? "alimento sta" : "alimenti stanno"} per scadere. Controlla la dispensa.`;
      await show("Scadenze in dispensa", body, "fornelli-expiry");
      localStorage.setItem(K.lastExpiry, today);
    }
  }

  if (prefs.meals && localStorage.getItem(K.lastMeals) !== today) {
    const meals = store.getPlanByDate(today).filter((e) => store.getRecipe(e.recipeId));
    if (meals.length) {
      const titoli = meals.map((e) => store.getRecipe(e.recipeId).title).slice(0, 3).join(", ");
      await show("Oggi si mangia", titoli + (meals.length > 3 ? "…" : ""), "fornelli-meals");
      localStorage.setItem(K.lastMeals, today);
    }
  }
}
