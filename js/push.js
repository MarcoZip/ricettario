// Notifiche push "vere" (anche ad app chiusa), modello relay:
// il client calcola i promemoria dei prossimi giorni e li deposita nel Worker
// Cloudflare insieme all'iscrizione push; il Worker (Cron) li invia al momento.
// Non serve alcun accesso a Firestore lato server.
import { VAPID_PUBLIC_KEY, PUSH_WORKER_URL, isPushConfigured } from "./config.js";
import { getNotifyPrefs } from "./notify.js";

const DAYS_AHEAD = 14;   // quanti giorni in avanti programmare
const SEND_HOUR = 9;     // ora locale di invio

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";
}

export function pushReady() {
  return pushSupported() && isPushConfigured();
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Iscrizione push corrente, se presente.
async function getSubscription() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function isPushSubscribed() {
  if (!pushReady()) return false;
  try { return Boolean(await getSubscription()); } catch (e) { return false; }
}

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Costruisce i promemoria futuri (sendAt > ora) per scadenze e pasti pianificati.
// Le scadenze avvisano `prefs.days` giorni prima della data di scadenza.
export function buildReminders(store, prefs) {
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // mappa giorno → { meals:[titoli], expCount, expScaduti }
  const byDay = new Map();
  const ensure = (key) => {
    if (!byDay.has(key)) byDay.set(key, { meals: [], expCount: 0 });
    return byDay.get(key);
  };

  // Pasti pianificati nei prossimi giorni.
  if (prefs.meals) {
    for (let off = 0; off < DAYS_AHEAD; off++) {
      const d = new Date(today); d.setDate(d.getDate() + off);
      const key = dayKey(d);
      const meals = store.getPlanByDate(key).filter((e) => store.getRecipe(e.recipeId));
      if (meals.length) ensure(key).meals = meals.map((e) => store.getRecipe(e.recipeId).title);
    }
  }

  // Scadenze: avvisa (prefs.days) giorni prima della scadenza di ogni alimento.
  if (prefs.expiry) {
    const wide = store.getExpiringPantry(DAYS_AHEAD); // include scaduti e prossimi
    for (const item of wide) {
      // giorno di avviso = scadenza - prefs.days
      const remindOff = item.days - prefs.days;
      const off = Math.max(0, remindOff); // se già dentro la finestra, avvisa oggi
      if (off >= DAYS_AHEAD) continue;
      const d = new Date(today); d.setDate(d.getDate() + off);
      ensure(dayKey(d)).expCount++;
    }
  }

  const reminders = [];
  for (const [key, info] of byDay) {
    const [y, m, dd] = key.split("-").map(Number);
    const when = new Date(y, m - 1, dd, SEND_HOUR, 0, 0, 0);
    let sendAt = when.getTime();
    if (sendAt <= now) sendAt = now + 2 * 60 * 1000; // se l'ora è già passata, tra ~2 minuti
    const parts = [];
    let title = "Promemoria Fornelli";
    if (info.meals.length) {
      title = "Oggi si mangia";
      parts.push(info.meals.slice(0, 3).join(", ") + (info.meals.length > 3 ? "…" : ""));
    }
    if (info.expCount) parts.push(`${info.expCount} ${info.expCount === 1 ? "alimento in scadenza" : "alimenti in scadenza"}`);
    if (!parts.length) continue;
    reminders.push({ id: key, sendAt, title, body: parts.join(" · ") });
  }
  // solo futuri, ordinati
  return reminders.filter((r) => r.sendAt > now).sort((a, b) => a.sendAt - b.sendAt);
}

async function postWorker(path, payload) {
  const base = PUSH_WORKER_URL.replace(/\/$/, "");
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Worker push: " + res.status);
  return res.json().catch(() => ({}));
}

// Iscrive il dispositivo e carica i promemoria. Da chiamare dopo aver concesso
// il permesso notifiche.
export async function registerPush(store) {
  if (!pushReady()) throw new Error("Push non configurate");
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }
  const reminders = buildReminders(store, getNotifyPrefs());
  await postWorker("/register", { subscription: sub.toJSON(), reminders });
  return true;
}

// Ricalcola e ricarica i promemoria (se già iscritti). Silenzioso in caso d'errore.
export async function refreshReminders(store) {
  if (!pushReady()) return;
  try {
    const sub = await getSubscription();
    if (!sub) return;
    const reminders = buildReminders(store, getNotifyPrefs());
    await postWorker("/register", { subscription: sub.toJSON(), reminders });
  } catch (e) { /* offline o worker non raggiungibile: riproverà alla prossima apertura */ }
}

export async function unregisterPush() {
  if (!pushSupported()) return;
  try {
    const sub = await getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      if (isPushConfigured()) await postWorker("/unregister", { endpoint }).catch(() => {});
    }
  } catch (e) { /* ignora */ }
}
