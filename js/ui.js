// Interfaccia utente: rendering delle schermate, modali e gestione eventi.
import * as store from "./store.js";
import * as mealdb from "./mealdb.js";
import { ITALIAN_SITES } from "./sites.js";
import { iconHtml, rawIcon, ICON_PICKER, resolveIcon } from "./icons.js";
import { parseList, ingredientText, formatQty, categorize, CATEGORY_ORDER } from "./ingredients.js";
import { estimateNutrition, enrichWithOFF } from "./nutrition.js";
import { notifySupported, notifyEnabled, getNotifyPrefs, setNotifyPref, enableNotify, disableNotify, sendTestNotification, isIosNotInstalled } from "./notify.js";
import { pushReady, isPushSubscribed, registerPush, refreshReminders, unregisterPush } from "./push.js";
import { importFromUrl, searchGz, searchMisya, searchCookist, searchEdamam, searchSpoon, spoonInfo, winePairing } from "./import-recipe.js";
import { translateRecipe, translateList, translateToEnglish, translateText } from "./translate.js";
import { shareRecipeImage } from "./share-image.js";
import { findSubstitutions } from "./substitutions.js";
import { estimateCost } from "./cost.js";
import { seasonalProduce, recipeSeasonalMatches, monthName, currentMonth } from "./seasonal.js";
import { getNickname, setNickname } from "./profile.js";
import { isImportConfigured, APP_VERSION, PUSH_WORKER_URL, SPOONACULAR_ENABLED, EDAMAM_ENABLED } from "./config.js";
import { CHANGELOG } from "./changelog.js";
import { fileToDataUrl } from "./image.js";
import { getTheme, setTheme, getAccent, setAccent, ACCENT_PRESETS } from "./theme.js";

// Tag suggeriti nel form ricetta.
const TAG_SUGGESTIONS = ["Primi", "Secondi", "Contorni", "Antipasti", "Dolci", "Colazione", "Merenda", "Zuppe", "Insalate", "Lievitati", "Veloce", "Vegetariano", "Vegano", "Pesce", "Carne", "Senza glutine", "Per ospiti", "Bambini"];
const ALLERGENS = ["Glutine", "Lattosio", "Uova", "Frutta a guscio", "Arachidi", "Pesce", "Crostacei", "Soia", "Sedano"];

// Animazioni: rispetta la preferenza di sistema "riduci animazioni".
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Esegue una transizione animata tra schermate (stile iOS) quando supportata.
function withTransition(fn) {
  if (reduceMotion || !document.startViewTransition) return fn();
  document.startViewTransition(fn);
}

// Esplosione di particelle (confetti o emoji) per i momenti "wow".
function fxBurst(x, y, opts = {}) {
  if (reduceMotion) return;
  const emojis = opts.emojis || null;
  const count = opts.count || (emojis ? 14 : 28);
  const colors = ["#ff7a3d", "#ffd166", "#06d6a0", "#ef476f", "#5aa9ff", "#c77dff"];
  const layer = document.createElement("div");
  layer.className = "fx-layer";
  for (let i = 0; i < count; i++) {
    const b = document.createElement("span");
    b.className = "fx-bit" + (emojis ? " is-emoji" : "");
    const ang = Math.random() * Math.PI * 2;
    const dist = 70 + Math.random() * 130;
    b.style.left = x + "px";
    b.style.top = y + "px";
    b.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    b.style.setProperty("--dy", Math.sin(ang) * dist + 30 + "px"); // leggera gravità
    b.style.setProperty("--rot", Math.random() * 720 - 360 + "deg");
    b.style.animationDelay = Math.floor(Math.random() * 80) + "ms";
    if (emojis) b.textContent = emojis[i % emojis.length];
    else b.style.background = colors[i % colors.length];
    layer.appendChild(b);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1300);
}
function fxBurstFrom(el, opts) {
  if (!el || reduceMotion) return;
  const r = el.getBoundingClientRect();
  fxBurst(r.left + r.width / 2, r.top + r.height / 2, opts);
}

// Leggero feedback aptico (vibrazione) sui dispositivi che lo supportano.
function haptic(ms = 15) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignora */ }
}

// Anima un numero da 0 al valore finale.
function countUp(el, to) {
  if (!el) return;
  if (reduceMotion || to <= 0) { el.textContent = String(to); return; }
  const dur = 600;
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = String(Math.round(eased * to));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

let root = null;
let currentRoute = "strumenti";
let currentToolId = null;
let currentRecipeId = null;
let detailServings = null; // porzioni scelte nella schermata ricetta
let planYear = null; // anno mostrato nel calendario
let planMonth = null; // mese (0-11) mostrato nel calendario
let homeQuery = ""; // ricerca nella home
let homeFilter = ""; // "" | "fav" | "cooked" | "recent" | "menu" | <nome tag>
let shopTab = "lista"; // scheda Spesa: "lista" | "dispensa"
let lastShopToggled = null; // id dell'ultimo articolo spuntato (per l'animazione)
let planView = "month"; // "month" | "week"
let weekAnchor = null; // data di riferimento per la vista settimana

// Stato locale della sezione Ricettario (per non perdere i risultati ad ogni render).
let mealTab = "online";
let mealSource = "all"; // "all" | "mealdb" | "gz" | "misya" | "spoon"
let mealQuery = "";
let mealResults = null;
let mealLoading = false;
let mealError = "";

// Callback impostate da app.js
export const handlers = {
  onLogin: async () => {},
  onSignup: async () => {},
  onLogout: async () => {},
  onSetNickname: async () => {},
  onSendReset: async () => {},
  onChangeEmail: async () => {},
  onChangePassword: async () => {},
  getAccountInfo: () => ({ cloud: false, configured: false, email: null })
};

// Colori di "bagliore" assegnati a rotazione agli strumenti.
const ACCENTS = ["#ff5e7e", "#ff9a3d", "#5ea8ff", "#36d1b7", "#b06cff", "#ffd166", "#ff7a3d", "#4dd0a0"];

// Saluto in base all'ora del giorno.
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}
// Etichetta difficoltà (1 facile · 2 media · 3 difficile).
const DIFF_LABELS = { 1: "Facile", 2: "Media", 3: "Difficile" };
function diffLabel(d) { return DIFF_LABELS[d] || ""; }

// ---------------- Utility ----------------
function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(url) {
  const u = String(url || "").trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (u && !/^[a-z]+:/i.test(u)) return "https://" + u;
  return "";
}

export function toast(message, type = "") {
  const rootEl = document.getElementById("toastRoot");
  const t = document.createElement("div");
  t.className = "toast" + (type ? " toast--" + type : "");
  t.textContent = message;
  rootEl.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 250);
  }, 2600);
}

function openModal(innerHtml) {
  const host = document.getElementById("modalRoot");
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `<div class="modal"><div class="modal__handle"></div>${innerHtml}</div>`;
  host.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  return { el: backdrop.querySelector(".modal"), close };
}

export function confirmDialog({ title, message, confirmText = "Conferma", danger = false }) {
  return new Promise((resolve) => {
    const m = openModal(`
      <h3 class="modal__title">${escapeHtml(title)}</h3>
      <p style="margin-top:-6px;color:var(--text-soft)">${escapeHtml(message)}</p>
      <div class="modal__actions">
        <button class="btn" data-act="cancel">Annulla</button>
        <button class="btn ${danger ? "btn--primary" : "btn--primary"}" style="${danger ? "background:var(--danger)" : ""}" data-act="ok">${escapeHtml(confirmText)}</button>
      </div>
    `);
    m.el.querySelector('[data-act="cancel"]').onclick = () => { m.close(); resolve(false); };
    m.el.querySelector('[data-act="ok"]').onclick = () => { m.close(); resolve(true); };
  });
}

// ---------------- Navigazione ----------------
export function mount(rootEl) {
  root = rootEl;
  // Inietta le icone Phosphor dove indicato nell'HTML (es. barra di navigazione).
  document.querySelectorAll("[data-ph]").forEach((el) => { el.innerHTML = rawIcon(el.dataset.ph); });
  store.subscribe(() => render());
  document.querySelectorAll(".bottom-nav__btn").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.route));
  });
  const help = document.getElementById("helpBtn");
  if (help) help.addEventListener("click", () => openGuide());
  // Guida al primo avvio.
  try {
    if (!localStorage.getItem("ricettario.guide.v7")) {
      localStorage.setItem("ricettario.guide.v7", "1");
      setTimeout(() => openGuide(true), 500);
    }
  } catch {}
  setupBackHandler();
  setupRipple();
  setupAurora();
}

// Onda "ripple" sui pulsanti al tocco.
function setupRipple() {
  if (reduceMotion) return;
  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".btn");
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const r = document.createElement("span");
    r.className = "ripple";
    r.style.width = r.style.height = size + "px";
    r.style.left = (e.clientX - rect.left - size / 2) + "px";
    r.style.top = (e.clientY - rect.top - size / 2) + "px";
    btn.appendChild(r);
    setTimeout(() => r.remove(), 600);
  });
}

// Sfondo "aurora" animato dietro i contenuti (soft, gated reduce-motion).
function setupAurora() {
  if (reduceMotion || document.getElementById("aurora")) return;
  const a = document.createElement("div");
  a.id = "aurora";
  document.body.insertBefore(a, document.body.firstChild);
}

// Tasto Indietro del telefono: torna alla schermata precedente DENTRO l'app
// invece di chiuderla. Teniamo sempre uno "stato in più" nella cronologia: a
// ogni Indietro lo consumiamo e, se abbiamo qualcosa da chiudere, ne rimettiamo
// uno; quando siamo alla home l'app può chiudersi normalmente.
let activeCookClose = null; // funzione di chiusura della Modalità cucina, se aperta
function handleAppBack() {
  const modals = document.querySelectorAll("#modalRoot .modal-backdrop");
  if (modals.length) { modals[modals.length - 1].remove(); return true; }
  if (activeCookClose) { try { activeCookClose(); } catch (e) {} return true; }
  const guide = document.querySelector(".guide");
  if (guide) { guide.remove(); return true; }
  if (loginMode) return false;
  if (currentRecipeId) { currentRecipeId = null; detailServings = null; withTransition(() => render()); return true; }
  if (currentToolId) { currentToolId = null; withTransition(() => render()); return true; }
  if (currentRoute && currentRoute !== "strumenti") { navigate("strumenti"); return true; }
  return false;
}
function setupBackHandler() {
  try {
    history.replaceState({ app: true }, "");
    history.pushState({ app: true }, "");
  } catch (e) { return; }
  window.addEventListener("popstate", () => {
    const acted = handleAppBack();
    if (acted) { try { history.pushState({ app: true }, ""); } catch (e) {} }
    else { try { history.back(); } catch (e) {} }
  });
}

// Mostra le novità quando la versione è cambiata dall'ultima volta (non al primo
// avvio assoluto). Salva la versione vista in localStorage. Va chiamata SOLO dopo
// l'accesso (quando si è nell'app vera), non sulla schermata di login.
export function maybeShowWhatsNew() {
  try {
    const KEY = "ricettario.seenVersion";
    const seen = localStorage.getItem(KEY);
    localStorage.setItem(KEY, APP_VERSION);
    if (!seen || seen === APP_VERSION) return; // primo avvio o nessun cambio
    const idx = CHANGELOG.findIndex((c) => c.v === seen);
    const all = idx > 0 ? CHANGELOG.slice(0, idx) : (idx === 0 ? [] : [CHANGELOG[0]]);
    // Nel popup solo le novità "degne di nota" (niente correzioni minori).
    const fresh = all.filter((c) => !c.minor);
    if (!fresh.length) return;
    // Aspetta che la splash di avvio sia sparita, così la finestra Novità non
    // viene coperta e appare DOPO l'animazione.
    let tries = 0;
    const open = () => {
      if (!document.getElementById("splash") || tries > 40) { openChangelog(fresh, { whatsNew: true }); return; }
      tries++; setTimeout(open, 200);
    };
    setTimeout(open, 400);
  } catch (e) { /* ignora */ }
}

// Chiede il nickname a chi non ce l'ha (al primo accesso), dopo splash/popup.
export function promptNicknameIfMissing() {
  if (getNickname()) return;
  let tries = 0;
  const go = () => {
    if ((document.getElementById("splash") || document.querySelector(".modal-backdrop")) && tries++ < 60) {
      setTimeout(go, 300); return;
    }
    if (!getNickname()) openNicknamePrompt();
  };
  setTimeout(go, 900);
}
function openNicknamePrompt() {
  const m = openModal(`
    <h3 class="modal__title">👋 Come ti chiami?</h3>
    <p class="hint" style="margin-top:-6px">Lo usiamo solo per salutarti nell'app.</p>
    <div class="field"><input type="text" id="nickInput" placeholder="Es. Paola" /></div>
    <div class="modal__actions"><button class="btn" data-act="skip">Salta</button><button class="btn btn--primary" data-act="save">Salva</button></div>
  `);
  setTimeout(() => { const i = m.el.querySelector("#nickInput"); if (i) i.focus(); }, 50);
  m.el.querySelector('[data-act="skip"]').onclick = m.close;
  m.el.querySelector('[data-act="save"]').onclick = () => {
    const n = (m.el.querySelector("#nickInput").value || "").trim();
    m.close();
    if (n) { setNickname(n); if (handlers.onSetNickname) handlers.onSetNickname(n); render(); }
  };
}

function openChangeNickname() {
  const m = openModal(`
    <h3 class="modal__title">Cambia nickname</h3>
    <div class="field"><input type="text" id="nkInput" placeholder="Es. Paola" value="${escapeHtml(getNickname())}" /></div>
    <div class="modal__actions"><button class="btn" data-act="cancel">Annulla</button><button class="btn btn--primary" data-act="save">Salva</button></div>
  `);
  setTimeout(() => { const i = m.el.querySelector("#nkInput"); if (i) i.focus(); }, 50);
  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  m.el.querySelector('[data-act="save"]').onclick = () => {
    const n = (m.el.querySelector("#nkInput").value || "").trim();
    setNickname(n);
    if (n && handlers.onSetNickname) handlers.onSetNickname(n);
    m.close();
    toast("Nickname aggiornato", "success");
    render();
  };
}

function openChangeEmail() {
  const m = openModal(`
    <h3 class="modal__title">Cambia email</h3>
    <div class="field"><label>Nuova email</label><input type="email" id="ceNew" inputmode="email" placeholder="nuova@esempio.it" /></div>
    <div class="field"><label>Password attuale</label><input type="password" id="cePass" autocomplete="current-password" placeholder="••••••" /></div>
    <div class="modal__actions"><button class="btn" data-act="cancel">Annulla</button><button class="btn btn--primary" data-act="save">Cambia</button></div>
  `);
  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  m.el.querySelector('[data-act="save"]').onclick = async () => {
    const email = m.el.querySelector("#ceNew").value.trim();
    const pass = m.el.querySelector("#cePass").value;
    if (!email || !pass) { toast("Compila tutti i campi", "error"); return; }
    const btn = m.el.querySelector('[data-act="save"]'); btn.disabled = true; btn.textContent = "Attendere…";
    try {
      await handlers.onChangeEmail(email, pass);
      m.close();
      toast("Ti ho inviato una mail al nuovo indirizzo: confermala per attivarlo.", "success");
    } catch (e) { toast(e.message || "Errore", "error"); btn.disabled = false; btn.textContent = "Cambia"; }
  };
}

function openChangePassword() {
  const m = openModal(`
    <h3 class="modal__title">Cambia password</h3>
    <div class="field"><label>Password attuale</label><input type="password" id="cpOld" autocomplete="current-password" placeholder="••••••" /></div>
    <div class="field"><label>Nuova password</label><input type="password" id="cpNew" autocomplete="new-password" placeholder="almeno 6 caratteri" /></div>
    <div class="modal__actions"><button class="btn" data-act="cancel">Annulla</button><button class="btn btn--primary" data-act="save">Cambia</button></div>
  `);
  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  m.el.querySelector('[data-act="save"]').onclick = async () => {
    const oldP = m.el.querySelector("#cpOld").value;
    const newP = m.el.querySelector("#cpNew").value;
    if (!oldP || !newP) { toast("Compila tutti i campi", "error"); return; }
    if (newP.length < 6) { toast("La nuova password deve avere almeno 6 caratteri", "error"); return; }
    const btn = m.el.querySelector('[data-act="save"]'); btn.disabled = true; btn.textContent = "Attendere…";
    try {
      await handlers.onChangePassword(newP, oldP);
      m.close();
      toast("Password aggiornata", "success");
    } catch (e) { toast(e.message || "Errore", "error"); btn.disabled = false; btn.textContent = "Cambia"; }
  };
}

function openForgotPassword(prefillEmail) {
  const m = openModal(`
    <h3 class="modal__title">Password dimenticata</h3>
    <p class="hint" style="margin-top:-6px">Inserisci la tua email: ti invieremo un link per reimpostarla.</p>
    <div class="field"><input type="email" id="fpEmail" inputmode="email" placeholder="email@esempio.it" value="${escapeHtml(prefillEmail || "")}" /></div>
    <div class="modal__actions"><button class="btn" data-act="cancel">Annulla</button><button class="btn btn--primary" data-act="send">Invia</button></div>
  `);
  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  m.el.querySelector('[data-act="send"]').onclick = async () => {
    const email = m.el.querySelector("#fpEmail").value.trim();
    if (!email) { toast("Inserisci l'email", "error"); return; }
    const btn = m.el.querySelector('[data-act="send"]'); btn.disabled = true; btn.textContent = "Invio…";
    try {
      await handlers.onSendReset(email);
      m.close();
      toast("Email inviata! Controlla la posta (anche lo spam).", "success");
    } catch (e) { toast(e.message || "Errore", "error"); btn.disabled = false; btn.textContent = "Invia"; }
  };
}

function changelogHtml(entries) {
  return entries.map((c) => `
    <div class="cl-entry">
      <div class="cl-ver">v${escapeHtml(c.v)} <span class="cl-date">${escapeHtml(c.d || "")}</span>${c.minor ? `<span class="cl-tag">correzione</span>` : ""}</div>
      <ul class="cl-list">${(c.items || []).map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
    </div>`).join("");
}

// Esporta tutte le ricette in una pagina stampabile (da cui "Salva come PDF").
const PRINT_CSS = `* { box-sizing: border-box; } body { font-family: Georgia, "Times New Roman", serif; color: #222; margin: 28px; } h1 { text-align: center; color: #df5117; } h2 { color: #df5117; border-bottom: 2px solid #ffb86b; padding-bottom: 4px; margin-top: 26px; } .pr { page-break-inside: avoid; margin: 14px 0 22px; } .pr h3 { margin: 0 0 4px; font-size: 1.25rem; } .pr .meta { color: #777; font-size: 0.85rem; margin-bottom: 8px; } .pr img { max-height: 240px; max-width: 100%; border-radius: 8px; display: block; margin: 8px 0; } .pr b { display: block; margin-top: 8px; } @media print { body { margin: 12mm; } }`;
function recipePrintHtml(r) {
  const ing = (r.ingredients || []).map((i) => `<li>${escapeHtml(i.raw || ingredientText(i))}</li>`).join("");
  const steps = (r.steps || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  const meta = [r.servings ? `Per ${r.servings}` : "", r.time ? `${r.time} min` : ""].filter(Boolean).join(" · ");
  return `<div class="pr">
    <h3>${escapeHtml(r.title)}</h3>
    ${meta ? `<div class="meta">${meta}</div>` : ""}
    ${r.photo ? `<img src="${escapeHtml(r.photo)}" alt="" />` : ""}
    ${ing ? `<b>Ingredienti</b><ul>${ing}</ul>` : ""}
    ${steps ? `<b>Preparazione</b><ol>${steps}</ol>` : ""}
    ${r.notes ? `<p><i>${escapeHtml(r.notes)}</i></p>` : ""}
  </div>`;
}
function exportRecipesPdf() {
  const recipes = store.getAllRecipes();
  if (!recipes.length) { toast("Nessuna ricetta da esportare", "error"); return; }
  let body = "";
  for (const t of store.getTools()) {
    const rs = store.getRecipesByTool(t.id);
    if (rs.length) body += `<h2>${escapeHtml(t.name)}</h2>` + rs.map(recipePrintHtml).join("");
  }
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Ricettario Fornelli</title><style>${PRINT_CSS}</style></head><body><h1>Il mio ricettario</h1>${body}<script>window.onload=function(){setTimeout(function(){window.print();},500);};<\/script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) { toast("Consenti i popup del browser per esportare", "error"); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

const ADMIN_EMAIL = "marcozeta73@gmail.com";

// Statistiche accessi degli utenti (solo amministratore): riepilogo per
// giorno/settimana/mese, per utente, con ordinamento.
async function openAccessStats() {
  const m = openModal(`
    <h3 class="modal__title">${iconHtml("cloud-check")} Accessi utenti</h3>
    <div id="accBody" class="cl-scroll"><div class="hint">Carico…</div></div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>
  `);
  m.el.querySelector('[data-act="ok"]').onclick = m.close;
  const body = m.el.querySelector("#accBody");
  let stats;
  try { stats = await store.getAccessStats(); }
  catch (e) { body.innerHTML = `<div class="hint">Impossibile leggere le statistiche. Pubblica le regole Firestore aggiornate e riprova.</div>`; return; }
  if (!stats.length) { body.innerHTML = `<div class="hint">Nessun accesso registrato per ora.</div>`; return; }

  const pad = (x) => String(x).padStart(2, "0");
  const today = (() => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; })();
  const fmtTs = (ts) => { try { const d = ts && ts.toDate ? ts.toDate() : (ts && ts.seconds ? new Date(ts.seconds * 1000) : null); return d ? d.toLocaleString("it-IT") : "—"; } catch (e) { return "—"; } };
  const weekStart = (s) => { const [y, mo, d] = s.split("-").map(Number); const dt = new Date(y, mo - 1, d); const dow = (dt.getDay() + 6) % 7; dt.setDate(dt.getDate() - dow); return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`; };
  const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
  const fmtMonth = (ym) => { const [y, mo] = ym.split("-"); return `${MESI[+mo - 1]} ${y}`; };
  const fmtDay = (s) => { const [, mo, d] = s.split("-"); return `${d}/${mo}`; };

  const dayTot = {}, monthTot = {};
  let totalAll = 0;
  for (const u of stats) {
    totalAll += u.count || 0;
    for (const [d, c] of Object.entries(u.days || {})) dayTot[d] = (dayTot[d] || 0) + (c || 0);
    for (const [mn, c] of Object.entries(u.months || {})) monthTot[mn] = (monthTot[mn] || 0) + (c || 0);
  }
  const weekTot = {};
  for (const [d, c] of Object.entries(dayTot)) { const w = weekStart(d); weekTot[w] = (weekTot[w] || 0) + c; }
  const datedSum = Object.values(dayTot).reduce((s, c) => s + c, 0);
  const undated = Math.max(0, totalAll - datedSum); // accessi vecchi senza data
  const todayCount = dayTot[today] || 0;
  const thisWeek = weekTot[weekStart(today)] || 0;
  const thisMonth = monthTot[today.slice(0, 7)] || 0;

  let view = "utenti", sort = "count";
  const tile = (n, l) => `<div class="stat-tile"><div class="stat-num">${n}</div><div class="stat-lbl">${l}</div></div>`;
  const periodRows = (obj, fmt) => Object.entries(obj).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 31).map(([k, c]) => `<div class="stat-row"><span>${fmt(k)}</span><b>${c}</b></div>`).join("") || `<div class="hint">Nessun dato.</div>`;
  const usersRows = () => {
    const arr = [...stats];
    if (sort === "count") arr.sort((a, b) => (b.count || 0) - (a.count || 0));
    else if (sort === "last") arr.sort((a, b) => (((b.lastAccess && b.lastAccess.seconds) || 0) - ((a.lastAccess && a.lastAccess.seconds) || 0)));
    else arr.sort((a, b) => (a.email || a.uid).localeCompare(b.email || b.uid));
    return arr.map((u) => `<div class="stat-row"><span>${escapeHtml(u.email || u.uid)}<br><small style="color:var(--text-soft)">ultimo: ${fmtTs(u.lastAccess)}</small></span><b>${u.count || 0}</b></div>`).join("");
  };
  const LABELS = { utenti: "Utenti", giorno: "Giorno", settimana: "Settimana", mese: "Mese" };
  const draw = () => {
    let list;
    if (view === "utenti") list = `<div style="margin-bottom:8px"><select id="accSort" class="mini-select"><option value="count">Più accessi</option><option value="last">Ultimo accesso</option><option value="name">Nome</option></select></div>${usersRows()}`;
    else if (view === "giorno") list = periodRows(dayTot, fmtDay) + (undated ? `<div class="stat-row"><span style="color:var(--text-soft)">Precedenti (non datati)</span><b>${undated}</b></div>` : "");
    else if (view === "settimana") list = periodRows(weekTot, (w) => "sett. " + fmtDay(w));
    else list = periodRows(monthTot, fmtMonth);
    body.innerHTML = `
      <div class="stat-tiles">${tile(stats.length, "utenti")}${tile(totalAll, "accessi")}</div>
      <div class="stat-tiles">${tile(todayCount, "oggi")}${tile(thisWeek, "settimana")}${tile(thisMonth, "mese")}</div>
      <div class="seg">${Object.keys(LABELS).map((v) => `<button class="seg-btn ${view === v ? "is-on" : ""}" data-view="${v}">${LABELS[v]}</button>`).join("")}</div>
      <div class="stat-block">${list}</div>`;
    body.querySelectorAll(".seg-btn").forEach((b) => b.onclick = () => { view = b.dataset.view; draw(); });
    const ss = body.querySelector("#accSort");
    if (ss) { ss.value = sort; ss.onchange = () => { sort = ss.value; draw(); }; }
  };
  draw();
}

// (Admin) Invia una notifica push a tutti gli utenti per annunciare una novità.
function openBroadcast() {
  const latest = CHANGELOG.find((c) => !c.minor);
  const defBody = latest ? latest.items.join(" ") : "C'è una novità in Fornelli, dai un'occhiata!";
  let savedKey = ""; try { savedKey = localStorage.getItem("ricettario.adminKey") || ""; } catch (e) {}
  const m = openModal(`
    <h3 class="modal__title">📣 Avvisa tutti di una novità</h3>
    <p class="hint" style="margin-top:-6px">Invia una notifica push a tutti gli utenti iscritti, per invogliarli ad aprire l'app.</p>
    <div class="field"><label>Titolo</label><input type="text" id="bcTitle" value="Novità in Fornelli ✨" /></div>
    <div class="field"><label>Messaggio</label><textarea id="bcBody">${escapeHtml(defBody)}</textarea></div>
    <div class="field"><label>Chiave admin</label><input type="password" id="bcKey" value="${escapeHtml(savedKey)}" placeholder="la chiave segreta del worker" /></div>
    <div class="modal__actions"><button class="btn" data-act="cancel">Annulla</button><button class="btn btn--primary" data-act="send">Invia a tutti</button></div>
  `);
  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  m.el.querySelector('[data-act="send"]').onclick = async () => {
    const title = m.el.querySelector("#bcTitle").value.trim() || "Fornelli";
    const body = m.el.querySelector("#bcBody").value.trim();
    const key = m.el.querySelector("#bcKey").value.trim();
    if (!key) { toast("Inserisci la chiave admin", "error"); return; }
    if (!PUSH_WORKER_URL) { toast("Le push non sono configurate", "error"); return; }
    try { localStorage.setItem("ricettario.adminKey", key); } catch (e) {}
    const btn = m.el.querySelector('[data-act="send"]'); btn.disabled = true; btn.textContent = "Invio…";
    try {
      const res = await fetch(PUSH_WORKER_URL.replace(/\/$/, "") + "/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ title, body })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const j = await res.json();
      m.close();
      toast(`Notifica inviata a ${j.sent} utenti`, "success");
    } catch (e) {
      toast("Invio non riuscito (chiave errata o worker da aggiornare).", "error");
      btn.disabled = false; btn.textContent = "Invia a tutti";
    }
  };
}

// Convertitore da cucina: quantità (tazze/cucchiai/ml/g) e temperatura.
function openConverter() {
  const U = { cucchiaino: 5, cucchiaio: 15, tazza: 240, bicchiere: 200, ml: 1, cl: 10, dl: 100, l: 1000, g: 1, kg: 1000 };
  const opts = Object.keys(U).map((u) => `<option value="${u}">${u}</option>`).join("");
  const m = openModal(`
    <h3 class="modal__title">${iconHtml("jar")} Convertitore</h3>
    <div class="field">
      <label>Quantità</label>
      <div class="conv-line">
        <input type="text" id="cvAmt" inputmode="decimal" value="1" />
        <select id="cvFrom" class="mini-select">${opts}</select>
        <span class="conv-arrow">→</span>
        <select id="cvTo" class="mini-select">${opts}</select>
      </div>
      <div id="cvRes" class="conv-res"></div>
      <div class="hint" style="margin-top:0">Per i liquidi 1 ml ≈ 1 g.</div>
    </div>
    <div class="field">
      <label>Temperatura</label>
      <div class="conv-line">
        <input type="text" id="cvT" inputmode="decimal" value="180" />
        <select id="cvTU" class="mini-select"><option value="C">°C → °F</option><option value="F">°F → °C</option></select>
      </div>
      <div id="cvTRes" class="conv-res"></div>
    </div>
    <div class="field">
      <label>1 tazza di… (circa)</label>
      <div class="hint" style="line-height:1.7;margin-top:0">Farina 120 g · Zucchero 200 g · Zucchero a velo 130 g · Riso 190 g · Burro 225 g · Cacao 100 g · Latte/acqua 240 g</div>
    </div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>
  `);
  m.el.querySelector("#cvFrom").value = "tazza";
  m.el.querySelector("#cvTo").value = "g";
  const round = (n) => Math.round(n * 100) / 100;
  const calc = () => {
    const a = parseFloat((m.el.querySelector("#cvAmt").value || "").replace(",", ".")) || 0;
    const f = U[m.el.querySelector("#cvFrom").value], t = U[m.el.querySelector("#cvTo").value];
    m.el.querySelector("#cvRes").textContent = `= ${round(a * f / t)} ${m.el.querySelector("#cvTo").value}`;
  };
  const calcT = () => {
    const v = parseFloat((m.el.querySelector("#cvT").value || "").replace(",", ".")) || 0;
    const mode = m.el.querySelector("#cvTU").value;
    const r = mode === "C" ? v * 9 / 5 + 32 : (v - 32) * 5 / 9;
    m.el.querySelector("#cvTRes").textContent = `= ${Math.round(r * 10) / 10} °${mode === "C" ? "F" : "C"}`;
  };
  m.el.querySelectorAll("#cvAmt,#cvFrom,#cvTo").forEach((e) => e.addEventListener("input", calc));
  m.el.querySelectorAll("#cvT,#cvTU").forEach((e) => e.addEventListener("input", calcT));
  m.el.querySelector('[data-act="ok"]').onclick = m.close;
  calc(); calcT();
}

// Diario e statistiche di cucina (dai dati già raccolti).
function openStats() {
  const recipes = store.getAllRecipes();
  const totalCooked = recipes.reduce((s, r) => s + (r.cookCount || 0), 0);
  const favs = recipes.filter((r) => r.favorite).length;
  const top = recipes.filter((r) => (r.cookCount || 0) > 0).sort((a, b) => (b.cookCount || 0) - (a.cookCount || 0)).slice(0, 5);
  const recent = store.getRecentCooked().slice(0, 5);
  const ingCount = {};
  recipes.forEach((r) => (r.ingredients || []).forEach((it) => {
    const n = (it.name || "").toLowerCase().trim();
    if (n) ingCount[n] = (ingCount[n] || 0) + 1;
  }));
  const topIng = Object.entries(ingCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const toolStats = store.getTools()
    .map((t) => ({ name: t.name, icon: t.icon, cooked: store.getRecipesByTool(t.id).reduce((s, r) => s + (r.cookCount || 0), 0), n: store.countRecipes(t.id) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.cooked - a.cooked || b.n - a.n);

  const stat = (num, lbl) => `<div class="stat-tile"><div class="stat-num">${num}</div><div class="stat-lbl">${lbl}</div></div>`;
  const listBlock = (title, items) => items.length
    ? `<div class="stat-block"><div class="stat-block__t">${title}</div>${items.join("")}</div>` : "";

  const fmtD = (ts) => { try { const d = new Date(ts); return isNaN(d) ? "" : d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" }); } catch (e) { return ""; } };
  const diary = store.getCookDiary(40);
  const topHtml = listBlock(`${iconHtml("fire")} Piatti più cucinati`, top.map((r) => `<div class="stat-row"><span>${escapeHtml(r.title)}</span><b>${r.cookCount}×</b></div>`));
  const recentHtml = diary.length
    ? listBlock(`${iconHtml("calendar-dots")} Cosa hai cucinato`, diary.map((e) => `<div class="stat-row"><span>${escapeHtml(e.title)}</span><b>${fmtD(e.ts)}</b></div>`))
    : listBlock(`${iconHtml("timer")} Cucinate di recente`, recent.map((r) => `<div class="stat-row"><span>${escapeHtml(r.title)}</span></div>`));
  const ingHtml = listBlock(`${iconHtml("list-bullets")} Ingredienti più usati`, topIng.map(([n, c]) => `<div class="stat-row"><span>${escapeHtml(n)}</span><b>${c}</b></div>`));
  const toolHtml = listBlock(`${iconHtml("cooking-pot")} Strumenti più usati`, toolStats.slice(0, 5).map((t) => `<div class="stat-row"><span>${iconHtml(t.icon)} ${escapeHtml(t.name)}</span><b>${t.cooked ? t.cooked + "×" : t.n + " ric."}</b></div>`));

  const m = openModal(`
    <h3 class="modal__title">${iconHtml("fire")} Diario di cucina</h3>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="btn btn--ghost" id="achBtn" style="flex:1">🏆 Traguardi</button>
      <button class="btn btn--ghost" id="calBtn" style="flex:1">📅 Calendario</button>
    </div>
    <div class="cl-scroll">
      <div class="stat-tiles">
        ${stat(recipes.length, recipes.length === 1 ? "ricetta" : "ricette")}
        ${stat(totalCooked, "volte ai fornelli")}
        ${stat(favs, favs === 1 ? "preferito" : "preferiti")}
      </div>
      ${!recipes.length ? `<div class="hint">Aggiungi ricette e segna \"cucinata\" per riempire il diario.</div>` : ""}
      ${topHtml}${recentHtml}${toolHtml}${ingHtml}
    </div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>
  `);
  m.el.querySelector('[data-act="ok"]').onclick = m.close;
  m.el.querySelector("#achBtn").onclick = openAchievements;
  m.el.querySelector("#calBtn").onclick = openCookCalendar;
  m.el.querySelectorAll(".stat-num").forEach((el) => countUp(el, parseInt(el.textContent, 10) || 0));
}

// Traguardi di cucina (badge sbloccati in base ai dati raccolti).
function computeCookStats() {
  const recipes = store.getAllRecipes();
  const tags = new Set();
  recipes.forEach((r) => (r.tags || []).forEach((t) => tags.add((t || "").toLowerCase())));
  const days = new Set();
  recipes.forEach((r) => (r.cookLog || []).forEach((ts) => { const d = String(ts).slice(0, 10); if (d) days.add(d); }));
  const sorted = [...days].sort();
  let streak = 0, max = 0, prev = null;
  for (const d of sorted) {
    if (prev && (new Date(d) - new Date(prev)) === 86400000) streak++; else streak = 1;
    prev = d; if (streak > max) max = streak;
  }
  return {
    totalRecipes: recipes.length,
    totalCooked: recipes.reduce((s, r) => s + (r.cookCount || 0), 0),
    favs: recipes.filter((r) => r.favorite).length,
    toolsUsed: new Set(recipes.map((r) => r.toolId)).size,
    distinctTags: tags.size,
    cookDays: days.size,
    maxStreak: max
  };
}
const ACHIEVEMENTS = [
  { e: "🍳", t: "Primi passi", d: "Salva la prima ricetta", test: (s) => s.totalRecipes >= 1 },
  { e: "📚", t: "Collezionista", d: "10 ricette salvate", test: (s) => s.totalRecipes >= 10 },
  { e: "🏆", t: "Gran ricettario", d: "25 ricette salvate", test: (s) => s.totalRecipes >= 25 },
  { e: "🔥", t: "Ai fornelli", d: "Cucina una ricetta", test: (s) => s.totalCooked >= 1 },
  { e: "👨‍🍳", t: "Cuoco esperto", d: "Cucina 10 volte", test: (s) => s.totalCooked >= 10 },
  { e: "⭐", t: "Maestro", d: "Cucina 50 volte", test: (s) => s.totalCooked >= 50 },
  { e: "❤️", t: "Affezionato", d: "5 ricette preferite", test: (s) => s.favs >= 5 },
  { e: "🧰", t: "Esploratore", d: "Usa 3 strumenti diversi", test: (s) => s.toolsUsed >= 3 },
  { e: "📅", t: "Costanza", d: "Cucina in 5 giorni", test: (s) => s.cookDays >= 5 },
  { e: "⚡", t: "Serie", d: "3 giorni di fila", test: (s) => s.maxStreak >= 3 },
  { e: "🌈", t: "Buongustaio", d: "5 categorie diverse", test: (s) => s.distinctTags >= 5 }
];
function openAchievements() {
  const s = computeCookStats();
  const items = ACHIEVEMENTS.map((a) => ({ a, ok: a.test(s) }));
  const unlocked = items.filter((x) => x.ok).length;
  const grid = items.map((x) => `<div class="ach ${x.ok ? "is-on" : ""}"><span class="ach__e">${x.a.e}</span><span class="ach__t">${escapeHtml(x.a.t)}</span><span class="ach__d">${escapeHtml(x.a.d)}</span>${x.ok ? "" : `<span class="ach__lock">🔒</span>`}</div>`).join("");
  const m = openModal(`
    <h3 class="modal__title">🏆 Traguardi</h3>
    <p class="hint" style="margin-top:-6px">${unlocked} di ${items.length} sbloccati</p>
    <div class="cl-scroll"><div class="ach-grid">${grid}</div></div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>
  `);
  m.el.querySelector('[data-act="ok"]').onclick = m.close;
  // Coriandoli quando ci sono nuovi traguardi sbloccati dall'ultima volta.
  try {
    const seen = parseInt(localStorage.getItem("ricettario.achSeen") || "0", 10);
    if (unlocked > seen) setTimeout(() => fxBurst(window.innerWidth / 2, window.innerHeight / 3, { emojis: ["🏆", "✨", "🎉"] }), 250);
    localStorage.setItem("ricettario.achSeen", String(unlocked));
  } catch (e) { /* ignora */ }
}

// Calendario del diario: i giorni in cui hai cucinato, con cosa.
function openCookCalendar() {
  const map = {};
  store.getAllRecipes().forEach((r) => (r.cookLog || []).forEach((ts) => { const d = String(ts).slice(0, 10); if (d) (map[d] = map[d] || []).push(r.title); }));
  const cur = new Date(); cur.setDate(1);
  const pad = (x) => String(x).padStart(2, "0");
  const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
  const m = openModal(`
    <h3 class="modal__title">📅 Calendario cucina</h3>
    <div id="calBody"></div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>
  `);
  m.el.querySelector('[data-act="ok"]').onclick = m.close;
  const body = m.el.querySelector("#calBody");
  const draw = () => {
    const y = cur.getFullYear(), mo = cur.getMonth();
    const startDow = (new Date(y, mo, 1).getDay() + 6) % 7;
    const ndays = new Date(y, mo + 1, 0).getDate();
    let cells = "";
    for (let i = 0; i < startDow; i++) cells += `<div class="cal-cell cal-cell--empty"></div>`;
    for (let d = 1; d <= ndays; d++) {
      const ds = `${y}-${pad(mo + 1)}-${pad(d)}`;
      const has = map[ds];
      cells += `<div class="cal-cell ${has ? "is-cooked" : ""}" ${has ? `data-day="${ds}"` : ""}>${d}${has ? `<span class="cal-dot"></span>` : ""}</div>`;
    }
    body.innerHTML = `
      <div class="cal-nav"><button class="aisle-btn" data-nav="-1">‹</button><span class="cal-title">${MESI[mo]} ${y}</span><button class="aisle-btn" data-nav="1">›</button></div>
      <div class="cal-dow">${["L", "M", "M", "G", "V", "S", "D"].map((x) => `<span>${x}</span>`).join("")}</div>
      <div class="cal-grid">${cells}</div>
      <div id="calDetail" class="hint" style="margin-top:8px;min-height:18px"></div>`;
    body.querySelectorAll("[data-nav]").forEach((b) => b.onclick = () => { cur.setMonth(cur.getMonth() + parseInt(b.dataset.nav, 10)); draw(); });
    body.querySelectorAll(".cal-cell.is-cooked").forEach((c) => c.onclick = () => {
      const dd = c.dataset.day.split("-");
      body.querySelector("#calDetail").textContent = `${dd[2]}/${dd[1]}: ${map[c.dataset.day].join(", ")}`;
    });
  };
  draw();
}

function openChangelog(entries, opts = {}) {
  const m = openModal(`
    <h3 class="modal__title">${opts.whatsNew ? "✨ Novità di Fornelli" : "Novità e modifiche"}</h3>
    ${opts.whatsNew ? `<p class="hint" style="margin-top:-6px;margin-bottom:6px">Cosa è cambiato con l'ultimo aggiornamento:</p>` : ""}
    <div class="cl-scroll">${changelogHtml(entries)}</div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Ho capito</button></div>
  `);
  m.el.querySelector('[data-act="ok"]').onclick = m.close;
}

export function navigate(route) {
  currentRoute = route;
  currentToolId = null;
  currentRecipeId = null;
  homeQuery = "";
  homeFilter = "";
  document.querySelectorAll(".bottom-nav__btn").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.route === route);
  });
  withTransition(() => render());
  window.scrollTo(0, 0);
}

function openTool(toolId) {
  currentToolId = toolId;
  currentRecipeId = null;
  withTransition(() => render());
  window.scrollTo(0, 0);
}

function openRecipe(recipeId) {
  const r = store.getRecipe(recipeId);
  currentRecipeId = recipeId;
  currentToolId = r ? r.toolId : currentToolId;
  detailServings = r && r.servings ? r.servings : null;
  // la schermata ricetta vive nella sezione "Strumenti"
  currentRoute = "strumenti";
  document.querySelectorAll(".bottom-nav__btn").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.route === "strumenti");
  });
  withTransition(() => render());
  window.scrollTo(0, 0);
}

export function render() {
  if (!root) return;
  // Schermata di login (gestita da app.js tramite renderLogin)
  if (loginMode) return; // login viene renderizzato a parte
  if (currentRoute === "strumenti") {
    if (currentRecipeId) renderRecipeDetail();
    else if (currentToolId) renderToolDetail();
    else renderStrumenti();
  } else if (currentRoute === "ricettario") {
    renderRicettario();
  } else if (currentRoute === "spesa") {
    renderShopping();
  } else if (currentRoute === "piano") {
    renderPlan();
  } else if (currentRoute === "impostazioni") {
    renderImpostazioni();
  }
}

// ---------------- Schermata: Strumenti ----------------
function recipeResultRow(r, i = 0) {
  const tool = store.getTool(r.toolId);
  const fav = r.favorite ? ` <span class="meta-fav">${iconHtml("heart")}</span>` : "";
  const rate = r.rating ? ` <span class="meta-star">${iconHtml("star")} ${r.rating}</span>` : "";
  const cooked = r.cookCount ? ` <span class="meta-cooked">${iconHtml("fire")} ${r.cookCount}</span>` : "";
  const thumb = r.photo ? `<img class="pick-thumb" src="${escapeHtml(r.photo)}" alt="" />` : `<span class="day-row__icon">${tool ? iconHtml(tool.icon) : iconHtml("fork-knife")}</span>`;
  return `<button class="pick-row stagger" data-id="${r.id}" style="--i:${i}">${thumb}<span class="day-row__name">${escapeHtml(r.title)}${fav}${rate}${cooked}</span></button>`;
}

function renderHomeBody() {
  const body = root.querySelector("#homeBody");
  if (!body) return;

  if (homeFilter === "menu") { renderMenusBody(body); return; }

  const searching = homeQuery.trim() || homeFilter;
  if (searching) {
    let results, emptyIcon = "magnifying-glass", emptyMsg = "Nessuna ricetta trovata.";
    if (homeQuery.trim()) results = store.searchRecipes(homeQuery);
    else if (homeFilter === "fav") { results = store.getFavorites(); emptyIcon = "heart"; emptyMsg = "Nessun preferito: tocca il cuore in una ricetta."; }
    else if (homeFilter === "cooked") { results = store.getMostCooked(); emptyIcon = "fire"; emptyMsg = "Nessuna ricetta ancora segnata come cucinata."; }
    else if (homeFilter === "recent") { results = store.getRecentCooked(); emptyIcon = "timer"; emptyMsg = "Niente cucinato di recente."; }
    else if (homeFilter === "season") { const m = currentMonth(); results = store.getAllRecipes().filter((r) => recipeSeasonalMatches(r, m).length); emptyIcon = "carrot"; emptyMsg = `Nessuna ricetta con ingredienti di stagione a ${monthName(m)}.`; }
    else if (homeFilter === "t15") { results = store.getAllRecipes().filter((r) => r.time && r.time <= 15); emptyIcon = "timer"; emptyMsg = "Nessuna ricetta entro 15 minuti. Aggiungi il tempo nelle ricette (modifica)."; }
    else if (homeFilter === "t30") { results = store.getAllRecipes().filter((r) => r.time && r.time <= 30); emptyIcon = "timer"; emptyMsg = "Nessuna ricetta entro 30 minuti. Aggiungi il tempo nelle ricette (modifica)."; }
    else if (homeFilter === "easy") { results = store.getAllRecipes().filter((r) => r.difficulty === 1); emptyIcon = "fire"; emptyMsg = "Nessuna ricetta facile. Segna la difficoltà nelle ricette (modifica)."; }
    else if (homeFilter === "ng") { results = store.getAllRecipes().filter((r) => !(r.allergens || []).includes("Glutine")); emptyIcon = "carrot"; emptyMsg = "Nessuna ricetta senza glutine. Segna gli allergeni nelle ricette (modifica)."; }
    else if (homeFilter === "nl") { results = store.getAllRecipes().filter((r) => !(r.allergens || []).includes("Lattosio")); emptyIcon = "carrot"; emptyMsg = "Nessuna ricetta senza lattosio. Segna gli allergeni nelle ricette (modifica)."; }
    else results = store.getByTag(homeFilter);
    body.innerHTML = results.length
      ? results.map((r, i) => recipeResultRow(r, i)).join("")
      : `<div class="empty"><span class="empty__emoji">${iconHtml(emptyIcon)}</span>${emptyMsg}</div>`;
    body.querySelectorAll(".pick-row").forEach((b) => b.addEventListener("click", () => openRecipe(b.dataset.id)));
    return;
  }

  const tools = store.getTools();
  const cards = tools
    .map((t, i) => {
      const n = store.countRecipes(t.id);
      return `
      <button class="tool-card stagger" data-tool="${t.id}" style="--ac:${ACCENTS[i % ACCENTS.length]};--i:${i}">
        <span class="tool-card__emoji">${iconHtml(t.icon)}</span>
        <span class="tool-card__name">${escapeHtml(t.name)}</span>
        <span class="tool-card__count">${n} ${n === 1 ? "ricetta" : "ricette"}</span>
      </button>`;
    })
    .join("");
  body.innerHTML = `<div class="tool-grid">${cards}
    <button class="add-card stagger" id="addTool" style="--i:${tools.length}">
      <span class="add-card__plus">${iconHtml("plus")}</span>
      <span>Aggiungi strumento</span>
    </button></div>`;
  body.querySelectorAll(".tool-card").forEach((c) => c.addEventListener("click", () => openTool(c.dataset.tool)));
  body.querySelector("#addTool").addEventListener("click", () => openToolForm());
}

function renderStrumenti() {
  const tools = store.getTools();
  const info = handlers.getAccountInfo();
  const banner =
    !info.configured
      ? `<div class="banner">💡 <div>Stai usando il salvataggio <b>solo su questo telefono</b>. Per attivare il <b>backup nel cloud</b> apri <b>Impostazioni</b>.</div></div>`
      : "";

  const total = tools.reduce((s, t) => s + store.countRecipes(t.id), 0);
  const allTags = store.getAllTags();
  const voiceOK = ("webkitSpeechRecognition" in window) || ("SpeechRecognition" in window);

  // Ricetta del giorno: stabile nell'arco della giornata (cambia ogni giorno).
  const allR = store.getAllRecipes();
  let rotdCard = "";
  if (allR.length) {
    const n = new Date();
    const seed = n.getFullYear() * 1000 + (n.getMonth() * 31 + n.getDate());
    const rotd = allR[seed % allR.length];
    rotdCard = `<button class="rotd" data-recipe="${rotd.id}">
        ${rotd.photo ? `<img class="rotd__img" src="${escapeHtml(rotd.photo)}" alt="" />` : `<span class="rotd__ph">${iconHtml("fork-knife")}</span>`}
        <span class="rotd__grad"></span>
        <span class="rotd__body"><span class="rotd__lbl">${iconHtml("sparkle")} Ricetta del giorno</span><span class="rotd__title">${escapeHtml(rotd.title)}</span></span>
      </button>`;
  }

  // Oggi si mangia
  const today = store.getPlanByDate(todayStr()).filter((e) => store.getRecipe(e.recipeId));
  const todayCard = today.length
    ? `<div class="today-card">
        <div class="today__h">${iconHtml("calendar-dots")} Oggi si mangia</div>
        ${today.map((e) => {
          const r = store.getRecipe(e.recipeId);
          const slot = e.slot ? `<span class="today__slot">${e.slot === "pranzo" ? "Pranzo" : "Cena"}</span>` : "";
          return `<button class="today__item" data-recipe="${r.id}">${slot}<span class="today__name">${escapeHtml(r.title)}</span>${iconHtml("caret-right")}</button>`;
        }).join("")}
      </div>`
    : "";

  // Avviso scadenze
  const exp = store.getExpiringPantry(3);
  const expBanner = exp.length
    ? `<button class="alert-banner" id="expAlert">${iconHtml("basket")} <span>${exp.length} ${exp.length === 1 ? "alimento in scadenza" : "alimenti in scadenza"} — controlla la dispensa</span></button>`
    : "";

  // "Usa prima che scada": ricette che sfruttano gli alimenti in scadenza
  const useFirst = exp.length ? store.recipesForExpiring(3).slice(0, 4) : [];
  const useFirstCard = useFirst.length
    ? `<div class="today-card">
        <div class="today__h">${iconHtml("basket")} Usa prima che scada</div>
        ${useFirst.map((r) => `<button class="today__item" data-recipe="${r.id}"><span class="today__name">${escapeHtml(r.title)}</span>${iconHtml("caret-right")}</button>`).join("")}
      </div>`
    : "";

  // Di stagione: prodotti del mese corrente (sezione informativa + filtro).
  const sMonth = currentMonth();
  const produce = seasonalProduce(sMonth);
  const seasonCard = produce.length
    ? `<div class="today-card season-card">
        <div class="today__h">${iconHtml("carrot")} Di stagione a ${monthName(sMonth)}</div>
        <div class="season-row">${produce.map((p) => `<span class="season-chip">${p.emoji} ${escapeHtml(p.name)}</span>`).join("")}</div>
      </div>`
    : "";

  const specials = [
    { k: "season", label: "Di stagione", icon: "carrot" },
    { k: "fav", label: "Preferiti", icon: "heart" },
    { k: "cooked", label: "Più cucinate", icon: "fire" },
    { k: "recent", label: "Di recente", icon: "timer" },
    { k: "t15", label: "≤15 min", icon: "timer" },
    { k: "t30", label: "≤30 min", icon: "timer" },
    { k: "easy", label: "Facili", icon: "fire" },
    { k: "ng", label: "Senza glutine", icon: "carrot" },
    { k: "nl", label: "Senza lattosio", icon: "carrot" },
    { k: "menu", label: "Menu", icon: "book-bookmark" }
  ];
  const chips = specials.map((s) => `<button class="filter-chip ${homeFilter === s.k ? "is-on" : ""}" data-filter="${s.k}">${iconHtml(s.icon)} ${s.label}</button>`).join("") +
    allTags.map((t) => `<button class="filter-chip ${homeFilter === t ? "is-on" : ""}" data-filter="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("");

  root.innerHTML = `
    <h1 class="page-title">${greeting()}${getNickname() ? " " + escapeHtml(getNickname()) : ""}! 👋</h1>
    ${rotdCard}
    <div class="home-hero">
      <div>
        <div class="home-hero__num" id="heroNum">${total}</div>
        <div class="home-hero__lbl">${total === 1 ? "ricetta salvata" : "ricette salvate"}</div>
      </div>
      <button class="home-hero__btn" id="heroAdd">${iconHtml("plus")} Nuova ricetta</button>
    </div>
    ${expBanner}
    ${useFirstCard}
    ${todayCard}
    ${seasonCard}
    ${banner}
    <div class="search-bar">
      <input type="search" id="homeSearch" placeholder="Cerca tra le tue ricette..." value="${escapeHtml(homeQuery)}" />
      ${voiceOK ? `<button class="btn mic-btn" id="homeMic" title="Cerca a voce" aria-label="Cerca a voce">🎤</button>` : ""}
    </div>
    ${total ? `<button class="btn btn--block" id="surpriseBtn" style="margin:4px 0 12px">${iconHtml("shuffle")} Cosa cucino oggi?</button>` : ""}
    <div class="home-tags">${chips}</div>
    <div id="homeBody"></div>
  `;

  root.querySelector("#heroAdd").addEventListener("click", () => openRecipeForm({}));
  const ea = root.querySelector("#expAlert");
  if (ea) ea.addEventListener("click", () => { shopTab = "dispensa"; navigate("spesa"); });
  root.querySelectorAll(".today__item").forEach((b) => b.addEventListener("click", () => openRecipe(b.dataset.recipe)));
  const rotdEl = root.querySelector(".rotd");
  if (rotdEl) rotdEl.addEventListener("click", () => openRecipe(rotdEl.dataset.recipe));

  const search = root.querySelector("#homeSearch");
  search.addEventListener("input", () => {
    homeQuery = search.value; homeFilter = "";
    root.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("is-on"));
    renderHomeBody();
  });
  root.querySelectorAll(".filter-chip").forEach((c) => c.addEventListener("click", () => {
    homeFilter = homeFilter === c.dataset.filter ? "" : c.dataset.filter; homeQuery = "";
    renderStrumenti();
  }));

  const surprise = root.querySelector("#surpriseBtn");
  if (surprise) surprise.addEventListener("click", () => {
    const all = store.getAllRecipes();
    if (!all.length) { toast("Aggiungi prima qualche ricetta", "error"); return; }
    const r = all[Math.floor(Math.random() * all.length)];
    fxBurstFrom(surprise, { emojis: ["🍽️", "🎲", "✨"] });
    setTimeout(() => openRecipe(r.id), 130);
  });

  const mic = root.querySelector("#homeMic");
  if (mic) mic.addEventListener("click", () => startVoiceSearch());

  renderHomeBody();
  countUp(root.querySelector("#heroNum"), total);
}

// Ricerca vocale (it-IT): detta il termine, l'app cerca tra le ricette.
function startVoiceSearch() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  const mic = root.querySelector("#homeMic");
  const rec = new SR();
  rec.lang = "it-IT";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  if (mic) mic.classList.add("is-listening");
  rec.onresult = (e) => {
    const text = ((e.results[0] && e.results[0][0] && e.results[0][0].transcript) || "").trim();
    if (text) { homeQuery = text; homeFilter = ""; renderStrumenti(); }
  };
  rec.onerror = (e) => { if (e && e.error !== "aborted" && e.error !== "no-speech") toast("Non ho capito, riprova", "error"); };
  rec.onend = () => { const m = root.querySelector("#homeMic"); if (m) m.classList.remove("is-listening"); };
  try { rec.start(); } catch (e) { /* già in ascolto */ }
}

// ---------------- Schermata: dettaglio strumento ----------------
function renderToolDetail() {
  const tool = store.getTool(currentToolId);
  if (!tool) { currentToolId = null; return renderStrumenti(); }
  const recipes = store.getRecipesByTool(tool.id);

  const list = recipes.length
    ? recipes
        .map((r, i) => {
          const meta = [];
          if (r.favorite) meta.push(`<span class="meta-fav">${iconHtml("heart")}</span>`);
          if (r.rating) meta.push(`<span class="meta-star">${iconHtml("star")} ${r.rating}</span>`);
          if (r.ingredients && r.ingredients.length) meta.push(`${iconHtml("list-bullets")} ${r.ingredients.length} ingr.`);
          if (r.servings) meta.push(`${iconHtml("fork-knife")} per ${r.servings}`);
          if (r.time) meta.push(`${iconHtml("timer")} ${r.time} min`);
          if (r.difficulty) meta.push(`${iconHtml("fire")} ${diffLabel(r.difficulty)}`);
          if (safeUrl(r.url)) meta.push(iconHtml("link-simple"));
          if (r.notes) meta.push(iconHtml("note-pencil"));
          const metaHtml = meta.length
            ? `<div class="recipe-item__meta">${meta.join('<span class="dot">·</span>')}</div>`
            : "";
          return `
          <div class="recipe-item recipe-item--tap stagger ${r.photo ? "has-thumb" : ""}" data-recipe="${r.id}" style="--i:${i}">
            ${r.photo ? `<img class="recipe-thumb" src="${escapeHtml(r.photo)}" alt="" />` : ""}
            <div class="recipe-item__main">
              <div class="recipe-item__top">
                <h3 class="recipe-item__title">${escapeHtml(r.title)}</h3>
                <div class="recipe-item__actions">
                  <button class="icon-btn" data-act="edit" title="Modifica">${iconHtml("pencil-simple")}</button>
                  <button class="icon-btn icon-btn--danger" data-act="del" title="Elimina">${iconHtml("trash")}</button>
                </div>
              </div>
              ${metaHtml}
            </div>
          </div>`;
        })
        .join("")
    : `<div class="empty"><span class="empty__emoji">${iconHtml("note-pencil")}</span>Nessuna ricetta per ora.<br>Tocca <b>Aggiungi ricetta</b> per inserirne una.</div>`;

  root.innerHTML = `
    <div class="toolbar">
      <button class="back-btn" id="back">${iconHtml("arrow-left")}</button>
      <div class="toolbar__title"><span class="toolbar__icon" style="--ac:${ACCENTS[Math.max(0, store.getTools().findIndex((x) => x.id === tool.id)) % ACCENTS.length]}">${iconHtml(tool.icon)}</span> ${escapeHtml(tool.name)}</div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button class="btn btn--ghost" id="editTool">${iconHtml("pencil-simple")} Rinomina</button>
      <button class="btn btn--ghost" id="delTool" style="color:var(--danger)">${iconHtml("trash")} Elimina strumento</button>
    </div>
    <div>${list}</div>
    <button class="fab" id="addRecipe">${iconHtml("plus")} Aggiungi ricetta</button>
  `;

  root.querySelector("#back").addEventListener("click", () => { currentToolId = null; withTransition(() => render()); });
  root.querySelector("#addRecipe").addEventListener("click", () => openRecipeForm({ toolId: tool.id }));
  root.querySelector("#editTool").addEventListener("click", () => openToolForm(tool));
  root.querySelector("#delTool").addEventListener("click", async () => {
    const n = store.countRecipes(tool.id);
    const ok = await confirmDialog({
      title: "Eliminare lo strumento?",
      message: `"${tool.name}" e le sue ${n} ricette verranno eliminate definitivamente.`,
      confirmText: "Elimina",
      danger: true
    });
    if (ok) {
      await store.deleteTool(tool.id);
      currentToolId = null;
      toast("Strumento eliminato");
      render();
    }
  });

  root.querySelectorAll(".recipe-item").forEach((item) => {
    const id = item.dataset.recipe;
    item.addEventListener("click", () => openRecipe(id));
    item.querySelector('[data-act="edit"]').addEventListener("click", (e) => {
      e.stopPropagation();
      openRecipeForm({ recipe: store.getRecipe(id) });
    });
    item.querySelector('[data-act="del"]').addEventListener("click", async (e) => {
      e.stopPropagation();
      const r = store.getRecipe(id);
      const ok = await confirmDialog({
        title: "Eliminare la ricetta?",
        message: `"${r.title}" verrà eliminata.`,
        confirmText: "Elimina",
        danger: true
      });
      if (ok) { await store.deleteRecipe(id); toast("Ricetta eliminata"); render(); }
    });
  });
}

// Ricette simili: punteggio per strumento, tag e ingredienti in comune.
function similarRecipes(r, limit = 4) {
  const tags = new Set((r.tags || []).map((t) => (t || "").toLowerCase()));
  const ings = new Set((r.ingredients || []).map((i) => (i.name || "").toLowerCase()).filter(Boolean));
  const scored = [];
  for (const o of store.getAllRecipes()) {
    if (o.id === r.id) continue;
    let s = 0;
    if (o.toolId && o.toolId === r.toolId) s += 1;
    if (o.difficulty && o.difficulty === r.difficulty) s += 0.5;
    for (const t of (o.tags || [])) if (tags.has((t || "").toLowerCase())) s += 2;
    for (const i of (o.ingredients || [])) { const n = (i.name || "").toLowerCase(); if (n && ings.has(n)) s += 1; }
    if (s > 0) scored.push({ o, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.o);
}

// ---------------- Schermata: dettaglio ricetta ----------------
function renderRecipeDetail() {
  const r = store.getRecipe(currentRecipeId);
  if (!r) { currentRecipeId = null; return render(); }
  const tool = store.getTool(r.toolId);
  const ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];
  const steps = Array.isArray(r.steps) ? r.steps : [];
  const tagsArr = Array.isArray(r.tags) ? r.tags : [];
  const base = r.servings || null;
  if (detailServings == null) detailServings = base;
  const factor = base && detailServings ? detailServings / base : 1;
  const url = safeUrl(r.url);

  const stepper = ingredients.length
    ? `<div class="portions">
        <span class="portions__lbl">${iconHtml("fork-knife")} Porzioni</span>
        <div class="stepper">
          <button class="stepper__btn" id="pMinus" ${(detailServings || 1) <= 1 ? "disabled" : ""}>−</button>
          <span class="stepper__val" id="pVal">${detailServings || "—"}</span>
          <button class="stepper__btn" id="pPlus">+</button>
        </div>
      </div>${!base ? `<div class="hint">Imposta le porzioni nella ricetta (modifica) per ricalcolare le quantità.</div>` : ""}`
    : "";

  const pantryActive = store.getPantry().length > 0;
  const missingCount = pantryActive ? ingredients.filter((it) => !store.inPantry(it.name)).length : 0;
  const ingList = ingredients.length
    ? `<div class="ing-list">${ingredients
        .map((it, i) => {
          const miss = pantryActive && !store.inPantry(it.name);
          return `<div class="ing-row${miss ? " ing-row--missing" : ""}"><span class="ing-dot" style="--ac:${ACCENTS[i % ACCENTS.length]}"></span><span class="ing-row__txt">${escapeHtml(ingredientText(it, factor))}</span>${miss ? `<span class="ing-miss">manca</span>` : ""}</div>`;
        })
        .join("")}</div>
       <button class="btn btn--primary btn--block" id="addToCart" style="margin-top:14px">${iconHtml("shopping-cart-simple")} Aggiungi alla lista della spesa</button>
       ${missingCount ? `<button class="btn btn--block" id="addMissing" style="margin-top:8px">${iconHtml("basket")} Aggiungi solo i ${missingCount} mancanti</button>` : ""}
       <button class="btn btn--block" id="guestMode" style="margin-top:8px">${iconHtml("users-three")} Modalità ospiti</button>`
    : `<div class="hint">Nessun ingrediente salvato. Aggiungili con <b>Modifica</b>.</div>`;

  const ratingRow = `<div class="rating" id="rating">${[1, 2, 3, 4, 5]
    .map((v) => `<button class="star ${v <= (r.rating || 0) ? "is-on" : ""}" data-v="${v}">${iconHtml("star")}</button>`)
    .join("")}</div>`;

  // Costo stimato (scala con le porzioni) e sostituzioni ingredienti.
  const cost = ingredients.length ? estimateCost(ingredients) : { counted: 0 };
  const costCard = cost.counted ? `<div class="section-card">
      <h3 class="section-title">${iconHtml("basket")} Costo stimato</h3>
      <div class="nutri-box">
        ${base ? `<div class="nutri-row"><span class="nutri-lbl">A porzione</span><span class="nutri-val"><b>€ ${(cost.total / base).toFixed(2)}</b></span></div>` : ""}
        <div class="nutri-row"><span class="nutri-lbl">Totale${detailServings ? ` (${detailServings} porz.)` : ""}</span><span class="nutri-val"><b>€ ${(cost.total * factor).toFixed(2)}</b></span></div>
      </div>
      <div class="hint" style="margin-top:6px">Stima su ${cost.counted}${cost.counted < cost.total_n ? ` di ${cost.total_n}` : ""} ingredienti · prezzi indicativi.</div>
    </div>` : "";
  const subs = ingredients.length ? findSubstitutions(ingredients) : [];
  const subsCard = subs.length ? `<div class="section-card">
      <h3 class="section-title">${iconHtml("shuffle")} Sostituzioni</h3>
      <div class="subs-list">${subs.map((s) => `<div class="subs-row"><b>${escapeHtml(s.name)}</b> → ${escapeHtml(s.sub)}</div>`).join("")}</div>
    </div>` : "";
  const wineCard = SPOONACULAR_ENABLED ? `<div class="section-card" id="wineCard">
      <h3 class="section-title">🍷 Vino consigliato</h3>
      <div id="wineBody"><button class="btn btn--ghost btn--block" id="wineBtn">Suggerisci un vino</button></div>
    </div>` : "";

  root.innerHTML = `
    <div class="toolbar">
      <button class="back-btn" id="back">${iconHtml("arrow-left")}</button>
      <div class="toolbar__title" style="flex:1">${r.photo ? "" : escapeHtml(r.title)}</div>
      <button class="back-btn fav-btn ${r.favorite ? "is-fav" : ""}" id="favBtn" title="Preferito">${iconHtml("heart")}</button>
    </div>
    ${r.photo ? `<div class="recipe-hero"><img src="${escapeHtml(r.photo)}" alt="" /><div class="recipe-hero__grad"></div><h2 class="recipe-hero__title">${escapeHtml(r.title)}</h2></div>` : ""}
    <div class="detail-top">
      ${tool ? `<span class="recipe-tool-chip" style="margin:0">${iconHtml(tool.icon)} ${escapeHtml(tool.name)}</span>` : "<span></span>"}
      ${ratingRow}
    </div>
    ${(() => { const sh = recipeSeasonalMatches(r, currentMonth()); return sh.length ? `<div class="tag-row"><span class="tagchip tagchip--season">${iconHtml("carrot")} Di stagione · ${sh.slice(0, 3).map((p) => escapeHtml(p.name)).join(", ")}</span></div>` : ""; })()}
    ${(tagsArr.length || r.time || r.difficulty) ? `<div class="tag-row">${r.time ? `<span class="tagchip tagchip--ro">${iconHtml("timer")} ${r.time} min</span>` : ""}${r.difficulty ? `<span class="tagchip tagchip--ro">${iconHtml("fire")} ${diffLabel(r.difficulty)}</span>` : ""}${tagsArr.map((t) => `<span class="tagchip tagchip--ro">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
    ${Array.isArray(r.allergens) && r.allergens.length ? `<div class="tag-row">${r.allergens.map((a) => `<span class="tagchip tagchip--allerg">⚠ ${escapeHtml(a)}</span>`).join("")}</div>` : ""}
    ${url ? `<a class="btn btn--block" id="openLink" href="${escapeHtml(url)}" target="_blank" rel="noopener" style="margin-bottom:16px">${iconHtml("arrow-square-out")} Apri la ricetta</a>` : ""}

    <div class="section-card">
      <h3 class="section-title">${iconHtml("list-bullets")} Ingredienti</h3>
      ${stepper}
      ${ingList}
    </div>

    ${ingredients.length ? `<div class="section-card" id="nutriCard">${nutritionCardHtml(r, base, detailServings)}</div>` : ""}

    ${costCard}
    ${subsCard}
    ${wineCard}

    ${steps.length ? `<div class="section-card">
      <h3 class="section-title">${iconHtml("fork-knife")} Preparazione</h3>
      <ol class="steps-list">${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
      <button class="btn btn--primary btn--block" id="cookBtn" style="margin-top:6px">${iconHtml("fire")} Modalità cucina</button>
    </div>` : ""}

    ${r.notes ? `<div class="section-card"><h3 class="section-title">${iconHtml("note-pencil")} Note</h3><div class="recipe-item__notes" style="margin-top:0">${escapeHtml(r.notes)}</div></div>` : ""}

    ${(() => { const sim = similarRecipes(r); return sim.length ? `<div class="section-card">
      <h3 class="section-title">${iconHtml("sparkle")} Ti potrebbe piacere</h3>
      <div class="sim-row">${sim.map((s) => `<button class="sim-card" data-sim="${s.id}">${s.photo ? `<img src="${escapeHtml(s.photo)}" alt="" loading="lazy" />` : `<span class="sim-card__ph">${iconHtml("fork-knife")}</span>`}<span class="sim-card__t">${escapeHtml(s.title)}</span></button>`).join("")}</div>
    </div>` : ""; })()}

    <div class="section-card">
      <h3 class="section-title">${iconHtml("image")} Le mie creazioni</h3>
      <div class="gallery">
        ${(Array.isArray(r.gallery) ? r.gallery : []).map((g, i) => `<div class="gallery__item"><img src="${escapeHtml(g)}" data-gi="${i}" alt="" /><button class="gallery__del" data-del="${i}" title="Elimina">✕</button></div>`).join("")}
        <button class="gallery__add" id="galAdd">${iconHtml("image")}<span>Aggiungi foto</span></button>
      </div>
      <input type="file" id="galFile" accept="image/*" capture="environment" hidden />
    </div>

    <button class="btn btn--block" id="cookedBtn" style="margin-bottom:10px">${iconHtml("fire")} Segna come cucinata${r.cookCount ? ` · ${r.cookCount} ${r.cookCount === 1 ? "volta" : "volte"}` : ""}</button>
    <button class="btn btn--block" id="shareImg" style="margin-bottom:10px">${iconHtml("image")} Condividi come immagine</button>
    <button class="btn btn--block" id="qrBtn" style="margin-bottom:10px">${iconHtml("qr-code")} Mostra codice QR</button>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="btn btn--ghost" id="editRecipe">${iconHtml("pencil-simple")} Modifica</button>
      <button class="btn btn--ghost" id="shareRecipe">${iconHtml("arrow-square-out")} Condividi</button>
      <button class="btn btn--ghost" id="delRecipe" style="color:var(--danger)">${iconHtml("trash")} Elimina</button>
    </div>
  `;

  root.querySelector("#back").addEventListener("click", () => { currentRecipeId = null; detailServings = null; withTransition(() => render()); });

  // Parallax/zoom della foto hero mentre si scorre (si auto-rimuove uscendo).
  const heroEl = root.querySelector(".recipe-hero");
  if (heroEl && !reduceMotion) {
    const heroImg = heroEl.querySelector("img");
    const onHeroScroll = () => {
      if (!document.body.contains(heroEl)) { window.removeEventListener("scroll", onHeroScroll); return; }
      const y = Math.max(0, window.scrollY || window.pageYOffset || 0);
      heroImg.style.transform = `scale(${1 + Math.min(y, 320) * 0.0007}) translateY(${Math.min(y, 320) * 0.08}px)`;
    };
    window.addEventListener("scroll", onHeroScroll, { passive: true });
  }
  const pMinus = root.querySelector("#pMinus");
  const pPlus = root.querySelector("#pPlus");
  if (pMinus) pMinus.addEventListener("click", () => { detailServings = Math.max(1, (detailServings || base || 1) - 1); render(); });
  if (pPlus) pPlus.addEventListener("click", () => { detailServings = (detailServings || base || 1) + 1; render(); });

  root.querySelector("#favBtn").addEventListener("click", (e) => {
    if (!r.favorite) { fxBurstFrom(e.currentTarget, { emojis: ["❤️", "💛", "✨"] }); haptic(15); }
    store.updateRecipe(r.id, { favorite: !r.favorite });
  });
  root.querySelectorAll("#rating .star").forEach((st) => st.addEventListener("click", () => {
    const v = parseInt(st.dataset.v, 10);
    store.updateRecipe(r.id, { rating: v === r.rating ? 0 : v });
  }));

  const addToCart = root.querySelector("#addToCart");
  if (addToCart) addToCart.addEventListener("click", async () => {
    const items = ingredients.map((it) => ({
      name: it.name,
      unit: it.unit || "",
      qty: it.qty != null ? it.qty * factor : null,
      category: categorize(it.name)
    }));
    const res = await store.addShoppingItems(items);
    toast(shoppingToast(res), "success");
  });

  const addMissing = root.querySelector("#addMissing");
  if (addMissing) addMissing.addEventListener("click", async () => {
    const items = ingredients
      .filter((it) => !store.inPantry(it.name))
      .map((it) => ({ name: it.name, unit: it.unit || "", qty: it.qty != null ? it.qty * factor : null, category: categorize(it.name) }));
    if (!items.length) { toast("Hai già tutto in dispensa", "success"); return; }
    const res = await store.addShoppingItems(items);
    toast(shoppingToast(res), "success");
  });

  const guestModeBtn = root.querySelector("#guestMode");
  if (guestModeBtn) guestModeBtn.addEventListener("click", () => openGuestMode(r, base, ingredients));

  root.querySelectorAll("[data-sim]").forEach((b) => b.addEventListener("click", () => openRecipe(b.dataset.sim)));

  const cookBtn = root.querySelector("#cookBtn");
  if (cookBtn) cookBtn.addEventListener("click", () => openCookingMode(r));

  root.querySelector("#cookedBtn").addEventListener("click", async (e) => { haptic(25); fxBurstFrom(e.currentTarget); await store.markCooked(r.id); toast("Segnata come cucinata 🔥", "success"); });

  // Galleria "Le mie creazioni"
  const galFile = root.querySelector("#galFile");
  const galAdd = root.querySelector("#galAdd");
  if (galAdd) galAdd.addEventListener("click", () => galFile.click());
  if (galFile) galFile.addEventListener("change", async () => {
    const f = galFile.files[0]; galFile.value = "";
    if (!f) return;
    try {
      const url = await fileToDataUrl(f);
      const gallery = [...(Array.isArray(r.gallery) ? r.gallery : []), url];
      await store.updateRecipe(r.id, { gallery });
      r.gallery = gallery;
      fxBurstFrom(galAdd, { emojis: ["📸", "✨"] });
      render();
    } catch (e) { toast("Foto non valida", "error"); }
  });
  root.querySelectorAll(".gallery__item img[data-gi]").forEach((img) => img.addEventListener("click", () => {
    const m = openModal(`<img src="${escapeHtml(img.src)}" alt="" style="width:100%;border-radius:14px;display:block" /><div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>`);
    m.el.querySelector('[data-act="ok"]').onclick = m.close;
  }));
  root.querySelectorAll(".gallery__del").forEach((b) => b.addEventListener("click", async (e) => {
    e.stopPropagation();
    const i = parseInt(b.dataset.del, 10);
    const ok = await confirmDialog({ title: "Eliminare la foto?", confirmText: "Elimina", danger: true });
    if (ok) {
      const gallery = (Array.isArray(r.gallery) ? r.gallery : []).filter((_, j) => j !== i);
      await store.updateRecipe(r.id, { gallery });
      r.gallery = gallery;
      render();
    }
  }));

  const shareImgBtn = root.querySelector("#shareImg");
  if (shareImgBtn) shareImgBtn.addEventListener("click", async () => {
    const old = shareImgBtn.innerHTML;
    shareImgBtn.disabled = true;
    shareImgBtn.innerHTML = `${iconHtml("image")} Preparo l'immagine...`;
    try {
      const lines = ingredients.map((it) => ingredientText(it, factor));
      const res = await shareRecipeImage(r, tool ? tool.name : "", lines);
      if (res === "downloaded") toast("Immagine salvata", "success");
    } catch (e) { toast("Impossibile creare l'immagine", "error"); }
    shareImgBtn.disabled = false; shareImgBtn.innerHTML = old;
  });

  const qrBtn = root.querySelector("#qrBtn");
  if (qrBtn) qrBtn.addEventListener("click", () => openQr(r));

  const wineBtn = root.querySelector("#wineBtn");
  if (wineBtn) wineBtn.addEventListener("click", async () => {
    const wb = root.querySelector("#wineBody");
    wb.innerHTML = `<div class="hint" style="margin:0">Cerco l'abbinamento…</div>`;
    try {
      const w = await winePairing(await translateToEnglish(r.title));
      if (!w || (!w.text && !(w.wines || []).length)) { wb.innerHTML = `<div class="hint" style="margin:0">Nessun abbinamento trovato per questo piatto.</div>`; return; }
      const text = w.text ? await translateText(w.text) : "";
      wb.innerHTML = `${(w.wines && w.wines.length) ? `<div class="tag-row" style="margin-bottom:6px">${w.wines.slice(0, 5).map((x) => `<span class="tagchip tagchip--ro">🍷 ${escapeHtml(x)}</span>`).join("")}</div>` : ""}${text ? `<div class="hint" style="margin:0">${escapeHtml(text)}</div>` : ""}`;
    } catch (e) { wb.innerHTML = `<div class="hint" style="margin:0">Servizio non disponibile.</div>`; }
  });

  root.querySelector("#editRecipe").addEventListener("click", () => openRecipeForm({ recipe: r }));
  root.querySelector("#shareRecipe").addEventListener("click", async () => {
    const text = recipeShareText(r);
    try {
      if (navigator.share) await navigator.share({ title: r.title, text });
      else { await navigator.clipboard.writeText(text); toast("Ricetta copiata negli appunti", "success"); }
    } catch (e) { /* condivisione annullata */ }
  });
  root.querySelector("#delRecipe").addEventListener("click", async () => {
    const ok = await confirmDialog({ title: "Eliminare la ricetta?", message: `"${r.title}" verrà eliminata.`, confirmText: "Elimina", danger: true });
    if (ok) { await store.deleteRecipe(r.id); currentRecipeId = null; toast("Ricetta eliminata"); withTransition(() => render()); }
  });

  wireNutrition(r, base, detailServings);
}

// ---- Valori nutrizionali (stima dagli ingredienti) ----
// I valori salvati in r.nutrition sono i TOTALI della ricetta così com'è scritta
// (cioè per le porzioni base). Per porzione = totale / porzioni base; il totale
// mostrato si scala con lo stepper delle porzioni.
function macroLine(n) {
  return `<b>${n.kcal}</b> kcal · P ${n.p} g · C ${n.c} g · G ${n.f} g`;
}

function nutritionCardHtml(r, base, detailServings) {
  const title = `<h3 class="section-title">${iconHtml("carrot")} Valori nutrizionali</h3>`;
  const nut = r.nutrition;
  if (!nut) {
    return `${title}
      <div class="hint" style="margin-top:0">Stima calorie e macronutrienti dagli ingredienti.</div>
      <button class="btn btn--primary btn--block" id="nutriCalc" style="margin-top:10px">${iconHtml("sparkle")} Calcola (stima)</button>`;
  }
  const factor = base && detailServings ? detailServings / base : 1;
  const totalScaled = { kcal: Math.round(nut.kcal * factor), p: Math.round(nut.p * factor), c: Math.round(nut.c * factor), f: Math.round(nut.f * factor) };
  const perPortion = base ? { kcal: Math.round(nut.kcal / base), p: Math.round(nut.p / base), c: Math.round(nut.c / base), f: Math.round(nut.f / base) } : null;
  const rows = [];
  if (perPortion) rows.push(`<div class="nutri-row"><span class="nutri-lbl">Per porzione</span><span class="nutri-val">${macroLine(perPortion)}</span></div>`);
  rows.push(`<div class="nutri-row"><span class="nutri-lbl">Totale${detailServings ? ` (${detailServings} porz.)` : ""}</span><span class="nutri-val">${macroLine(totalScaled)}</span></div>`);
  const missing = Array.isArray(nut.skippedNames) ? nut.skippedNames : [];
  const note = `<div class="hint" style="margin-top:8px">Stima da ${nut.used} ingredienti${missing.length ? ` · ${missing.length} non conteggiati` : ""}.</div>`;
  const missList = missing.length
    ? `<div class="nutri-missing">Non conteggiati: ${missing.map((m) => escapeHtml(m)).join(", ")}.<br>Aggiungili nelle note o correggi la riga per migliorare la stima.</div>`
    : "";
  return `${title}
    <div class="nutri-box">${rows.join("")}</div>
    ${note}
    ${missList}
    <button class="btn btn--ghost btn--block" id="nutriCalc" style="margin-top:10px">${iconHtml("sparkle")} Ricalcola</button>`;
}

async function wireNutrition(r, base, detailServings) {
  const card = root.querySelector("#nutriCard");
  if (!card) return;
  const btn = card.querySelector("#nutriCalc");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const est = estimateNutrition(r.ingredients || []);
    if (est.used === 0 && est.offCandidates.length === 0) {
      toast("Nessun ingrediente riconosciuto per la stima", "error");
      return;
    }
    // Salva subito la stima offline.
    let result = est;
    // Se ci sono ingredienti non in tabella ma con peso noto, prova Open Food Facts.
    if (est.offCandidates.length && navigator.onLine !== false) {
      btn.disabled = true;
      btn.innerHTML = `${iconHtml("download-simple")} Cerco ${est.offCandidates.length} ingredienti online…`;
      try {
        const enriched = await enrichWithOFF(est, (done, tot) => {
          btn.innerHTML = `${iconHtml("download-simple")} Online ${done}/${tot}…`;
        });
        result = { total: enriched.total, used: enriched.used, skippedNames: enriched.stillMissing };
      } catch (e) {
        result = { total: est.total, used: est.used, skippedNames: est.skipped.map((s) => s.name) };
      }
      btn.disabled = false;
    } else {
      result = { total: est.total, used: est.used, skippedNames: est.skipped.map((s) => s.name) };
    }
    const nutrition = { ...result.total, used: result.used, skipped: result.skippedNames.length, skippedNames: result.skippedNames };
    await store.updateRecipe(r.id, { nutrition });
    r.nutrition = nutrition;
    fxBurstFrom(btn, { emojis: ["✨", "🥕"] });
    card.innerHTML = nutritionCardHtml(r, base, detailServings);
    wireNutrition(r, base, detailServings);
    toast("Valori nutrizionali stimati", "success");
  });
}

// Testo condivisibile di una ricetta.
function recipeShareText(r) {
  const lines = [r.title];
  if (r.servings) lines.push(`Per ${r.servings} persone`);
  if (r.ingredients && r.ingredients.length) {
    lines.push("", "Ingredienti:");
    r.ingredients.forEach((i) => lines.push("- " + (i.raw || ingredientText(i))));
  }
  if (r.steps && r.steps.length) {
    lines.push("", "Preparazione:");
    r.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }
  if (r.url) lines.push("", r.url);
  lines.push("", "— da Fornelli");
  return lines.join("\n");
}

// Codice QR di una ricetta: se ha un link, punta alla fonte; altrimenti
// contiene il testo essenziale (titolo + ingredienti) da leggere col telefono.
function openQr(r) {
  const url = safeUrl(r.url);
  let data, note;
  if (url) {
    data = url;
    note = "Inquadra col telefono per aprire la ricetta originale.";
  } else {
    const lines = [r.title];
    if (r.servings) lines.push(`Per ${r.servings} persone`);
    if (r.ingredients && r.ingredients.length) {
      lines.push("", "Ingredienti:");
      r.ingredients.forEach((i) => lines.push("- " + (i.raw || ingredientText(i))));
    }
    data = lines.join("\n").slice(0, 800);
    note = "Inquadra col telefono per leggere la ricetta.";
  }
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=12&data=${encodeURIComponent(data)}`;
  const m = openModal(`
    <h3 class="modal__title">${escapeHtml(r.title)}</h3>
    <p class="hint" style="margin-top:-8px;margin-bottom:12px">${note}</p>
    <div style="text-align:center"><img src="${src}" alt="Codice QR" style="width:260px;height:260px;max-width:100%;border-radius:14px;background:#fff;padding:10px;box-sizing:border-box" /></div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>
  `);
  m.el.querySelector('[data-act="ok"]').addEventListener("click", m.close);
}

// Modalità ospiti: scegli per quante persone cucini, adatta le dosi e
// (opzionale) aggiungi alla spesa le quantità già moltiplicate.
function openGuestMode(r, base, ingredients) {
  let n = detailServings || base || 4;
  const m = openModal(`
    <h3 class="modal__title">${iconHtml("users-three")} Modalità ospiti</h3>
    <p class="hint" style="margin-top:-8px;margin-bottom:14px">Per quante persone cucini "${escapeHtml(r.title)}"? Le dosi si adattano da sole.</p>
    <div class="portions" style="justify-content:center;margin-bottom:10px">
      <div class="stepper">
        <button class="stepper__btn" data-act="minus">−</button>
        <span class="stepper__val" id="gVal">${n}</span>
        <button class="stepper__btn" data-act="plus">+</button>
      </div>
    </div>
    <div class="hint" id="gInfo" style="text-align:center;min-height:1.2em"></div>
    <div class="modal__actions" style="flex-direction:column;gap:8px">
      <button class="btn btn--primary btn--block" data-act="apply">${iconHtml("fork-knife")} Adatta le dosi</button>
      <button class="btn btn--block" data-act="cart">${iconHtml("shopping-cart-simple")} Adatta e aggiungi alla spesa</button>
    </div>
  `);
  const valEl = m.el.querySelector("#gVal");
  const info = m.el.querySelector("#gInfo");
  const refresh = () => {
    valEl.textContent = n;
    if (base && ingredients.length) {
      const c = estimateCost(ingredients);
      const txt = c.counted ? ` · spesa stimata € ${(c.total / base * n).toFixed(2)}` : "";
      info.innerHTML = `Dosi da ${base} a <b>${n}</b> persone${txt}.`;
    } else {
      info.textContent = base ? "" : "Senza porzioni le dosi non si scalano, ma puoi aggiungere la spesa.";
    }
  };
  refresh();
  m.el.querySelector('[data-act="minus"]').addEventListener("click", () => { n = Math.max(1, n - 1); refresh(); });
  m.el.querySelector('[data-act="plus"]').addEventListener("click", () => { n = n + 1; refresh(); });
  m.el.querySelector('[data-act="apply"]').addEventListener("click", () => { detailServings = n; m.close(); render(); });
  m.el.querySelector('[data-act="cart"]').addEventListener("click", async () => {
    const factor = base ? n / base : 1;
    const items = ingredients.map((it) => ({ name: it.name, unit: it.unit || "", qty: it.qty != null ? it.qty * factor : null, category: categorize(it.name) }));
    detailServings = n;
    m.close();
    if (items.length) { const res = await store.addShoppingItems(items); toast(shoppingToast(res), "success"); }
    render();
  });
}

// Finestra per scegliere dove inserire il testo riconosciuto via OCR.
function openOcrChooser(text, form) {
  const om = openModal(`
    <h3 class="modal__title">Testo riconosciuto</h3>
    <p class="hint" style="margin-top:-8px;margin-bottom:10px">Controlla il testo e scegli dove inserirlo.</p>
    <div class="field"><textarea id="ocrText" rows="9">${escapeHtml(text)}</textarea></div>
    <div class="modal__actions">
      <button class="btn" data-act="ing">Negli ingredienti</button>
      <button class="btn btn--primary" data-act="steps">Nella preparazione</button>
    </div>
  `);
  const getText = () => om.el.querySelector("#ocrText").value;
  om.el.querySelector('[data-act="ing"]').onclick = () => { appendToField(form, "#rIngredients", getText()); om.close(); toast("Aggiunto agli ingredienti", "success"); };
  om.el.querySelector('[data-act="steps"]').onclick = () => { appendToField(form, "#rSteps", getText()); om.close(); toast("Aggiunto alla preparazione", "success"); };
}
function appendToField(form, sel, text) {
  const ta = form.el.querySelector(sel);
  if (!ta) return;
  ta.value = (ta.value.trim() ? ta.value.trim() + "\n" : "") + text.trim();
}

// Messaggio per gli aggiunti alla spesa (tenendo conto di ciò che è in dispensa).
function shoppingToast(res) {
  const n = res && typeof res === "object" ? res.added : res;
  const skipped = res && typeof res === "object" ? res.skipped : 0;
  let msg = `${n} ingredienti aggiunti alla spesa`;
  if (skipped) msg += ` · ${skipped} già in dispensa`;
  return msg;
}

// ---------------- Modalità cucina ----------------
// Estrae le durate citate in un passo (es. "10 minuti", "1 ora e 30", "mezz'ora").
function parseDurations(text) {
  let t = " " + String(text || "").toLowerCase() + " ";
  const mins = [];
  const seen = new Set();
  const push = (m) => { m = Math.round(m); if (m >= 1 && m <= 600 && !seen.has(m)) { seen.add(m); mins.push(m); } };
  t = t.replace(/(\d+)\s*or[ae]\s*(?:e\s*)?(\d+)\s*minut\w*/g, (_, a, b) => { push(+a * 60 + +b); return " "; });
  t = t.replace(/(\d+)\s*minut\w*/g, (_, a) => { push(+a); return " "; });
  t = t.replace(/(\d+)\s*min\b/g, (_, a) => { push(+a); return " "; });
  t = t.replace(/(\d+)\s*or[ae]\b/g, (_, a) => { push(+a * 60); return " "; });
  t = t.replace(/mezz['\s]?or[ae]/g, () => { push(30); return " "; });
  t = t.replace(/un['\s]?or[ae]/g, () => { push(60); return " "; });
  return mins.sort((a, b) => a - b);
}
function fmtDur(mins) {
  if (mins < 60) return mins + " min";
  const h = Math.floor(mins / 60), m = mins % 60;
  return h + "h" + (m ? " " + m : "");
}

function openCookingMode(recipe) {
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  if (!steps.length) return;
  let idx = 0;
  let wakeLock = null;
  let timers = []; // { id, label, remaining, running }
  let ticker = null;
  let tseq = 0;
  let speak = false; // lettura vocale
  let xl = localStorage.getItem("ricettario.cookXL") === "1"; // testo grande
  let voiceOn = false; // comandi vocali a mani libere
  let vrec = null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  const host = document.getElementById("modalRoot");
  const el = document.createElement("div");
  el.className = "cook";
  host.appendChild(el);

  function goNext() {
    if (idx < steps.length - 1) { idx++; draw(); speakStep(); }
    else { store.markCooked(recipe.id); close(); }
  }
  function goPrev() { if (idx > 0) { idx--; draw(); speakStep(); } }

  // Comandi vocali: avanti / indietro / timer N minuti / leggi.
  const NUMWORDS = { uno: 1, una: 1, un: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10, undici: 11, dodici: 12, quindici: 15, venti: 20, venticinque: 25, trenta: 30, quaranta: 40, quarantacinque: 45, sessanta: 60 };
  function handleVoiceCommand(text) {
    const t = (text || "").toLowerCase();
    if (/\b(avanti|prossim|continua|vai)\b/.test(t)) { goNext(); return; }
    if (/\b(indietro|precedent|torna)\b/.test(t)) { goPrev(); return; }
    if (/\b(leggi|ripeti)\b/.test(t)) { speak = true; speakStep(); return; }
    if (/\b(ferma|stop|basta|zitt)\b/.test(t)) { stopSpeak(); return; }
    const mt = t.match(/timer\D*(\d+)/) || t.match(/(\d+)\s*minut/);
    if (mt) { addTimer(parseInt(mt[1], 10), "Voce"); return; }
    const wm = t.match(/timer\s+([a-zà]+)/);
    if (wm && NUMWORDS[wm[1]]) { addTimer(NUMWORDS[wm[1]], "Voce"); return; }
  }
  function startVoice() {
    if (!SR) return;
    try {
      vrec = new SR();
      vrec.lang = "it-IT";
      vrec.continuous = true;
      vrec.interimResults = false;
      vrec.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) handleVoiceCommand(e.results[i][0].transcript); };
      vrec.onend = () => { if (voiceOn) { try { vrec.start(); } catch (e) {} } };
      vrec.onerror = (e) => { if (e && e.error === "not-allowed") { voiceOn = false; toast("Permesso microfono negato", "error"); draw(); } };
      vrec.start();
    } catch (e) { voiceOn = false; }
  }
  function stopVoice() { voiceOn = false; if (vrec) { try { vrec.stop(); } catch (e) {} vrec = null; } }
  function toggleVoice() {
    voiceOn = !voiceOn;
    if (voiceOn) { startVoice(); toast("Comandi vocali attivi: \"avanti\", \"indietro\", \"timer 10 minuti\"", "success"); }
    else stopVoice();
    draw();
  }

  function speakStep() {
    if (!speak || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(steps[idx]);
      u.lang = "it-IT";
      window.speechSynthesis.speak(u);
    } catch {}
  }
  function stopSpeak() { try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch {} }

  // Tieni acceso lo schermo, se supportato.
  async function lock() {
    try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request("screen"); } catch {}
  }
  function release() {
    try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch {}
  }
  document.addEventListener("visibilitychange", onVis);
  function onVis() { if (document.visibilityState === "visible" && !wakeLock) lock(); }
  lock();

  function fmt(s) { const m = Math.floor(s / 60); const ss = s % 60; return `${m}:${String(ss).padStart(2, "0")}`; }
  function ensureTicker() {
    const anyRunning = timers.some((t) => t.running);
    if (anyRunning && !ticker) ticker = setInterval(tickAll, 1000);
    else if (!anyRunning && ticker) { clearInterval(ticker); ticker = null; }
  }
  function tickAll() {
    for (const t of timers) {
      if (!t.running) continue;
      t.remaining--;
      if (t.remaining <= 0) { t.remaining = 0; t.running = false; beep(); toast(`⏰ ${t.label} finito!`, "success"); }
    }
    ensureTicker();
    paintTimers();
  }
  function addTimer(mins, label) {
    const m = Math.max(1, parseInt(mins, 10) || 0);
    timers.push({ id: ++tseq, label: (label || "").trim() || `Timer ${timers.length + 1}`, remaining: m * 60, running: true });
    ensureTicker();
    paintTimers();
  }
  function paintTimers() {
    const box = el.querySelector("#ckTimers");
    if (!box) return;
    if (!timers.length) { box.innerHTML = `<div class="cook__notim">Nessun timer attivo</div>`; return; }
    box.innerHTML = timers.map((t) => `<div class="ctimer ${t.remaining <= 0 ? "is-done" : ""}" data-id="${t.id}">
      <span class="ctimer__lbl">${escapeHtml(t.label)}</span>
      <span class="ctimer__time">${fmt(t.remaining)}</span>
      <button class="ctimer__btn" data-act="toggle">${t.running ? "⏸" : "▶"}</button>
      <button class="ctimer__btn" data-act="del">✕</button>
    </div>`).join("");
    box.querySelectorAll(".ctimer").forEach((row) => {
      const id = parseInt(row.dataset.id, 10);
      const t = timers.find((x) => x.id === id);
      row.querySelector('[data-act="toggle"]').onclick = () => { if (t.remaining <= 0) return; t.running = !t.running; ensureTicker(); paintTimers(); };
      row.querySelector('[data-act="del"]').onclick = () => { timers = timers.filter((x) => x.id !== id); ensureTicker(); paintTimers(); };
    });
  }
  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.type = "sine"; o.frequency.value = 880;
      o.start(); g.gain.setValueAtTime(0.3, ctx.currentTime);
      o.stop(ctx.currentTime + 0.6);
    } catch {}
  }

  function draw() {
    el.innerHTML = `
      <div class="cook__bar">
        <button class="cook__close" id="ckClose">${iconHtml("x")}</button>
        <div class="cook__progress">Passo ${idx + 1} di ${steps.length}</div>
        <button class="cook__close ${xl ? "is-on" : ""}" id="ckXL" title="Testo grande">Aa</button>
        ${SR ? `<button class="cook__close ${voiceOn ? "is-on" : ""}" id="ckVoice" title="Comandi vocali">🎤</button>` : ""}
        <button class="cook__close ${speak ? "is-on" : ""}" id="ckSpeak" title="Leggi ad alta voce">🔊</button>
      </div>
      <div class="cook__track"><div class="cook__fill" style="width:${((idx + 1) / steps.length) * 100}%"></div></div>
      <div class="cook__body"><div class="cook__step">${escapeHtml(steps[idx])}</div></div>
      <div class="cook__timers" id="ckTimers"></div>
      ${(() => { const ds = parseDurations(steps[idx]); return ds.length ? `<div class="cook__quick">${ds.map((d) => `<button class="chip" data-qmin="${d}">${iconHtml("timer")} ${fmtDur(d)}</button>`).join("")}</div>` : ""; })()}
      <div class="cook__addtimer">
        <input type="number" id="tMin" min="1" inputmode="numeric" value="5" />
        <input type="text" id="tName" placeholder="Nome (es. pasta)" />
        <button class="btn btn--primary" id="tAdd">${iconHtml("plus")} Timer</button>
      </div>
      <div class="cook__nav">
        <button class="btn btn--block" id="ckPrev" ${idx === 0 ? "disabled" : ""}>${iconHtml("caret-left")} Indietro</button>
        <button class="btn btn--primary btn--block" id="ckNext">${idx === steps.length - 1 ? "Fine " + iconHtml("check") : "Avanti " + iconHtml("caret-right")}</button>
      </div>
    `;
    el.classList.toggle("cook--xl", xl);
    el.querySelector("#ckClose").onclick = close;
    el.querySelector("#ckXL").onclick = () => { xl = !xl; try { localStorage.setItem("ricettario.cookXL", xl ? "1" : "0"); } catch {} el.classList.toggle("cook--xl", xl); el.querySelector("#ckXL").classList.toggle("is-on", xl); };
    el.querySelector("#ckSpeak").onclick = () => { speak = !speak; if (speak) speakStep(); else stopSpeak(); el.querySelector("#ckSpeak").classList.toggle("is-on", speak); };
    const ckVoice = el.querySelector("#ckVoice");
    if (ckVoice) ckVoice.onclick = toggleVoice;
    el.querySelector("#ckPrev").onclick = goPrev;
    el.querySelector("#ckNext").onclick = goNext;
    el.querySelector("#tAdd").onclick = () => { addTimer(el.querySelector("#tMin").value, el.querySelector("#tName").value); el.querySelector("#tName").value = ""; };
    el.querySelectorAll("[data-qmin]").forEach((b) => b.onclick = () => addTimer(parseInt(b.dataset.qmin, 10), "Passo " + (idx + 1)));
    paintTimers();
  }

  function close() {
    if (ticker) clearInterval(ticker);
    release();
    stopSpeak();
    stopVoice();
    document.removeEventListener("visibilitychange", onVis);
    el.remove();
    activeCookClose = null;
  }
  activeCookClose = close;

  draw();
}

// ---------------- Form: strumento ----------------
function openToolForm(tool = null) {
  const editing = Boolean(tool);
  let selected = (editing && resolveIcon(tool.icon)) || "cooking-pot";
  const iconBtns = ICON_PICKER.map(
    (name) => `<button type="button" data-icon="${name}" class="${name === selected ? "is-selected" : ""}">${iconHtml(name)}</button>`
  ).join("");

  const m = openModal(`
    <h3 class="modal__title">${editing ? "Modifica strumento" : "Nuovo strumento"}</h3>
    <div class="field">
      <label>Nome</label>
      <input type="text" id="toolName" placeholder="Es. Friggitrice ad aria" value="${escapeHtml(tool ? tool.name : "")}" />
    </div>
    <div class="field">
      <label>Icona</label>
      <div class="icon-picker" id="iconPicker">${iconBtns}</div>
    </div>
    <div class="modal__actions">
      <button class="btn" data-act="cancel">Annulla</button>
      <button class="btn btn--primary" data-act="save">${editing ? "Salva" : "Aggiungi"}</button>
    </div>
  `);

  const picker = m.el.querySelector("#iconPicker");
  picker.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      selected = b.dataset.icon;
      picker.querySelectorAll("button").forEach((x) => x.classList.remove("is-selected"));
      b.classList.add("is-selected");
    })
  );
  const nameInput = m.el.querySelector("#toolName");
  setTimeout(() => nameInput.focus(), 50);

  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  m.el.querySelector('[data-act="save"]').onclick = async () => {
    const name = nameInput.value.trim();
    if (!name) { toast("Inserisci un nome", "error"); return; }
    try {
      if (editing) await store.updateTool(tool.id, { name, icon: selected });
      else await store.addTool({ name, icon: selected });
      m.close();
      toast(editing ? "Strumento aggiornato" : "Strumento aggiunto", "success");
      render();
    } catch (e) {
      toast("Errore nel salvataggio", "error");
    }
  };
}

// ---------------- Form: ricetta ----------------
function openRecipeForm({ recipe = null, toolId = null, prefill = null } = {}) {
  const editing = Boolean(recipe);
  const tools = store.getTools();
  if (!tools.length) {
    toast("Crea prima uno strumento di cottura", "error");
    return;
  }
  const selectedTool = recipe ? recipe.toolId : toolId || tools[0].id;
  const opts = tools
    .map((t) => `<option value="${t.id}" ${t.id === selectedTool ? "selected" : ""}>${escapeHtml(t.name)}</option>`)
    .join("");

  const title = recipe ? recipe.title : prefill ? prefill.title : "";
  const url = recipe ? recipe.url : prefill ? prefill.url : "";
  const notes = recipe ? recipe.notes : "";
  const servings = recipe ? (recipe.servings || "") : (prefill && prefill.servings ? prefill.servings : "");
  const time = recipe ? (recipe.time || "") : (prefill && prefill.time ? prefill.time : "");
  const difficulty = recipe ? (recipe.difficulty || "") : "";
  const ingText = recipe
    ? (recipe.ingredients || []).map((i) => i.raw || ingredientText(i)).join("\n")
    : (prefill && prefill.ingredients ? prefill.ingredients.join("\n") : "");
  const stepsText = recipe
    ? (recipe.steps || []).join("\n")
    : (prefill && prefill.steps ? prefill.steps.join("\n") : "");
  let photo = recipe ? (recipe.photo || "") : (prefill && prefill.image ? prefill.image : "");
  let tags = recipe ? [...(recipe.tags || [])] : (prefill && Array.isArray(prefill.tags) ? [...prefill.tags] : []);
  let allergens = recipe ? [...(recipe.allergens || [])] : [];

  const importBtn = isImportConfigured()
    ? `<button type="button" class="btn btn--ghost" id="rImport" style="margin-top:8px">${iconHtml("download-simple")} Importa ingredienti dal link</button>`
    : "";

  const m = openModal(`
    <h3 class="modal__title">${editing ? "Modifica ricetta" : "Nuova ricetta"}</h3>
    <div class="field">
      <label>Titolo</label>
      <input type="text" id="rTitle" placeholder="Es. Pollo al limone" value="${escapeHtml(title)}" />
    </div>
    <div class="field">
      <label>Foto (facoltativa)</label>
      <div id="photoBox"></div>
      <input type="file" id="rPhoto" accept="image/*" capture="environment" hidden />
    </div>
    <div class="field">
      <label>Strumento di cottura</label>
      <select id="rTool">${opts}</select>
    </div>
    <div class="field">
      <label>Categorie (facoltative)</label>
      <div class="tagedit" id="tagEdit"></div>
      <input type="text" id="rTagInput" placeholder="Aggiungi e premi Invio" />
      <div class="tag-suggest" id="tagSuggest"></div>
    </div>
    <div class="field">
      <label>Allergeni (facoltativi)</label>
      <div class="tag-suggest" id="allergEdit">${ALLERGENS.map((a) => `<button type="button" class="tag-add allerg-chip${allergens.includes(a) ? " is-on" : ""}" data-allerg="${escapeHtml(a)}">${escapeHtml(a)}</button>`).join("")}</div>
    </div>
    <div class="field">
      <label>Link della ricetta (facoltativo)</label>
      <input type="url" id="rUrl" inputmode="url" placeholder="https://..." value="${escapeHtml(url)}" />
      ${importBtn}
    </div>
    <div class="field-row">
      <div class="field">
        <label>Per quante persone?</label>
        <input type="number" id="rServings" inputmode="numeric" min="1" placeholder="Es. 4" value="${escapeHtml(servings)}" />
      </div>
      <div class="field">
        <label>Tempo (minuti)</label>
        <input type="number" id="rTime" inputmode="numeric" min="1" placeholder="Es. 30" value="${escapeHtml(time)}" />
      </div>
    </div>
    <div class="field">
      <label>Difficoltà</label>
      <select id="rDiff">
        <option value=""${!difficulty ? " selected" : ""}>—</option>
        <option value="1"${difficulty == 1 ? " selected" : ""}>Facile</option>
        <option value="2"${difficulty == 2 ? " selected" : ""}>Media</option>
        <option value="3"${difficulty == 3 ? " selected" : ""}>Difficile</option>
      </select>
    </div>
    <div class="field">
      <label>Ingredienti (uno per riga)</label>
      <textarea id="rIngredients" rows="6" placeholder="200 g di farina&#10;2 uova&#10;1 bustina di lievito&#10;sale q.b.">${escapeHtml(ingText)}</textarea>
      <button type="button" class="btn btn--ghost" id="rOcr" style="margin-top:8px">${iconHtml("image")} Scansiona da una foto</button>
      <input type="file" id="rOcrFile" accept="image/*" capture="environment" hidden />
    </div>
    <div class="field">
      <label>Preparazione (un passo per riga)</label>
      <textarea id="rSteps" rows="5" placeholder="Accendi il forno a 180°&#10;Mescola gli ingredienti secchi&#10;Inforna per 30 minuti">${escapeHtml(stepsText)}</textarea>
    </div>
    <div class="field">
      <label>Note (facoltativo)</label>
      <textarea id="rNotes" placeholder="Tempi, temperatura, varianti, voti...">${escapeHtml(notes)}</textarea>
    </div>
    <div class="modal__actions">
      <button class="btn" data-act="cancel">Annulla</button>
      <button class="btn btn--primary" data-act="save">${editing ? "Salva" : "Aggiungi"}</button>
    </div>
  `);

  const titleInput = m.el.querySelector("#rTitle");
  setTimeout(() => titleInput.focus(), 50);

  // --- Foto ---
  const photoBox = m.el.querySelector("#photoBox");
  const photoInput = m.el.querySelector("#rPhoto");
  function renderPhoto() {
    if (photo) {
      photoBox.innerHTML = `<div class="photo-prev"><img src="${escapeHtml(photo)}" alt="" /><button type="button" class="icon-btn icon-btn--danger" id="photoDel">${iconHtml("trash")}</button></div>`;
      photoBox.querySelector("#photoDel").addEventListener("click", () => { photo = ""; renderPhoto(); });
    } else {
      photoBox.innerHTML = `<button type="button" class="btn" id="photoAdd">${iconHtml("image")} Aggiungi foto</button>`;
      photoBox.querySelector("#photoAdd").addEventListener("click", () => photoInput.click());
    }
  }
  photoInput.addEventListener("change", async () => {
    const f = photoInput.files[0];
    if (!f) return;
    try { photo = await fileToDataUrl(f); renderPhoto(); } catch (e) { toast("Foto non valida", "error"); }
    photoInput.value = "";
  });
  renderPhoto();

  // --- Categorie / tag ---
  const tagEdit = m.el.querySelector("#tagEdit");
  const tagInput = m.el.querySelector("#rTagInput");
  const tagSuggest = m.el.querySelector("#tagSuggest");
  function addTag(t) {
    const v = (t || "").trim();
    if (v && !tags.some((x) => x.toLowerCase() === v.toLowerCase())) tags.push(v);
    renderTags();
  }
  function renderTags() {
    tagEdit.innerHTML = tags.length
      ? tags.map((t, i) => `<span class="tagchip" data-i="${i}">${escapeHtml(t)} <b>×</b></span>`).join("")
      : "";
    tagEdit.querySelectorAll(".tagchip").forEach((c) => c.addEventListener("click", () => { tags.splice(parseInt(c.dataset.i, 10), 1); renderTags(); }));
    const avail = TAG_SUGGESTIONS.filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()));
    tagSuggest.innerHTML = avail.map((s) => `<button type="button" class="tag-add" data-t="${escapeHtml(s)}">+ ${escapeHtml(s)}</button>`).join("");
    tagSuggest.querySelectorAll(".tag-add").forEach((b) => b.addEventListener("click", () => addTag(b.dataset.t)));
  }
  tagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput.value); tagInput.value = ""; }
  });
  renderTags();

  // --- Allergeni (toggle) ---
  m.el.querySelectorAll("#allergEdit .allerg-chip").forEach((b) => b.addEventListener("click", () => {
    const a = b.dataset.allerg;
    const i = allergens.indexOf(a);
    if (i >= 0) allergens.splice(i, 1); else allergens.push(a);
    b.classList.toggle("is-on");
  }));

  // --- OCR: scansiona da una foto ---
  const ocrBtn = m.el.querySelector("#rOcr");
  const ocrFile = m.el.querySelector("#rOcrFile");
  ocrBtn.addEventListener("click", () => ocrFile.click());
  ocrFile.addEventListener("change", async () => {
    const f = ocrFile.files[0];
    ocrFile.value = "";
    if (!f) return;
    const old = ocrBtn.innerHTML;
    ocrBtn.disabled = true; ocrBtn.textContent = "Scansione… 0%";
    try {
      const { ocrImage } = await import("./ocr.js");
      const text = await ocrImage(f, (p) => { ocrBtn.textContent = `Scansione… ${Math.round(p * 100)}%`; });
      ocrBtn.disabled = false; ocrBtn.innerHTML = old;
      if (!text) { toast("Nessun testo riconosciuto", "error"); return; }
      openOcrChooser(text, m);
    } catch (e) {
      ocrBtn.disabled = false; ocrBtn.innerHTML = old;
      toast(e.message || "Scansione fallita", "error");
    }
  });

  const rImport = m.el.querySelector("#rImport");
  if (rImport) rImport.addEventListener("click", async () => {
    const u = m.el.querySelector("#rUrl").value.trim();
    if (!u) { toast("Inserisci prima il link", "error"); return; }
    const old = rImport.innerHTML;
    rImport.disabled = true; rImport.textContent = "Importo...";
    try {
      const data = await importFromUrl(u);
      if (data.title && !titleInput.value.trim()) titleInput.value = data.title;
      if (data.servings) m.el.querySelector("#rServings").value = data.servings;
      if (data.time) m.el.querySelector("#rTime").value = data.time;
      if (data.ingredients && data.ingredients.length) m.el.querySelector("#rIngredients").value = data.ingredients.join("\n");
      if (data.steps && data.steps.length) m.el.querySelector("#rSteps").value = data.steps.join("\n");
      if (data.image && !photo) { photo = data.image; renderPhoto(); }
      if (data.tags && data.tags.length) data.tags.forEach((tg) => addTag(tg));
      toast("Ricetta importata", "success");
    } catch (e) {
      toast(e.message || "Import non riuscito", "error");
    }
    rImport.disabled = false; rImport.innerHTML = old;
  });

  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  m.el.querySelector('[data-act="save"]').onclick = async () => {
    const data = {
      title: titleInput.value.trim(),
      toolId: m.el.querySelector("#rTool").value,
      url: m.el.querySelector("#rUrl").value.trim(),
      notes: m.el.querySelector("#rNotes").value.trim(),
      ingredients: parseList(m.el.querySelector("#rIngredients").value),
      servings: parseInt(m.el.querySelector("#rServings").value, 10) || null,
      time: parseInt(m.el.querySelector("#rTime").value, 10) || null,
      difficulty: parseInt(m.el.querySelector("#rDiff").value, 10) || null,
      steps: m.el.querySelector("#rSteps").value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
      photo: photo,
      tags: tags,
      allergens: allergens
    };
    if (!data.title) { toast("Inserisci un titolo", "error"); return; }
    // Se cambiano gli ingredienti o le porzioni, la stima nutrizionale salvata
    // non è più valida: la azzero così l'utente può ricalcolarla.
    if (editing && recipe.nutrition) {
      const oldIng = (recipe.ingredients || []).map((i) => i.raw || ingredientText(i)).join("\n");
      const newIng = data.ingredients.map((i) => i.raw || ingredientText(i)).join("\n");
      if (oldIng !== newIng || (recipe.servings || null) !== data.servings) data.nutrition = null;
    }
    try {
      if (editing) await store.updateRecipe(recipe.id, data);
      else await store.addRecipe(data);
      m.close();
      toast(editing ? "Ricetta aggiornata" : "Ricetta salvata", "success");
      render();
    } catch (e) {
      toast("Errore nel salvataggio", "error");
    }
  };
}

// ---------------- Schermata: Ricettario ----------------
function renderRicettario() {
  root.innerHTML = `
    <h1 class="page-title">Ricettario</h1>
    <p class="page-sub">Trova ispirazione e salva le ricette nei tuoi strumenti.</p>
    <div class="tabs">
      <button class="tab-btn ${mealTab === "online" ? "is-active" : ""}" data-tab="online">${iconHtml("magnifying-glass")} Cerca online</button>
      <button class="tab-btn ${mealTab === "siti" ? "is-active" : ""}" data-tab="siti">${iconHtml("book-bookmark")} Siti italiani</button>
    </div>
    <div id="ricettarioBody"></div>
  `;
  root.querySelectorAll(".tab-btn").forEach((b) =>
    b.addEventListener("click", () => { mealTab = b.dataset.tab; renderRicettario(); })
  );
  if (mealTab === "online") renderOnlineTab();
  else renderSitiTab();
}

const SOURCE_LABEL = { mealdb: "TheMealDB", gz: "GialloZafferano", misya: "Misya", cookist: "Cookist", spoon: "Spoonacular", edamam: "Edamam" };
function onlineSources() {
  const list = [
    { k: "all", label: "Tutte le fonti" },
    { k: "gz", label: "GialloZafferano (IT)" },
    { k: "misya", label: "Misya (IT)" },
    { k: "cookist", label: "Cookist (IT)" },
    { k: "mealdb", label: "TheMealDB (tradotto)" }
  ];
  if (SPOONACULAR_ENABLED) list.push({ k: "spoon", label: "Spoonacular (tradotto)" });
  if (EDAMAM_ENABLED) list.push({ k: "edamam", label: "Edamam (tradotto)" });
  return list;
}

const mapMealdb = (r) => ({ source: "mealdb", title: r.title, image: r.thumb || "", link: r.link, ingredients: r.ingredients || [], steps: r.steps || [], meta: [r.category, r.area].filter(Boolean).join(" · ") });
const mapGz = (r) => ({ source: "gz", title: r.title, title_it: r.title, image: r.image || "", link: r.url, meta: "GialloZafferano" });
const mapMisya = (r) => ({ source: "misya", title: r.title, title_it: r.title, image: r.image || "", link: r.url, meta: "Misya" });
const mapCookist = (r) => ({ source: "cookist", title: r.title, title_it: r.title, image: r.image || "", link: r.url, meta: "Cookist" });
const mapEdamam = (r) => ({ source: "edamam", title: r.title, image: r.image || "", link: r.link, ingredients: r.ingredients || [], steps: r.steps || [], servings: r.servings || null, time: r.time || null, meta: [r.time ? r.time + " min" : "", r.servings ? "per " + r.servings : ""].filter(Boolean).join(" · ") });
const mapSpoon = (r) => ({ source: "spoon", id: r.id || null, title: r.title, image: r.image || "", link: r.link, ingredients: r.ingredients || [], steps: r.steps || [], servings: r.servings || null, time: r.time || null, meta: [r.time ? r.time + " min" : "", r.servings ? "per " + r.servings : ""].filter(Boolean).join(" · ") });

// Alterna i risultati delle varie fonti per non mostrarli tutti raggruppati.
function interleave(arrays) {
  const out = [];
  const max = Math.max(0, ...arrays.map((a) => a.length));
  for (let i = 0; i < max; i++) for (const a of arrays) if (a[i]) out.push(a[i]);
  return out;
}

// Esegue la ricerca sulla fonte scelta (o su tutte) e normalizza i risultati.
async function runMealSearch(q) {
  if (mealSource === "gz") { const out = (await searchGz(q)).map(mapGz); return out; }
  if (mealSource === "misya") { const out = (await searchMisya(q)).map(mapMisya); return out; }
  if (mealSource === "cookist") { const out = (await searchCookist(q)).map(mapCookist); return out; }
  if (mealSource === "spoon") {
    const out = (await searchSpoon(await translateToEnglish(q))).map(mapSpoon);
    await translateMealTitles(out);
    return out;
  }
  if (mealSource === "edamam") {
    const out = (await searchEdamam(await translateToEnglish(q))).map(mapEdamam);
    await translateMealTitles(out);
    return out;
  }
  if (mealSource === "all") {
    const en = await translateToEnglish(q);
    const tasks = [
      searchGz(q).then((rs) => rs.slice(0, 5).map(mapGz)).catch(() => []),
      searchMisya(q).then((rs) => rs.slice(0, 5).map(mapMisya)).catch(() => []),
      searchCookist(q).then((rs) => rs.slice(0, 5).map(mapCookist)).catch(() => []),
      mealdb.searchMeals(en).then((rs) => rs.slice(0, 5).map(mapMealdb)).catch(() => [])
    ];
    if (SPOONACULAR_ENABLED) tasks.push(searchSpoon(en).then((rs) => rs.slice(0, 5).map(mapSpoon)).catch(() => []));
    if (EDAMAM_ENABLED) tasks.push(searchEdamam(en).then((rs) => rs.slice(0, 5).map(mapEdamam)).catch(() => []));
    const arrays = await Promise.all(tasks);
    const merged = interleave(arrays);
    await translateMealTitles(merged);
    return merged;
  }
  const out = (await mealdb.searchMeals(await translateToEnglish(q))).map(mapMealdb);
  await translateMealTitles(out);
  return out;
}

// Esegue una ricerca online e aggiorna lo stato (usata da pulsante, invio e
// dal "tira-per-aggiornare").
async function performMealSearch(q) {
  q = (q || "").trim();
  if (!q) return;
  mealQuery = q; mealLoading = true; mealError = ""; renderOnlineTab();
  try {
    mealResults = await runMealSearch(q);
  } catch (e) {
    mealError = e && e.code === "nokey" ? "Questa fonte non è configurata (vedi README)." : "Servizio non raggiungibile o troppo lento. Riprova.";
    mealResults = null;
  }
  mealLoading = false; renderOnlineTab();
}
async function performMealRandom() {
  mealLoading = true; mealError = ""; mealQuery = ""; renderOnlineTab();
  try {
    const out = (await mealdb.randomMeals(6)).map(mapMealdb);
    await translateMealTitles(out);
    mealResults = out;
  } catch (e) { mealError = "Servizio non raggiungibile o troppo lento. Riprova."; mealResults = null; }
  mealLoading = false; renderOnlineTab();
}

function setupPullToRefresh(body) {
  // Indicatore: ricreato a ogni render (l'innerHTML viene riscritto).
  if (!body.querySelector(".pull-ind")) {
    const ind = document.createElement("div");
    ind.className = "pull-ind";
    ind.textContent = "↻ Rilascia per aggiornare";
    body.prepend(ind);
  }
  if (body.dataset.ptBound) return; // gli ascoltatori si legano una sola volta
  body.dataset.ptBound = "1";
  let start = -1, pulling = false;
  const ind = () => body.querySelector(".pull-ind");
  body.addEventListener("touchstart", (e) => {
    if ((window.scrollY || 0) <= 0 && e.touches.length === 1) { start = e.touches[0].clientY; pulling = true; }
  }, { passive: true });
  body.addEventListener("touchmove", (e) => {
    if (!pulling) return;
    const el = ind();
    const dy = e.touches[0].clientY - start;
    if (dy > 0 && (window.scrollY || 0) <= 0 && el) {
      const d = Math.min(dy, 90);
      el.style.height = d + "px"; el.style.opacity = String(Math.min(1, d / 70));
      el.classList.toggle("ready", d >= 70);
    } else { pulling = false; }
  }, { passive: true });
  const end = () => {
    if (!pulling) return;
    pulling = false;
    const el = ind();
    const ready = el && el.classList.contains("ready");
    if (el) { el.style.height = "0px"; el.style.opacity = "0"; el.classList.remove("ready"); }
    if (ready && mealTab === "online") {
      if (mealQuery) performMealSearch(mealQuery);
      else if (mealSource === "mealdb") performMealRandom();
    }
  };
  body.addEventListener("touchend", end);
  body.addEventListener("touchcancel", end);
}

function renderOnlineTab() {
  const body = root.querySelector("#ricettarioBody");
  let resultsHtml = "";
  if (mealLoading) {
    resultsHtml = Array.from({ length: 4 }, () =>
      `<div class="meal-card meal-card--skeleton"><div class="sk sk--img"></div><div class="meal-card__body"><div class="sk sk--line"></div><div class="sk sk--line sk--short"></div></div></div>`
    ).join("");
  } else if (mealError) {
    resultsHtml = `<div class="empty"><span class="empty__emoji">${iconHtml("cloud-check")}</span>${escapeHtml(mealError)}</div>`;
  } else if (mealResults && mealResults.length === 0) {
    resultsHtml = `<div class="empty"><span class="empty__emoji">${iconHtml("magnifying-glass")}</span>Nessun risultato. Prova un altro termine (es. "pasta", "torta", "zuppa").</div>`;
  } else if (mealResults) {
    resultsHtml = mealResults.map(mealCardHtml).join("");
  } else {
    resultsHtml = `<div class="empty"><span class="empty__emoji">${iconHtml("fork-knife")}</span>Cerca una ricetta in italiano.<br><small>Scegli la fonte qui sopra.</small></div>`;
  }
  const srcOpts = onlineSources().map((s) => `<option value="${s.k}" ${mealSource === s.k ? "selected" : ""}>${s.label}</option>`).join("");

  body.innerHTML = `
    <div class="field" style="margin-bottom:10px"><select id="mealSource">${srcOpts}</select></div>
    <div class="search-bar">
      <input type="search" id="mealSearch" placeholder="Cerca in italiano (es. pollo, torta...)" value="${escapeHtml(mealQuery)}" />
      <button class="btn btn--primary" id="mealSearchBtn">Cerca</button>
    </div>
    ${mealSource === "mealdb" ? `<div style="margin-bottom:16px"><button class="btn btn--ghost" id="mealRandom">${iconHtml("shuffle")} Ispirami</button></div>` : `<div style="margin-bottom:16px"></div>`}
    <div id="mealResults">${resultsHtml}</div>
  `;

  body.querySelector("#mealSource").addEventListener("change", (e) => { mealSource = e.target.value; mealResults = null; mealError = ""; renderOnlineTab(); });

  const input = body.querySelector("#mealSearch");
  const doSearch = () => performMealSearch(input.value);
  body.querySelector("#mealSearchBtn").addEventListener("click", doSearch);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
  const randomBtn = body.querySelector("#mealRandom");
  if (randomBtn) randomBtn.addEventListener("click", () => performMealRandom());

  // Tira-per-aggiornare: trascina in basso (in cima alla pagina) per rilanciare
  // l'ultima ricerca, o pescare nuove ricette casuali su TheMealDB.
  setupPullToRefresh(body);

  body.querySelectorAll(".meal-card[data-meal]").forEach((card) => {
    let data;
    try { data = JSON.parse(card.dataset.meal); } catch (e) { return; }
    const saveBtn = card.querySelector('[data-act="save"]');
    saveBtn.addEventListener("click", async () => {
      const old = saveBtn.innerHTML;
      saveBtn.disabled = true;
      if (data.source === "gz" || data.source === "misya" || data.source === "cookist") {
        // Siti italiani: importa la ricetta completa dal link (già in italiano).
        saveBtn.innerHTML = `${iconHtml("download-simple")} Importo...`;
        try {
          const r = await importFromUrl(data.link);
          openRecipeForm({ prefill: { title: r.title, url: data.link, image: r.image, servings: r.servings, time: r.time, ingredients: r.ingredients, steps: r.steps, tags: r.tags } });
        } catch (e) { toast(e.message || "Import non riuscito", "error"); }
      } else {
        // TheMealDB / Spoonacular: in inglese → traduco al salvataggio.
        let src = { title: data.title, link: data.link, image: data.image || "", servings: data.servings || null, time: data.time || null, ingredients: data.ingredients || [], steps: data.steps || [] };
        // Spoonacular: recupero i dettagli completi (con i passi) prima di tradurre.
        if (data.source === "spoon" && data.id) {
          saveBtn.innerHTML = `${iconHtml("download-simple")} Recupero...`;
          try {
            const info = await spoonInfo(data.id);
            if (info) src = {
              title: info.title || src.title,
              link: info.link || src.link,
              image: info.image || src.image,
              servings: info.servings || src.servings,
              time: info.time || src.time,
              ingredients: (info.ingredients && info.ingredients.length) ? info.ingredients : src.ingredients,
              steps: (info.steps && info.steps.length) ? info.steps : src.steps
            };
          } catch (e) { /* uso i dati della ricerca */ }
        }
        saveBtn.innerHTML = `${iconHtml("download-simple")} Traduco...`;
        let prefill = { title: src.title, url: src.link, image: src.image, servings: src.servings, time: src.time, ingredients: src.ingredients, steps: src.steps };
        try {
          const tr = await translateRecipe({ title: src.title, ingredients: prefill.ingredients, steps: prefill.steps });
          prefill = { ...prefill, title: tr.title, ingredients: tr.ingredients, steps: tr.steps };
        } catch (e) { /* tengo l'inglese */ }
        openRecipeForm({ prefill });
      }
      saveBtn.disabled = false; saveBtn.innerHTML = old;
    });
  });
}

// Traduce in italiano i titoli che non lo sono già (salta quelli con title_it).
async function translateMealTitles(results) {
  const todo = (results || []).filter((r) => !r.title_it);
  if (!todo.length) return;
  try {
    const its = await translateList(todo.map((r) => r.title));
    todo.forEach((r, i) => { r.title_it = (its[i] || r.title); });
  } catch (e) { /* in caso d'errore restano in inglese */ }
}

function mealCardHtml(m, i = 0) {
  return `
    <div class="meal-card stagger" data-meal='${escapeHtml(JSON.stringify(m))}' style="--i:${i}">
      ${m.image ? `<img src="${escapeHtml(m.image)}" alt="" loading="lazy" />` : `<div class="meal-card__noimg">${iconHtml("fork-knife")}</div>`}
      <div class="meal-card__body">
        <h3 class="meal-card__title">${escapeHtml(m.title_it || m.title)}</h3>
        <div class="meal-card__meta"><span class="meal-src meal-src--${m.source}">${SOURCE_LABEL[m.source] || ""}</span>${m.meta ? " · " + escapeHtml(m.meta) : ""}</div>
        <div class="meal-card__actions">
          ${m.link ? `<a class="chip" href="${escapeHtml(safeUrl(m.link))}" target="_blank" rel="noopener">${iconHtml("arrow-square-out")} Apri</a>` : ""}
          <button class="chip" data-act="save">${iconHtml("plus")} ${(m.source === "gz" || m.source === "misya" || m.source === "cookist") ? "Importa" : "Salva"}</button>
        </div>
      </div>
    </div>`;
}

function renderSitiTab() {
  const body = root.querySelector("#ricettarioBody");
  body.innerHTML = ITALIAN_SITES.map(
    (s) => `
    <a class="site-card" href="${escapeHtml(s.url)}" target="_blank" rel="noopener">
      <span class="site-card__emoji">${s.emoji}</span>
      <span>
        <div class="site-card__name">${escapeHtml(s.name)}</div>
        <div class="site-card__url">${escapeHtml(s.url.replace(/^https?:\/\//, ""))}</div>
      </span>
    </a>`
  ).join("");
}

// ---------------- Guida / aiuto ----------------
const GUIDE_SECTIONS = [
  { icon: "cooking-pot", title: "Strumenti & ricette", text: "Organizza le ricette per strumento di cottura. Crea uno strumento (forno, friggitrice ad aria…) e salva sotto le ricette con foto, link, ingredienti, porzioni, passi e categorie." },
  { icon: "calendar-dots", title: "Oggi si mangia", text: "In cima alla schermata Strumenti trovi le ricette che hai pianificato per oggi: toccale per aprirle al volo." },
  { icon: "image", title: "Aggiungi senza fatica", text: "Tre scorciatoie nel form ricetta: incolla un link e tocca \"Importa\" (ingredienti e passi si compilano da soli), oppure \"Scansiona da una foto\" per leggere una ricetta da un libro o quaderno, o salva dal Ricettario online." },
  { icon: "book-open", title: "Ricettario", text: "Cerca idee online o tra i siti italiani; tocca \"Salva\" per aggiungerle a uno dei tuoi strumenti. Le ricette online sono in inglese: al salvataggio vengono tradotte in italiano in automatico." },
  { icon: "fork-knife", title: "Porzioni su misura", text: "Apri una ricetta e cambia il numero di persone con + e −: le quantità degli ingredienti si ricalcolano da sole." },
  { icon: "carrot", title: "Valori nutrizionali", text: "In una ricetta tocca \"Calcola\" sotto gli ingredienti: l'app stima calorie e macronutrienti (proteine, carboidrati, grassi) per porzione e totali. Per ciò che non conosce cerca online su Open Food Facts e ti mostra anche cosa non ha conteggiato. È una stima: cambia con il numero di porzioni." },
  { icon: "heart", title: "Trova al volo", text: "Dalla schermata Strumenti cerca per nome o ingrediente e usa i filtri: Preferiti, Più cucinate, Di recente, per tempo (≤15 e ≤30 min) e le categorie. Indica il tempo di preparazione nella ricetta (modifica) per usare i filtri rapidi. Dai un voto a stelle e \"Segna come cucinata\" per il conto." },
  { icon: "shopping-cart-simple", title: "Spesa & Dispensa", text: "Aggiungi gli ingredienti alla lista della spesa (uniti e per reparto). Tocca il nome per spuntare un articolo e la quantità per modificarla. Con \"Spesa fatta\" passa tutto in dispensa. In Dispensa tieni ciò che hai già — con la scadenza, e l'app ti avvisa quando qualcosa sta per scadere — e \"Cosa posso cucinare\" suggerisce le ricette con quello che hai." },
  { icon: "fire", title: "Modalità cucina", text: "Nelle ricette con i passi, tocca \"Modalità cucina\": istruzioni passo-passo, più timer con nome (pasta, forno…), lettura vocale (🔊) e schermo sempre acceso mentre cucini." },
  { icon: "calendar-blank", title: "Pianificazione", text: "Nel calendario (vista Mese o Settimana) assegna le ricette ai giorni in pranzo o cena, usa \"Riempi le cene\" per riempire la settimana e genera la spesa del mese o della settimana." },
  { icon: "book-bookmark", title: "Menu", text: "Dalla schermata Strumenti, filtro \"Menu\": raggruppa più ricette (es. \"Cena con amici\") e genera un'unica lista della spesa." },
  { icon: "arrow-square-out", title: "Condividi", text: "Da una ricetta tocca \"Condividi\" per inviarla a qualcuno (WhatsApp, email…) con ingredienti e preparazione." },
  { icon: "calendar-dots", title: "Promemoria", text: "In Opzioni attiva i \"Promemoria\": ricevi una notifica delle scadenze in dispensa e del pasto di oggi. Puoi scegliere l'ora dell'avviso e aggiungere un secondo avviso serale con l'anteprima dei pasti di domani. Su iPhone aggiungi prima l'app alla schermata Home." },
  { icon: "sparkle", title: "Personalizza", text: "In Opzioni scegli il tema chiaro o scuro. Con l'accesso le ricette sono salvate nel cloud e sincronizzate su tutti i dispositivi; puoi anche esportare un backup." }
];

function openGuide(firstRun = false) {
  const host = document.getElementById("modalRoot");
  const el = document.createElement("div");
  el.className = "guide";
  el.innerHTML = `
    <div class="guide__head">
      <div class="guide__brand">${iconHtml("cooking-pot")} <b>Come funziona</b></div>
      <button class="cook__close" id="gClose">${iconHtml("x")}</button>
    </div>
    <div class="guide__body">
      ${firstRun ? `<div class="guide__hero"><img class="brand-logo" src="icons/icon.svg" alt="" /><h2 style="margin:0 0 4px">Ti diamo il benvenuto${getNickname() ? ", " + escapeHtml(getNickname()) : ""}! 👋</h2><p style="color:var(--text-soft);margin:0">Ecco tutto quello che puoi fare.</p></div>` : ""}
      ${GUIDE_SECTIONS.map((s) => `<div class="guide-card"><span class="guide-card__ic">${iconHtml(s.icon)}</span><div><div class="guide-card__t">${escapeHtml(s.title)}</div><div class="guide-card__x">${escapeHtml(s.text)}</div></div></div>`).join("")}
    </div>
    <div class="guide__foot"><button class="btn btn--primary btn--block" id="gOk">${firstRun ? "Inizia a cucinare" : "Ho capito"}</button></div>
  `;
  host.appendChild(el);
  const close = () => el.remove();
  el.querySelector("#gClose").onclick = close;
  el.querySelector("#gOk").onclick = close;
}

// ---------------- Schermata: Lista della spesa ----------------
function shopRow(it) {
  const qty = it.qty != null ? formatQty(it.qty) : "";
  const amount = [qty, it.unit && it.unit !== "q.b." ? it.unit : (it.unit === "q.b." ? "q.b." : "")].filter(Boolean).join(" ");
  return `
    <div class="shop-row ${it.checked ? "is-checked" : ""}${it.checked && it.id === lastShopToggled ? " just-checked" : ""}" data-id="${it.id}">
      <button class="check" data-act="check">${it.checked ? iconHtml("check") : ""}</button>
      <span class="shop-row__name" data-act="toggle">${escapeHtml(it.name)}</span>
      <button class="shop-row__amt" data-act="qty" title="Modifica quantità">${amount ? escapeHtml(amount) : iconHtml("pencil-simple")}</button>
      <button class="icon-btn icon-btn--danger shop-row__del" data-act="del">${iconHtml("trash")}</button>
    </div>`;
}

// Modale per modificare a mano quantità e unità di un articolo della spesa.
function editShoppingQty(it) {
  const m = openModal(`
    <h3 class="modal__title">Quantità</h3>
    <div class="field">
      <label>${escapeHtml(it.name)}</label>
      <div style="display:flex;gap:8px">
        <input type="text" id="eqQty" inputmode="decimal" placeholder="Quantità" value="${it.qty != null ? String(it.qty).replace(".", ",") : ""}" style="flex:1" />
        <input type="text" id="eqUnit" placeholder="Unità (g, ml…)" value="${escapeHtml(it.unit && it.unit !== "q.b." ? it.unit : "")}" style="flex:1" />
      </div>
    </div>
    <div class="modal__actions">
      <button class="btn" data-act="cancel">Annulla</button>
      <button class="btn btn--primary" data-act="save">Salva</button>
    </div>`);
  setTimeout(() => m.el.querySelector("#eqQty").focus(), 50);
  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  m.el.querySelector('[data-act="save"]').onclick = async () => {
    const qv = m.el.querySelector("#eqQty").value.trim().replace(",", ".");
    const uv = m.el.querySelector("#eqUnit").value.trim();
    const qty = qv === "" ? null : (parseFloat(qv) || null);
    await store.updateShoppingItem(it.id, { qty, unit: uv });
    m.close();
  };
}

function renderShopping() {
  root.innerHTML = `
    <h1 class="page-title">Spesa</h1>
    <div class="tabs">
      <button class="tab-btn ${shopTab === "lista" ? "is-active" : ""}" data-tab="lista">${iconHtml("shopping-cart-simple")} Da comprare</button>
      <button class="tab-btn ${shopTab === "dispensa" ? "is-active" : ""}" data-tab="dispensa">${iconHtml("basket")} Dispensa</button>
    </div>
    <div id="spesaBody"></div>
  `;
  root.querySelectorAll(".tab-btn").forEach((b) => b.addEventListener("click", () => { shopTab = b.dataset.tab; renderShopping(); }));
  if (shopTab === "lista") renderShoppingList();
  else renderPantry();
}

function renderShoppingList() {
  const wrap = root.querySelector("#spesaBody");
  const items = store.getShopping();
  const active = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  let body;
  if (!items.length) {
    body = `<div class="empty"><span class="empty__emoji">${iconHtml("shopping-cart-simple")}</span>La lista è vuota.<br>Aggiungi gli ingredienti da una ricetta o scrivili qui sotto.</div>`;
  } else {
    const groups = {};
    active.forEach((it) => { const c = it.category || "Altro"; (groups[c] = groups[c] || []).push(it); });
    const orderedCats = getAisleOrder().filter((c) => groups[c]);
    const groupsHtml = orderedCats
      .map((cat) => `
        <div class="shop-group">
          <div class="shop-group__title">${escapeHtml(cat)}</div>
          ${groups[cat].map(shopRow).join("")}
        </div>`)
      .join("");
    const doneHtml = done.length
      ? `<div class="shop-group shop-group--done">
          <div class="shop-group__title">Presi (${done.length})</div>
          ${done.map(shopRow).join("")}
        </div>`
      : "";
    body = (groupsHtml || `<div class="hint">Tutto preso! 🎉</div>`) + doneHtml;
  }

  wrap.innerHTML = `
    <div class="search-bar">
      <input type="text" id="shopAdd" placeholder="Aggiungi un articolo..." />
      <button class="btn btn--primary" id="shopAddBtn">${iconHtml("plus")}</button>
    </div>
    <div id="shopBody">${body}</div>
    ${(() => { const c = estimateCost(active); return c.counted ? `<div class="shop-cost">${iconHtml("basket")} Costo stimato del carrello: <b>€ ${c.total.toFixed(2)}</b><span class="shop-cost__note"> · stima su ${c.counted} articoli</span></div>` : ""; })()}
    ${done.length ? `<button class="btn btn--primary btn--block" id="toPantry" style="margin-top:18px">${iconHtml("basket")} Spesa fatta: presi in dispensa</button>` : ""}
    ${items.length ? `<div style="display:flex;gap:8px;margin-top:${done.length ? "8px" : "18px"};flex-wrap:wrap">
      <button class="btn btn--ghost" id="aisleBtn">${iconHtml("sliders-horizontal")} Reparti</button>
      <button class="btn btn--ghost" id="clearDone">Svuota presi</button>
      <button class="btn btn--ghost" id="clearAll" style="color:var(--danger)">Svuota tutto</button>
    </div>` : ""}
  `;

  const addInput = wrap.querySelector("#shopAdd");
  const doAdd = async () => {
    const v = addInput.value.trim();
    if (!v) return;
    const parsed = parseList(v).map((p) => ({ ...p, category: categorize(p.name) }));
    addInput.value = "";
    const res = await store.addShoppingItems(parsed);
    if (res.added === 0 && res.skipped) toast("È già in dispensa", "error");
  };
  wrap.querySelector("#shopAddBtn").addEventListener("click", doAdd);
  addInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doAdd(); });

  wrap.querySelectorAll(".shop-row").forEach((rowEl) => {
    const id = rowEl.dataset.id;
    const toggle = () => {
      const it = store.getShopping().find((s) => s.id === id);
      const willCheck = !(it && it.checked);
      lastShopToggled = willCheck ? id : null; // anima solo quando si spunta
      if (willCheck) haptic(10);
      store.toggleShoppingItem(id, willCheck);
    };
    rowEl.querySelector('[data-act="check"]').addEventListener("click", toggle);
    const nameEl = rowEl.querySelector('[data-act="toggle"]');
    if (nameEl) nameEl.addEventListener("click", toggle); // tap sul nome = spunta rapida
    const qtyEl = rowEl.querySelector('[data-act="qty"]');
    if (qtyEl) qtyEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const it = store.getShopping().find((s) => s.id === id);
      if (it) editShoppingQty(it);
    });
    rowEl.querySelector('[data-act="del"]').addEventListener("click", (e) => { e.stopPropagation(); store.deleteShoppingItem(id); });
  });

  const tp = wrap.querySelector("#toPantry");
  if (tp) tp.addEventListener("click", () => openPutInPantry(store.getShopping().filter((s) => s.checked)));
  const cd = wrap.querySelector("#clearDone");
  if (cd) cd.addEventListener("click", () => store.clearCheckedShopping());
  const ca = wrap.querySelector("#clearAll");
  if (ca) ca.addEventListener("click", async () => {
    const ok = await confirmDialog({ title: "Svuotare la lista?", message: "Tutti gli articoli verranno rimossi.", confirmText: "Svuota", danger: true });
    if (ok) store.clearAllShopping();
  });
  const ab = wrap.querySelector("#aisleBtn");
  if (ab) ab.addEventListener("click", openAisleOrder);
  lastShopToggled = null; // consuma l'animazione: i prossimi render non ri-animano
}

// Ordine dei reparti nella lista della spesa (personalizzabile per corsia).
function getAisleOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem("ricettario.aisleOrder") || "null");
    if (Array.isArray(saved) && saved.length) {
      const merged = saved.filter((c) => CATEGORY_ORDER.includes(c));
      for (const c of CATEGORY_ORDER) if (!merged.includes(c)) merged.push(c);
      return merged;
    }
  } catch (e) { /* ignora */ }
  return [...CATEGORY_ORDER];
}
function setAisleOrder(arr) {
  try { localStorage.setItem("ricettario.aisleOrder", JSON.stringify(arr)); } catch (e) { /* ignora */ }
}
function openAisleOrder() {
  let order = getAisleOrder();
  const m = openModal(`
    <h3 class="modal__title">${iconHtml("sliders-horizontal")} Ordine reparti</h3>
    <p class="hint" style="margin-top:-6px">Spostali nell'ordine in cui giri al supermercato.</p>
    <div id="aisleList"></div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Fatto</button></div>
  `);
  const list = m.el.querySelector("#aisleList");
  const draw = () => {
    list.innerHTML = order.map((c, i) => `<div class="aisle-row"><span class="aisle-row__name">${escapeHtml(c)}</span><button class="aisle-btn" data-up="${i}" ${i === 0 ? "disabled" : ""}>↑</button><button class="aisle-btn" data-down="${i}" ${i === order.length - 1 ? "disabled" : ""}>↓</button></div>`).join("");
    list.querySelectorAll("[data-up]").forEach((b) => b.onclick = () => { const i = +b.dataset.up; [order[i - 1], order[i]] = [order[i], order[i - 1]]; setAisleOrder(order); draw(); });
    list.querySelectorAll("[data-down]").forEach((b) => b.onclick = () => { const i = +b.dataset.down; [order[i + 1], order[i]] = [order[i], order[i + 1]]; setAisleOrder(order); draw(); });
  };
  draw();
  m.el.querySelector('[data-act="ok"]').onclick = () => { m.close(); renderShoppingList(); };
}

function daysUntil(ds) {
  const [y, m, d] = ds.split("-").map(Number);
  const t = new Date();
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const target = new Date(y, m - 1, d);
  return Math.round((target - today) / 86400000);
}
function expiryBadge(ds) {
  if (!ds) return "";
  const d = daysUntil(ds);
  if (d < 0) return `<span class="exp exp--bad">scaduto</span>`;
  if (d === 0) return `<span class="exp exp--warn">scade oggi</span>`;
  if (d <= 3) return `<span class="exp exp--warn">tra ${d} g</span>`;
  const [, m, day] = ds.split("-");
  return `<span class="exp">${day}/${m}</span>`;
}
function pantryRow(p) {
  return `<div class="shop-row" data-id="${p.id}">
    <span class="day-row__icon">${iconHtml("basket")}</span>
    <span class="shop-row__name">${escapeHtml(p.name)}</span>
    ${expiryBadge(p.expiry)}
    <button class="icon-btn icon-btn--danger shop-row__del" data-act="del">${iconHtml("trash")}</button>
  </div>`;
}

// Finestra "Spesa fatta": mette i presi in dispensa, con scadenza facoltativa.
function openPutInPantry(checked) {
  if (!checked.length) return;
  const rows = checked.map((s) => `
    <div class="put-row" data-name="${escapeHtml(s.name)}">
      <span class="put-row__name">${iconHtml("basket")} ${escapeHtml(s.name)}</span>
      <input type="date" class="put-row__date" title="Scadenza (facoltativa)" />
    </div>`).join("");
  const m = openModal(`
    <h3 class="modal__title">Metti in dispensa</h3>
    <p class="hint" style="margin-top:-8px;margin-bottom:12px">La scadenza è facoltativa: lasciala vuota se non la sai.</p>
    <div>${rows}</div>
    <div class="modal__actions">
      <button class="btn" data-act="cancel">Annulla</button>
      <button class="btn btn--primary" data-act="ok">Conferma</button>
    </div>
  `);
  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  m.el.querySelector('[data-act="ok"]').onclick = async () => {
    const rowEls = [...m.el.querySelectorAll(".put-row")];
    for (const r of rowEls) await store.addPantryItem(r.dataset.name, r.querySelector(".put-row__date").value || null);
    await store.clearCheckedShopping();
    m.close();
    toast(`${rowEls.length} ${rowEls.length === 1 ? "articolo messo" : "articoli messi"} in dispensa`, "success");
  };
}

function renderPantry() {
  const wrap = root.querySelector("#spesaBody");
  const pantry = store.getPantry().slice().sort((a, b) => {
    if (a.expiry && b.expiry) return a.expiry.localeCompare(b.expiry);
    if (a.expiry) return -1;
    if (b.expiry) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });
  const list = pantry.length
    ? pantry.map(pantryRow).join("")
    : `<div class="empty"><span class="empty__emoji">${iconHtml("basket")}</span>Dispensa vuota.<br>Aggiungi ciò che hai già in casa: non verrà inserito nella spesa.</div>`;

  wrap.innerHTML = `
    <div class="hint" style="margin-bottom:10px">Quello che metti qui non verrà aggiunto alla lista della spesa. La data di scadenza è facoltativa.</div>
    <button class="btn btn--primary btn--block" id="cookSuggest" style="margin-bottom:14px">${iconHtml("fork-knife")} Cosa posso cucinare con questi?</button>
    <div class="pan-add">
      <input type="text" id="panAdd" placeholder="Aggiungi un alimento..." />
      <div class="pan-add__row">
        <input type="date" id="panExp" title="Scadenza (facoltativa)" />
        <button class="btn btn--primary" id="panAddBtn">${iconHtml("plus")} Aggiungi</button>
      </div>
      ${("BarcodeDetector" in window) ? `<button class="btn btn--ghost btn--block" id="panScan" style="margin-top:8px">📷 Scansiona codice a barre</button>` : ""}
    </div>
    <div>${list}</div>
  `;

  const addInput = wrap.querySelector("#panAdd");
  const expInput = wrap.querySelector("#panExp");
  const doAdd = async () => {
    const v = addInput.value.trim();
    if (!v) return;
    const exp = expInput.value || null;
    addInput.value = ""; expInput.value = "";
    for (const part of v.split(",")) await store.addPantryItem(part.trim(), exp);
  };
  wrap.querySelector("#panAddBtn").addEventListener("click", doAdd);
  addInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doAdd(); });
  wrap.querySelector("#cookSuggest").addEventListener("click", openCookSuggestions);
  const scanBtn = wrap.querySelector("#panScan");
  if (scanBtn) scanBtn.addEventListener("click", openBarcodeScanner);
  wrap.querySelectorAll(".shop-row").forEach((rowEl) => {
    rowEl.querySelector('[data-act="del"]').addEventListener("click", () => store.deletePantryItem(rowEl.dataset.id));
  });
}

// Scanner del codice a barre → aggiunge in dispensa (nome da Open Food Facts).
async function addFromBarcode(code) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`);
    const d = await res.json();
    const p = d && d.product;
    const name = (p && (p.product_name_it || p.product_name || p.generic_name_it || p.generic_name) || "").trim();
    if (name) { await store.addPantryItem(name, null); toast(`Aggiunto: ${name}`, "success"); }
    else { toast(`Prodotto non trovato (codice ${code})`, "error"); }
  } catch (e) { toast("Ricerca prodotto non riuscita", "error"); }
}
async function openBarcodeScanner() {
  if (!("BarcodeDetector" in window)) { toast("Scanner non supportato su questo telefono", "error"); return; }
  let stream = null, raf = null, stopped = false;
  const el = document.createElement("div");
  el.className = "scan";
  el.innerHTML = `<video class="scan__video" playsinline muted></video><div class="scan__frame"></div><div class="scan__hint">Inquadra il codice a barre del prodotto</div><button class="scan__close" title="Chiudi">${iconHtml("x")}</button>`;
  document.getElementById("modalRoot").appendChild(el);
  const video = el.querySelector("video");
  const cleanup = () => { stopped = true; if (raf) cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); el.remove(); };
  el.querySelector(".scan__close").onclick = cleanup;
  let detector;
  try {
    detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
    await video.play();
  } catch (e) { toast("Impossibile accedere alla fotocamera", "error"); cleanup(); return; }
  const scan = async () => {
    if (stopped) return;
    try {
      const codes = await detector.detect(video);
      if (codes && codes.length && codes[0].rawValue) {
        const code = codes[0].rawValue;
        cleanup();
        await addFromBarcode(code);
        return;
      }
    } catch (e) { /* frame non leggibile */ }
    raf = requestAnimationFrame(scan);
  };
  raf = requestAnimationFrame(scan);
}

function openCookSuggestions() {
  const list = store.suggestFromPantry();
  const body = list.length
    ? list.map(({ recipe, have, total }) => {
        const tool = store.getTool(recipe.toolId);
        return `<button class="pick-row" data-id="${recipe.id}"><span class="day-row__icon">${tool ? iconHtml(tool.icon) : iconHtml("fork-knife")}</span><span class="day-row__name">${escapeHtml(recipe.title)}<span class="have-badge">${have}/${total} ingredienti</span></span></button>`;
      }).join("")
    : `<div class="empty"><span class="empty__emoji">${iconHtml("fork-knife")}</span>Nessun suggerimento.<br>Aggiungi alimenti in dispensa e ricette con ingredienti, poi riprova.</div>`;
  const m = openModal(`<h3 class="modal__title">Cosa posso cucinare</h3><div>${body}</div>`);
  m.el.querySelectorAll(".pick-row").forEach((b) => b.addEventListener("click", () => { m.close(); openRecipe(b.dataset.id); }));
}

// ---------------- Schermata: Pianificazione (calendario) ----------------
const MONTHS_IT = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const WEEKDAYS_IT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
function pad2(n) { return String(n).padStart(2, "0"); }
function ymd(y, m, d) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }
function todayStr() { const n = new Date(); return ymd(n.getFullYear(), n.getMonth(), n.getDate()); }
function formatDateLong(ds) { const [y, m, d] = ds.split("-").map(Number); return `${d} ${MONTHS_IT[m - 1]} ${y}`; }
function allRecipes() { return store.getTools().flatMap((t) => store.getRecipesByTool(t.id)); }

function planToggle() {
  return `<div class="tabs" style="margin-bottom:14px">
    <button class="tab-btn ${planView === "month" ? "is-active" : ""}" data-pv="month">${iconHtml("calendar-dots")} Mese</button>
    <button class="tab-btn ${planView === "week" ? "is-active" : ""}" data-pv="week">${iconHtml("calendar-blank")} Settimana</button>
  </div>`;
}
function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function renderPlan() {
  if (planView === "week") return renderPlanWeek();
  const today = new Date();
  if (planYear == null) { planYear = today.getFullYear(); planMonth = today.getMonth(); }
  const first = new Date(planYear, planMonth, 1);
  const startDow = (first.getDay() + 6) % 7; // lunedì = 0
  const daysInMonth = new Date(planYear, planMonth + 1, 0).getDate();
  const tStr = todayStr();

  const wk = WEEKDAYS_IT.map((d) => `<div class="cal-wd">${d}</div>`).join("");
  let cells = "";
  for (let i = 0; i < startDow; i++) cells += `<div class="cal-cell cal-cell--empty"></div>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const ds = ymd(planYear, planMonth, day);
    const count = store.countPlanByDate(ds);
    cells += `<button class="cal-cell ${ds === tStr ? "is-today" : ""} ${count ? "has-plan" : ""}" data-date="${ds}">
      <span class="cal-day">${day}</span>
      ${count ? `<span class="cal-dot">${count > 1 ? count : ""}</span>` : ""}
    </button>`;
  }

  root.innerHTML = `
    <h1 class="page-title">Pianificazione</h1>
    ${planToggle()}
    <div class="cal-head">
      <button class="back-btn" id="prevM">${iconHtml("caret-left")}</button>
      <div class="cal-title">${MONTHS_IT[planMonth]} ${planYear}</div>
      <button class="back-btn" id="nextM">${iconHtml("caret-right")}</button>
    </div>
    <div class="cal-grid cal-weekdays">${wk}</div>
    <div class="cal-grid">${cells}</div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn--ghost" id="todayBtn">Oggi</button>
      <button class="btn btn--ghost" id="monthShop">${iconHtml("shopping-cart-simple")} Spesa del mese</button>
    </div>
  `;

  root.querySelectorAll("[data-pv]").forEach((b) => b.addEventListener("click", () => { planView = b.dataset.pv; render(); }));
  root.querySelector("#prevM").addEventListener("click", () => { planMonth--; if (planMonth < 0) { planMonth = 11; planYear--; } render(); });
  root.querySelector("#nextM").addEventListener("click", () => { planMonth++; if (planMonth > 11) { planMonth = 0; planYear++; } render(); });
  root.querySelector("#todayBtn").addEventListener("click", () => { planYear = today.getFullYear(); planMonth = today.getMonth(); render(); });
  root.querySelectorAll(".cal-cell[data-date]").forEach((c) => c.addEventListener("click", () => openDaySheet(c.dataset.date)));
  root.querySelector("#monthShop").addEventListener("click", async () => {
    const prefix = `${planYear}-${pad2(planMonth + 1)}-`;
    const entries = store.getPlan().filter((p) => p.date.startsWith(prefix));
    if (!entries.length) { toast("Nessuna ricetta pianificata questo mese", "error"); return; }
    const items = collectIngredients(entries);
    const res = await store.addShoppingItems(items);
    toast(shoppingToast(res), "success");
  });
}

function renderPlanWeek() {
  const today = new Date();
  if (!weekAnchor) weekAnchor = startOfWeek(today);
  const start = startOfWeek(weekAnchor);
  const days = [];
  for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
  const tStr = todayStr();
  const range = `${days[0].getDate()} ${MONTHS_IT[days[0].getMonth()].slice(0, 3).toLowerCase()} – ${days[6].getDate()} ${MONTHS_IT[days[6].getMonth()].slice(0, 3).toLowerCase()}`;

  const cards = days.map((d, i) => {
    const ds = ymd(d.getFullYear(), d.getMonth(), d.getDate());
    const entries = store.getPlanByDate(ds);
    const meals = entries.length
      ? entries.map((e) => {
          const r = store.getRecipe(e.recipeId);
          const slot = e.slot ? `<b>${e.slot === "pranzo" ? "P" : "C"}</b> ` : "";
          return `<button class="week-meal" data-recipe="${r ? r.id : ""}">${slot}${escapeHtml(r ? r.title : "(eliminata)")}</button>`;
        }).join("")
      : `<span class="week-empty">Niente in programma</span>`;
    return `<div class="week-day ${ds === tStr ? "is-today" : ""}">
      <button class="week-day__h" data-date="${ds}"><span>${WEEKDAYS_IT[i]} ${d.getDate()}</span>${iconHtml("plus")}</button>
      <div class="week-day__meals">${meals}</div>
    </div>`;
  }).join("");

  root.innerHTML = `
    <h1 class="page-title">Pianificazione</h1>
    ${planToggle()}
    <div class="cal-head">
      <button class="back-btn" id="prevW">${iconHtml("caret-left")}</button>
      <div class="cal-title">${range}</div>
      <button class="back-btn" id="nextW">${iconHtml("caret-right")}</button>
    </div>
    <div class="week-list">${cards}</div>
    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
      <button class="btn btn--ghost" id="weekToday">Oggi</button>
      <button class="btn btn--primary" id="genWeek">${iconHtml("sparkle")} Menù settimana</button>
      <button class="btn btn--ghost" id="fillWeek">${iconHtml("sparkle")} Riempi le cene</button>
      <button class="btn btn--ghost" id="weekShop">${iconHtml("shopping-cart-simple")} Spesa settimana</button>
    </div>
  `;

  root.querySelectorAll("[data-pv]").forEach((b) => b.addEventListener("click", () => { planView = b.dataset.pv; render(); }));
  root.querySelector("#prevW").addEventListener("click", () => { const a = new Date(start); a.setDate(a.getDate() - 7); weekAnchor = a; render(); });
  root.querySelector("#nextW").addEventListener("click", () => { const a = new Date(start); a.setDate(a.getDate() + 7); weekAnchor = a; render(); });
  root.querySelector("#weekToday").addEventListener("click", () => { weekAnchor = startOfWeek(new Date()); render(); });
  root.querySelectorAll(".week-day__h").forEach((b) => b.addEventListener("click", () => openDaySheet(b.dataset.date)));
  root.querySelectorAll(".week-meal").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); if (b.dataset.recipe) openRecipe(b.dataset.recipe); }));

  root.querySelector("#fillWeek").addEventListener("click", async () => {
    const recipes = allRecipes();
    if (!recipes.length) { toast("Aggiungi prima qualche ricetta", "error"); return; }
    let pool = [];
    let added = 0;
    for (const d of days) {
      const ds = ymd(d.getFullYear(), d.getMonth(), d.getDate());
      if (store.getPlanByDate(ds).some((e) => e.slot === "cena")) continue;
      if (!pool.length) pool = [...recipes];
      const idx = Math.floor(Math.random() * pool.length);
      const r = pool.splice(idx, 1)[0];
      await store.addPlan(ds, r.id, "cena");
      added++;
    }
    toast(added ? `${added} cene pianificate` : "Cene già pianificate", added ? "success" : "");
  });
  root.querySelector("#weekShop").addEventListener("click", async () => {
    const set = new Set(days.map((d) => ymd(d.getFullYear(), d.getMonth(), d.getDate())));
    const entries = store.getPlan().filter((p) => set.has(p.date));
    if (!entries.length) { toast("Nessuna ricetta pianificata questa settimana", "error"); return; }
    const res = await store.addShoppingItems(collectIngredients(entries));
    toast(shoppingToast(res), "success");
  });

  // Menù settimana: riempie le cene vuote pescando dai preferiti (poi da tutte),
  // senza ripetere, e genera la spesa della settimana.
  root.querySelector("#genWeek").addEventListener("click", async () => {
    const recipes = allRecipes();
    if (!recipes.length) { toast("Aggiungi prima qualche ricetta", "error"); return; }
    const favs = recipes.filter((r) => r.favorite);
    const base = favs.length >= 3 ? favs : recipes;
    const used = new Set();
    let added = 0;
    for (const d of days) {
      const ds = ymd(d.getFullYear(), d.getMonth(), d.getDate());
      if (store.getPlanByDate(ds).some((e) => e.slot === "cena")) continue;
      let cand = base.filter((r) => !used.has(r.id));
      if (!cand.length) { used.clear(); cand = base.slice(); }
      const r = cand[Math.floor(Math.random() * cand.length)];
      used.add(r.id);
      await store.addPlan(ds, r.id, "cena");
      added++;
    }
    if (!added) { toast("Le cene sono già pianificate", ""); return; }
    const set = new Set(days.map((d) => ymd(d.getFullYear(), d.getMonth(), d.getDate())));
    const entries = store.getPlan().filter((p) => set.has(p.date));
    const res = await store.addShoppingItems(collectIngredients(entries));
    toast(`Menù creato: ${added} cene · ${shoppingToast(res)}`, "success");
  });
}

function collectIngredients(entries) {
  const items = [];
  for (const e of entries) {
    const r = store.getRecipe(e.recipeId);
    if (r && Array.isArray(r.ingredients)) {
      for (const it of r.ingredients) {
        items.push({ name: it.name, unit: it.unit || "", qty: it.qty != null ? it.qty : null, category: categorize(it.name) });
      }
    }
  }
  return items;
}

const SLOTS = [{ key: "pranzo", label: "Pranzo", icon: "sparkle" }, { key: "cena", label: "Cena", icon: "sparkle" }, { key: null, label: "Altro", icon: "fork-knife" }];

function dayRowHtml(e) {
  const r = store.getRecipe(e.recipeId);
  const tool = r ? store.getTool(r.toolId) : null;
  return `<div class="day-row" data-plan="${e.id}" data-recipe="${r ? r.id : ""}">
    <span class="day-row__icon">${tool ? iconHtml(tool.icon) : iconHtml("fork-knife")}</span>
    <span class="day-row__name">${escapeHtml(r ? r.title : "(ricetta eliminata)")}</span>
    <button class="icon-btn icon-btn--danger" data-act="rem" title="Rimuovi">${iconHtml("trash")}</button>
  </div>`;
}

// Somma stimata di calorie/macro dei pasti del giorno (per porzione a pasto).
function dayNutrition(entries) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  let counted = 0, total = 0;
  for (const e of entries) {
    const r = store.getRecipe(e.recipeId);
    if (!r) continue;
    total++;
    const n = r.nutrition;
    if (!n) continue;
    const base = r.servings || 1;
    t.kcal += n.kcal / base; t.p += n.p / base; t.c += n.c / base; t.f += n.f / base;
    counted++;
  }
  return { kcal: Math.round(t.kcal), p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f), counted, total };
}

function openDaySheet(date) {
  const entries = store.getPlanByDate(date);
  let groupsHtml = "";
  if (entries.length) {
    for (const s of SLOTS) {
      const list = entries.filter((e) => (e.slot || null) === s.key);
      if (!list.length) continue;
      groupsHtml += `<div class="day-slot"><div class="day-slot__title">${s.label}</div>${list.map(dayRowHtml).join("")}</div>`;
    }
  } else {
    groupsHtml = `<div class="hint">Nessuna ricetta per questo giorno.</div>`;
  }

  // Riepilogo nutrizionale stimato della giornata (1 porzione per pasto).
  const dn = dayNutrition(entries);
  const nutriHtml = dn.counted
    ? `<div class="nutri-box" style="margin-top:6px">
        <div class="nutri-row"><span class="nutri-lbl">${iconHtml("carrot")} Stima del giorno</span><span class="nutri-val"><b>${dn.kcal}</b> kcal · P ${dn.p} · C ${dn.c} · G ${dn.f}</span></div>
      </div>${dn.counted < dn.total ? `<div class="hint" style="margin-top:4px">${dn.total - dn.counted} pasti senza valori (calcolali nella ricetta).</div>` : ""}`
    : "";

  const m = openModal(`
    <h3 class="modal__title">${formatDateLong(date)}</h3>
    <div id="dayRows">${groupsHtml}</div>
    ${nutriHtml}
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn--primary" style="flex:1" data-slot="pranzo">${iconHtml("plus")} Pranzo</button>
      <button class="btn btn--primary" style="flex:1" data-slot="cena">${iconHtml("plus")} Cena</button>
    </div>
    ${entries.length ? `<button class="btn btn--block" data-act="toshop" style="margin-top:8px">${iconHtml("shopping-cart-simple")} Aggiungi ingredienti alla spesa</button>` : ""}
  `);

  m.el.querySelectorAll(".day-row").forEach((row) => {
    const planId = row.dataset.plan;
    const rid = row.dataset.recipe;
    row.querySelector('[data-act="rem"]').addEventListener("click", async (e) => {
      e.stopPropagation();
      await store.deletePlan(planId);
      m.close();
      openDaySheet(date);
    });
    if (rid) row.addEventListener("click", () => { m.close(); openRecipe(rid); });
  });
  m.el.querySelectorAll("[data-slot]").forEach((btn) => btn.addEventListener("click", () => {
    const slot = btn.dataset.slot;
    m.close();
    openRecipePicker(async (recipeId) => { await store.addPlan(date, recipeId, slot); openDaySheet(date); });
  }));
  const ts = m.el.querySelector('[data-act="toshop"]');
  if (ts) ts.addEventListener("click", async () => {
    const res = await store.addShoppingItems(collectIngredients(entries));
    m.close();
    toast(shoppingToast(res), "success");
  });
}

function openRecipePicker(onPick) {
  const recipes = allRecipes();
  if (!recipes.length) { toast("Aggiungi prima qualche ricetta", "error"); return; }
  const build = (q = "") => {
    const filt = recipes.filter((r) => r.title.toLowerCase().includes(q.toLowerCase()));
    if (!filt.length) return `<div class="hint">Nessuna ricetta trovata.</div>`;
    return filt.map((r) => {
      const tool = store.getTool(r.toolId);
      return `<button class="pick-row" data-id="${r.id}"><span class="day-row__icon">${tool ? iconHtml(tool.icon) : iconHtml("fork-knife")}</span><span class="day-row__name">${escapeHtml(r.title)}</span></button>`;
    }).join("");
  };
  const m = openModal(`
    <h3 class="modal__title">Scegli una ricetta</h3>
    <div class="field"><input type="search" id="pickSearch" placeholder="Cerca..." /></div>
    <div id="pickList">${build()}</div>
  `);
  const search = m.el.querySelector("#pickSearch");
  const listEl = m.el.querySelector("#pickList");
  const attach = () => listEl.querySelectorAll(".pick-row").forEach((b) => b.addEventListener("click", () => { m.close(); onPick(b.dataset.id); }));
  attach();
  search.addEventListener("input", () => { listEl.innerHTML = build(search.value); attach(); });
}

// ---------------- Menu / collezioni ----------------
function openPrompt(title, placeholder, onOk, value = "") {
  const m = openModal(`
    <h3 class="modal__title">${escapeHtml(title)}</h3>
    <div class="field"><input type="text" id="pmInput" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}" /></div>
    <div class="modal__actions">
      <button class="btn" data-act="c">Annulla</button>
      <button class="btn btn--primary" data-act="ok">Salva</button>
    </div>
  `);
  const inp = m.el.querySelector("#pmInput");
  setTimeout(() => inp.focus(), 50);
  const ok = () => { const v = inp.value.trim(); if (!v) { toast("Inserisci un nome", "error"); return; } m.close(); onOk(v); };
  m.el.querySelector('[data-act="c"]').onclick = m.close;
  m.el.querySelector('[data-act="ok"]').onclick = ok;
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") ok(); });
}

function renderMenusBody(body) {
  const menus = store.getMenus();
  const list = menus.length
    ? menus.map((mn) => `<button class="pick-row" data-menu="${mn.id}"><span class="day-row__icon">${iconHtml("book-bookmark")}</span><span class="day-row__name">${escapeHtml(mn.name)}<span class="have-badge">${(mn.recipeIds || []).length} ricette</span></span></button>`).join("")
    : `<div class="hint">Nessun menu. Crea un menu per raggruppare più ricette (es. "Cena con amici") e generare un'unica lista della spesa.</div>`;
  body.innerHTML = `${list}<button class="btn btn--primary btn--block" id="newMenu" style="margin-top:12px">${iconHtml("plus")} Nuovo menu</button>`;
  body.querySelectorAll(".pick-row").forEach((b) => b.addEventListener("click", () => openMenuSheet(b.dataset.menu)));
  body.querySelector("#newMenu").addEventListener("click", () => openPrompt("Nuovo menu", "Es. Cena con amici", async (name) => { await store.addMenu(name); renderHomeBody(); }));
}

function openMenuSheet(menuId) {
  const mn = store.getMenu(menuId);
  if (!mn) return;
  const recipes = store.getMenuRecipes(menuId);
  const rows = recipes.length
    ? recipes.map((r) => {
        const tool = store.getTool(r.toolId);
        return `<div class="day-row" data-recipe="${r.id}"><span class="day-row__icon">${tool ? iconHtml(tool.icon) : iconHtml("fork-knife")}</span><span class="day-row__name">${escapeHtml(r.title)}</span><button class="icon-btn icon-btn--danger" data-act="rem">${iconHtml("trash")}</button></div>`;
      }).join("")
    : `<div class="hint">Menu vuoto. Aggiungi qualche ricetta.</div>`;
  const m = openModal(`
    <h3 class="modal__title">${escapeHtml(mn.name)}</h3>
    <div>${rows}</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">
      <button class="btn btn--primary btn--block" data-act="add">${iconHtml("plus")} Aggiungi ricetta</button>
      ${recipes.length ? `<button class="btn btn--block" data-act="shop">${iconHtml("shopping-cart-simple")} Genera lista della spesa</button>` : ""}
    </div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn btn--ghost" data-act="rename">${iconHtml("pencil-simple")} Rinomina</button>
      <button class="btn btn--ghost" data-act="del" style="color:var(--danger)">${iconHtml("trash")} Elimina</button>
    </div>
  `);
  m.el.querySelectorAll(".day-row").forEach((row) => {
    const rid = row.dataset.recipe;
    row.querySelector('[data-act="rem"]').addEventListener("click", async (e) => { e.stopPropagation(); await store.toggleRecipeInMenu(menuId, rid); m.close(); openMenuSheet(menuId); });
    row.addEventListener("click", () => { m.close(); openRecipe(rid); });
  });
  m.el.querySelector('[data-act="add"]').addEventListener("click", () => { m.close(); openRecipePicker(async (rid) => { await store.toggleRecipeInMenu(menuId, rid); openMenuSheet(menuId); }); });
  const shopBtn = m.el.querySelector('[data-act="shop"]');
  if (shopBtn) shopBtn.addEventListener("click", async () => {
    const items = [];
    for (const r of store.getMenuRecipes(menuId)) for (const it of (r.ingredients || [])) items.push({ name: it.name, unit: it.unit || "", qty: it.qty != null ? it.qty : null, category: categorize(it.name) });
    const res = await store.addShoppingItems(items);
    m.close();
    toast(shoppingToast(res), "success");
  });
  m.el.querySelector('[data-act="rename"]').addEventListener("click", () => { m.close(); openPrompt("Rinomina menu", "Nome", async (name) => { await store.renameMenu(menuId, name); openMenuSheet(menuId); }, mn.name); });
  m.el.querySelector('[data-act="del"]').addEventListener("click", async () => {
    const ok = await confirmDialog({ title: "Eliminare il menu?", message: `"${mn.name}" verrà eliminato (le ricette restano).`, confirmText: "Elimina", danger: true });
    if (ok) { await store.deleteMenu(menuId); m.close(); renderHomeBody(); }
  });
}

// ---------------- Schermata: Impostazioni ----------------
// ---- Promemoria / notifiche (impostazioni) ----
function hourOptions(selected, from, to) {
  let s = "";
  for (let h = from; h <= to; h++) s += `<option value="${h}" ${h === selected ? "selected" : ""}>${String(h).padStart(2, "0")}:00</option>`;
  return s;
}
function notifyGroupHtml() {
  if (!notifySupported()) {
    return `<div class="setting-group"><div class="setting-row"><div>
      <div class="setting-row__label">Promemoria</div>
      <div class="setting-row__desc">Questo dispositivo non supporta le notifiche.</div>
    </div></div></div>`;
  }
  const on = notifyEnabled();
  const prefs = getNotifyPrefs();
  const iosHint = (!on && isIosNotInstalled())
    ? `<div class="setting-row__desc" style="color:var(--primary-2)">Su iPhone: tocca Condividi → "Aggiungi a Home", apri l'app installata e torna qui.</div>`
    : "";
  const main = `
    <div class="setting-row">
      <div>
        <div class="setting-row__label">Promemoria</div>
        <div class="setting-row__desc">Avvisi per scadenze e pasto di oggi. Appaiono quando apri l'app.${iosHint ? "" : ""}</div>
        ${iosHint}
      </div>
      <button class="btn ${on ? "" : "btn--primary"}" id="notifyToggle">${on ? "Disattiva" : "Attiva"}</button>
    </div>`;
  const sub = on ? `
    <div class="setting-row">
      <div>
        <div class="setting-row__label">Scadenze in dispensa</div>
        <div class="setting-row__desc">Avviso quando qualcosa sta per scadere.</div>
      </div>
      <input type="checkbox" id="ntExpiry" class="mini-check" ${prefs.expiry ? "checked" : ""} />
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-row__label">Anticipo scadenze</div>
        <div class="setting-row__desc">Quanti giorni prima avvisare.</div>
      </div>
      <select id="ntDays" class="mini-select">
        <option value="1" ${prefs.days === 1 ? "selected" : ""}>1 giorno</option>
        <option value="3" ${prefs.days === 3 ? "selected" : ""}>3 giorni</option>
        <option value="7" ${prefs.days === 7 ? "selected" : ""}>1 settimana</option>
      </select>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-row__label">Pasto di oggi</div>
        <div class="setting-row__desc">Promemoria di ciò che hai pianificato.</div>
      </div>
      <input type="checkbox" id="ntMeals" class="mini-check" ${prefs.meals ? "checked" : ""} />
    </div>
    ${pushReady() ? `<div class="setting-row">
      <div>
        <div class="setting-row__label">Anche ad app chiusa</div>
        <div class="setting-row__desc" id="pushStatus">Verifico…</div>
      </div>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-row__label">Ora del promemoria</div>
        <div class="setting-row__desc">Quando inviare l'avviso del mattino.</div>
      </div>
      <select id="ntHour" class="mini-select">${hourOptions(prefs.hour, 6, 14)}</select>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-row__label">Secondo avviso (sera)</div>
        <div class="setting-row__desc">Anteprima dei pasti di domani.</div>
      </div>
      <input type="checkbox" id="ntEvening" class="mini-check" ${prefs.evening ? "checked" : ""} />
    </div>
    ${prefs.evening ? `<div class="setting-row">
      <div>
        <div class="setting-row__label">Ora avviso serale</div>
        <div class="setting-row__desc">Quando inviare l'anteprima di domani.</div>
      </div>
      <select id="ntEveningHour" class="mini-select">${hourOptions(prefs.eveningHour, 17, 23)}</select>
    </div>` : ""}` : ""}
    <div class="setting-row">
      <div>
        <div class="setting-row__label">Prova le notifiche</div>
        <div class="setting-row__desc">Invia subito una notifica di esempio.</div>
      </div>
      <button class="btn" id="ntTest">Invia</button>
    </div>` : "";
  return `<div class="setting-group">${main}${sub}</div>`;
}

// Aggiorna i promemoria sul worker quando cambiano le preferenze (se iscritti).
async function pushRefreshSafe() {
  try { if (await isPushSubscribed()) await refreshReminders(store); } catch (e) { /* ignora */ }
}

// Mostra lo stato delle push e tenta l'iscrizione se mancante.
async function updatePushStatus(tryRegister) {
  const el = root.querySelector("#pushStatus");
  if (!el) return;
  try {
    let subscribed = await isPushSubscribed();
    if (!subscribed && tryRegister) {
      await registerPush(store);
      subscribed = true;
    }
    el.textContent = subscribed
      ? "Attive: le notifiche arrivano anche con l'app chiusa."
      : "Non attive su questo dispositivo.";
    el.style.color = subscribed ? "var(--primary-2)" : "";
  } catch (e) {
    el.textContent = "Non disponibili ora (riprovo alla prossima apertura).";
  }
}

function wireNotify() {
  const toggle = root.querySelector("#notifyToggle");
  if (toggle) toggle.addEventListener("click", async () => {
    if (notifyEnabled()) {
      disableNotify();
      await unregisterPush();
      toast("Promemoria disattivati");
    } else {
      try {
        await enableNotify();
        toast("Promemoria attivati", "success");
        if (pushReady()) registerPush(store).catch(() => {});
      } catch (e) {
        toast(e.message || "Impossibile attivare le notifiche", "error");
      }
    }
    renderImpostazioni();
  });
  const exp = root.querySelector("#ntExpiry");
  if (exp) exp.addEventListener("change", () => { setNotifyPref("expiry", exp.checked); pushRefreshSafe(); });
  const meals = root.querySelector("#ntMeals");
  if (meals) meals.addEventListener("change", () => { setNotifyPref("meals", meals.checked); pushRefreshSafe(); });
  const days = root.querySelector("#ntDays");
  if (days) days.addEventListener("change", () => { setNotifyPref("days", parseInt(days.value, 10)); pushRefreshSafe(); });
  const ntHour = root.querySelector("#ntHour");
  if (ntHour) ntHour.addEventListener("change", () => { setNotifyPref("hour", parseInt(ntHour.value, 10)); pushRefreshSafe(); });
  const ntEvening = root.querySelector("#ntEvening");
  if (ntEvening) ntEvening.addEventListener("change", () => { setNotifyPref("evening", ntEvening.checked); pushRefreshSafe(); renderImpostazioni(); });
  const ntEveningHour = root.querySelector("#ntEveningHour");
  if (ntEveningHour) ntEveningHour.addEventListener("change", () => { setNotifyPref("eveningHour", parseInt(ntEveningHour.value, 10)); pushRefreshSafe(); });
  const test = root.querySelector("#ntTest");
  if (test) test.addEventListener("click", async () => {
    try { await sendTestNotification(); toast("Notifica inviata", "success"); }
    catch (e) { toast("Invio non riuscito", "error"); }
  });
  if (pushReady() && notifyEnabled()) updatePushStatus(true);
}

function renderImpostazioni() {
  const info = handlers.getAccountInfo();
  let accountGroup = "";
  if (!info.configured) {
    accountGroup = `
      <div class="setting-group">
        <div class="setting-row">
          <div>
            <div class="setting-row__label">Backup nel cloud: non attivo</div>
            <div class="setting-row__desc">I dati sono salvati solo su questo telefono. Per attivare la sincronizzazione apri il file <b>README.md</b> e segui la guida (configurazione Firebase in <code>js/config.js</code>).</div>
          </div>
        </div>
      </div>`;
  } else if (info.email) {
    accountGroup = `
      <div class="setting-group">
        <div class="setting-row">
          <div>
            <div class="setting-row__label">Account</div>
            <div class="setting-row__desc">${escapeHtml(info.email)}</div>
          </div>
          <button class="btn" id="logoutBtn">Esci</button>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-row__label">Cambia email</div>
            <div class="setting-row__desc">Aggiorna l'indirizzo dell'account.</div>
          </div>
          <button class="btn" id="chEmailBtn">Cambia</button>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-row__label">Cambia password</div>
            <div class="setting-row__desc">Imposta una nuova password.</div>
          </div>
          <button class="btn" id="chPassBtn">Cambia</button>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-row__label">Backup nel cloud attivo ${iconHtml("cloud-check")}</div>
            <div class="setting-row__desc">Le ricette si sincronizzano automaticamente.</div>
          </div>
        </div>
      </div>`;
  }

  root.innerHTML = `
    <h1 class="page-title">Impostazioni</h1>
    <p class="page-sub">Account, backup e gestione dati.</p>
    ${accountGroup}
    <div class="setting-group">
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Come funziona l'app</div>
          <div class="setting-row__desc">Rivedi la guida con tutte le funzioni.</div>
        </div>
        <button class="btn" id="guideBtn">Apri</button>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Novità e modifiche</div>
          <div class="setting-row__desc">Lo storico degli aggiornamenti dell'app.</div>
        </div>
        <button class="btn" id="changelogBtn">Apri</button>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Diario di cucina</div>
          <div class="setting-row__desc">Statistiche: piatti più cucinati, ingredienti top…</div>
        </div>
        <button class="btn" id="statsBtn">Apri</button>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Convertitore in cucina</div>
          <div class="setting-row__desc">Tazze, cucchiai, grammi, °C/°F.</div>
        </div>
        <button class="btn" id="convBtn">Apri</button>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Nickname</div>
          <div class="setting-row__desc">${getNickname() ? "Come ti salutiamo: " + escapeHtml(getNickname()) : "Scegli come farti salutare."}</div>
        </div>
        <button class="btn" id="nickBtn">Cambia</button>
      </div>
      ${info.email === ADMIN_EMAIL ? `<div class="setting-row">
        <div>
          <div class="setting-row__label">Accessi utenti (admin)</div>
          <div class="setting-row__desc">Statistiche sugli accessi di tutti gli utenti.</div>
        </div>
        <button class="btn" id="accStatsBtn">Apri</button>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Avvisa tutti (admin)</div>
          <div class="setting-row__desc">Invia una notifica push per annunciare una novità.</div>
        </div>
        <button class="btn" id="bcastBtn">Invia</button>
      </div>` : ""}
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Tema</div>
          <div class="setting-row__desc">Aspetto chiaro o scuro.</div>
        </div>
        <select id="themeSel" class="mini-select">
          <option value="dark">🌙 Scuro</option>
          <option value="light">☀️ Chiaro</option>
        </select>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Colore dell'app</div>
          <div class="setting-row__desc">Scegli il colore d'accento.</div>
        </div>
        <div class="accent-row">${Object.entries(ACCENT_PRESETS).map(([k, a]) => `<button class="accent-sw ${getAccent() === k ? "is-on" : ""}" data-accent="${k}" style="background:${a.p}" title="${a.label}" aria-label="${a.label}"></button>`).join("")}</div>
      </div>
    </div>
    ${notifyGroupHtml()}
    <div class="setting-group">
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Esporta backup</div>
          <div class="setting-row__desc">Salva tutte le ricette in un file.</div>
        </div>
        <button class="btn" id="exportBtn">Esporta</button>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Importa backup</div>
          <div class="setting-row__desc">Ripristina da un file esportato.</div>
        </div>
        <button class="btn" id="importBtn">Importa</button>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Ricettario in PDF</div>
          <div class="setting-row__desc">Stampa o salva tutte le ricette in un PDF.</div>
        </div>
        <button class="btn" id="pdfBtn">Esporta</button>
      </div>
    </div>
    <div class="setting-group">
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Ripristina strumenti predefiniti</div>
          <div class="setting-row__desc">Aggiunge gli strumenti di base mancanti (senza duplicare né cancellare i tuoi).</div>
        </div>
        <button class="btn" id="seedBtn">Aggiungi</button>
      </div>
    </div>
    <p style="text-align:center;color:var(--text-soft);font-size:0.78rem;margin-top:24px">
      Fornelli · versione ${escapeHtml(APP_VERSION)}<br>Ricette online da TheMealDB
    </p>
    <input type="file" id="importFile" accept="application/json,.json" style="display:none" />
  `;

  const logoutBtn = root.querySelector("#logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    const ok = await confirmDialog({ title: "Uscire dall'account?", message: "Potrai rientrare con email e password.", confirmText: "Esci" });
    if (ok) await handlers.onLogout();
  });

  root.querySelector("#guideBtn").addEventListener("click", () => openGuide());
  root.querySelector("#changelogBtn").addEventListener("click", () => openChangelog(CHANGELOG, {}));
  root.querySelector("#statsBtn").addEventListener("click", () => openStats());
  root.querySelector("#convBtn").addEventListener("click", () => openConverter());
  root.querySelector("#nickBtn").addEventListener("click", () => openChangeNickname());
  const chEmailBtn = root.querySelector("#chEmailBtn");
  if (chEmailBtn) chEmailBtn.addEventListener("click", () => openChangeEmail());
  const chPassBtn = root.querySelector("#chPassBtn");
  if (chPassBtn) chPassBtn.addEventListener("click", () => openChangePassword());
  const accStatsBtn = root.querySelector("#accStatsBtn");
  if (accStatsBtn) accStatsBtn.addEventListener("click", () => openAccessStats());
  const bcastBtn = root.querySelector("#bcastBtn");
  if (bcastBtn) bcastBtn.addEventListener("click", () => openBroadcast());

  const themeSel = root.querySelector("#themeSel");
  themeSel.value = getTheme();
  themeSel.addEventListener("change", () => setTheme(themeSel.value));
  root.querySelectorAll(".accent-sw").forEach((b) => b.addEventListener("click", () => {
    setAccent(b.dataset.accent);
    renderImpostazioni();
  }));

  wireNotify();

  root.querySelector("#exportBtn").addEventListener("click", () => {
    const data = store.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ricettario-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup esportato", "success");
  });

  const fileInput = root.querySelector("#importFile");
  root.querySelector("#importBtn").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const ok = await confirmDialog({
        title: "Importare il backup?",
        message: "I dati attuali verranno sostituiti con quelli del file.",
        confirmText: "Importa",
        danger: true
      });
      if (ok) {
        await store.importData(data, { merge: false });
        toast("Backup importato", "success");
        navigate("strumenti");
      }
    } catch (e) {
      toast("File non valido", "error");
    }
    fileInput.value = "";
  });

  root.querySelector("#pdfBtn").addEventListener("click", () => exportRecipesPdf());

  root.querySelector("#seedBtn").addEventListener("click", async () => {
    const added = await store.seedDefaults();
    toast(added ? `${added} ${added === 1 ? "strumento aggiunto" : "strumenti aggiunti"}` : "Hai già tutti gli strumenti predefiniti", added ? "success" : "");
  });
}

// ---------------- Schermata di accesso (modalità cloud) ----------------
let loginMode = false;

export function setLoginMode(on) {
  loginMode = on;
}

export function renderLogin() {
  loginMode = true;
  let isRegister = false;
  const draw = () => {
    root.innerHTML = `
      <div style="max-width:380px;margin:8vh auto 0;text-align:center">
        <img class="brand-logo" src="icons/icon.svg" alt="" />
        <h1 class="page-title" style="text-align:center">Fornelli</h1>
        <p class="page-sub" style="text-align:center">${isRegister ? "Crea il tuo account per il backup nel cloud." : "Accedi per sincronizzare le tue ricette."}</p>
        <div class="setting-group" style="text-align:left;padding:16px">
          ${isRegister ? `<div class="field">
            <label>Come ti chiami? (per i saluti)</label>
            <input type="text" id="loginNick" autocomplete="nickname" placeholder="Es. Paola" />
          </div>` : ""}
          <div class="field">
            <label>Email</label>
            <input type="email" id="loginEmail" inputmode="email" autocomplete="username" placeholder="email@esempio.it" />
          </div>
          <div class="field" style="margin-bottom:6px">
            <label>Password</label>
            <input type="password" id="loginPass" autocomplete="${isRegister ? "new-password" : "current-password"}" placeholder="••••••" />
          </div>
        </div>
        <button class="btn btn--primary btn--block" id="loginSubmit">${isRegister ? "Crea account" : "Accedi"}</button>
        <button class="btn btn--ghost btn--block" id="toggleMode" style="margin-top:10px">
          ${isRegister ? "Hai già un account? Accedi" : "Non hai un account? Registrati"}
        </button>
        ${isRegister ? "" : `<button class="btn btn--ghost btn--block" id="forgotBtn" style="margin-top:4px;color:var(--text-soft)">Password dimenticata?</button>`}
      </div>
    `;
    const submit = async () => {
      const email = root.querySelector("#loginEmail").value.trim();
      const pass = root.querySelector("#loginPass").value;
      if (!email || !pass) { toast("Inserisci email e password", "error"); return; }
      const btn = root.querySelector("#loginSubmit");
      btn.disabled = true; btn.textContent = "Attendere...";
      try {
        if (isRegister) {
          const nick = (root.querySelector("#loginNick").value || "").trim();
          if (nick) setNickname(nick);
          await handlers.onSignup(email, pass, nick);
        } else await handlers.onLogin(email, pass);
      } catch (e) {
        toast(e.message || "Errore di accesso", "error");
        btn.disabled = false; btn.textContent = isRegister ? "Crea account" : "Accedi";
      }
    };
    root.querySelector("#loginSubmit").addEventListener("click", submit);
    root.querySelector("#loginPass").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    root.querySelector("#toggleMode").addEventListener("click", () => { isRegister = !isRegister; draw(); });
    const forgot = root.querySelector("#forgotBtn");
    if (forgot) forgot.addEventListener("click", () => openForgotPassword(root.querySelector("#loginEmail").value.trim()));
  };
  draw();
}
