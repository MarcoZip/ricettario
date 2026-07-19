// Interfaccia utente: rendering delle schermate, modali e gestione eventi.
import * as store from "./store.js";
import * as mealdb from "./mealdb.js";
import { ITALIAN_SITES } from "./sites.js";
import { iconHtml, rawIcon, ICON_PICKER, EMOJI_PICKER, resolveIcon } from "./icons.js";
import { parseList, ingredientText, formatQty, categorize, CATEGORY_ORDER } from "./ingredients.js";
import { estimateNutrition, enrichWithOFF } from "./nutrition.js";
import { notifySupported, notifyEnabled, getNotifyPrefs, setNotifyPref, enableNotify, disableNotify, sendTestNotification, isIosNotInstalled } from "./notify.js";
import { pushReady, isPushSubscribed, registerPush, refreshReminders, unregisterPush } from "./push.js";
import { importFromUrl, searchGz, searchBlogGz, searchMisya, searchCookist, searchRicettenonna, searchMoulinex, searchMoulinexFull, searchBimby, searchBimbyFull, searchEdamam, searchSpoon, spoonInfo, winePairing, analyzeDishPhoto, askChef, generateRecipe, importFromVideo, robotProgram, fridgeIngredients, receiptItems, parseReceiptText, planWeekAI, convertRecipe, appHelp, structureRecipeText, dishNameFromPhoto } from "./import-recipe.js";
import { HELP_TOPICS, findHelpTopics } from "./app-help.js";
import { translateRecipe, translateList, translateToEnglish, translateText } from "./translate.js";
import { shareRecipeImage, shareMenuImage } from "./share-image.js";
import { findSubstitutions } from "./substitutions.js";
import { GUEST_ALLERGENS, GUEST_DIETS, checkRecipeForGuests, guestsSummary, CUSTOM_CATS, getCustomTerms, addCustomTerm, removeCustomTerm } from "./diets.js";
import { estimateCost } from "./cost.js";
import { estimateImpact } from "./co2.js";
import { seasonalProduce, recipeSeasonalMatches, monthName, currentMonth } from "./seasonal.js";
import { convertMeasures } from "./measures.js";
import { getNickname, setNickname, getCover, setCover } from "./profile.js";
import { isImportConfigured, APP_VERSION, PUSH_WORKER_URL, SPOONACULAR_ENABLED, EDAMAM_ENABLED, WORKER_URL } from "./config.js";
import { CHANGELOG } from "./changelog.js";
import { fileToDataUrl } from "./image.js";
import { getTheme, setTheme, getAccent, setAccent, ACCENT_PRESETS, getTextScale, setTextScale, getContrast, setContrast, getFestaMode, setFesta, setFestaEventToday, getSeasonMode, setSeason, currentSeason, getGlassOn, setGlass, getPowerMode, setPowerMode, powerSaveActive } from "./theme.js";
import { getSoundOn, setSoundOn, playPling, playChime, playFlip, playSample } from "./sound.js";

// Tag suggeriti nel form ricetta.
const TAG_SUGGESTIONS = ["Primi", "Secondi", "Contorni", "Antipasti", "Dolci", "Colazione", "Merenda", "Zuppe", "Insalate", "Lievitati", "Veloce", "Vegetariano", "Vegano", "Pesce", "Carne", "Senza glutine", "Per ospiti", "Bambini"];
const ALLERGENS = ["Glutine", "Lattosio", "Uova", "Frutta a guscio", "Arachidi", "Pesce", "Crostacei", "Soia", "Sedano"];

// Vapore animato (CSS) sovrapposto alle foto dei piatti: caldo e appetitoso.
const STEAM_HTML = '<div class="steam" aria-hidden="true"><span class="steam__w"></span><span class="steam__w"></span><span class="steam__w"></span></div>';

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

// Celebrazione scenica quando si salva una nuova ricetta: coriandoli a pioggia
// dall'alto + un cartellino "Ricetta salvata!" che entra a molla e svanisce.
function celebrateSave(title) {
  haptic(30);
  playPling();
  const el = document.createElement("div");
  el.className = "save-cele";
  el.innerHTML = `<div class="save-cele__card"><div class="save-cele__emoji">🎉</div><div class="save-cele__t">Ricetta salvata!</div>${title ? `<div class="save-cele__sub">${escapeHtml(String(title).slice(0, 50))}</div>` : ""}</div>`;
  document.body.appendChild(el);
  try { navigator.vibrate && navigator.vibrate([30, 50, 30]); } catch (e) {}
  if (!reduceMotion) {
    const W = window.innerWidth;
    for (let i = 0; i < 5; i++) setTimeout(() => fxBurst(W * (0.12 + i * 0.19), 70, { count: 16 }), i * 90);
    setTimeout(() => fxBurstFrom(el.querySelector(".save-cele__card"), { emojis: ["🎉", "✨", "🍴", "❤️"], count: 14 }), 120);
  }
  setTimeout(() => el.remove(), reduceMotion ? 900 : 1800);
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

// Anima tutti i numeri con [data-countup] (con suffisso) e riempie gli anelli
// nutrizionali (.nring__fg[data-off]) la prima volta che compaiono.
function animateCountUps(scope) {
  const s = scope || document;
  s.querySelectorAll("[data-countup]").forEach((el) => {
    if (el.dataset.counted) return; el.dataset.counted = "1";
    const to = parseFloat(el.dataset.countup) || 0;
    const suffix = el.dataset.suffix || "";
    if (reduceMotion || to <= 0) { el.textContent = to + suffix; return; }
    const dur = 700, start = performance.now();
    const step = (now) => { const p = Math.min(1, (now - start) / dur); const e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(e * to) + suffix; if (p < 1) requestAnimationFrame(step); else el.textContent = to + suffix; };
    requestAnimationFrame(step);
  });
  s.querySelectorAll(".nring__fg[data-off]").forEach((c) => {
    if (c.dataset.animated) return; c.dataset.animated = "1";
    if (reduceMotion) { c.style.strokeDashoffset = c.dataset.off; return; }
    requestAnimationFrame(() => { c.style.strokeDashoffset = c.dataset.off; });
  });
}

// ---- "I tuoi numeri": dashboard animata che celebra l'uso dell'app ----
const STAT_RANKS = [
  { min: 100, emoji: "🏆", title: "Leggenda della cucina" },
  { min: 50, emoji: "⭐", title: "Maestra dei fornelli" },
  { min: 20, emoji: "🧑‍🍳", title: "Chef di famiglia" },
  { min: 5, emoji: "👩‍🍳", title: "Cuoca di casa" },
  { min: 0, emoji: "🍳", title: "Apprendista ai fornelli" }
];
const STAT_MILESTONES = [5, 20, 50, 100, 200, 365];
function statRankOf(cooked) { return STAT_RANKS.find((r) => cooked >= r.min) || STAT_RANKS[STAT_RANKS.length - 1]; }
function computeAppStats() {
  const recipes = (store.getAllRecipes && store.getAllRecipes()) || [];
  const tools = (store.getTools && store.getTools()) || [];
  const favorites = recipes.filter((r) => r.favorite).length;
  const cooked = recipes.reduce((s, r) => s + (r.cookCount || 0), 0);
  const withPhoto = recipes.filter((r) => r.photo).length;
  const tagCount = {};
  recipes.forEach((r) => (r.tags || []).forEach((t) => { const k = String(t).trim(); if (k) tagCount[k] = (tagCount[k] || 0) + 1; }));
  const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const ingCount = {};
  recipes.forEach((r) => (r.ingredients || []).forEach((it) => {
    const name = (it && it.name ? String(it.name) : "").toLowerCase().trim();
    if (name && name.length > 1) ingCount[name] = (ingCount[name] || 0) + 1;
  }));
  const topIng = Object.entries(ingCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const mostCooked = recipes.filter((r) => r.cookCount).sort((a, b) => (b.cookCount || 0) - (a.cookCount || 0))[0] || null;
  return { total: recipes.length, favorites, cooked, withPhoto, tools: tools.length, topTags, topIng, mostCooked };
}
function openStatsDashboard() {
  const s = computeAppStats();
  if (!s.total) {
    openModal(`<h3 class="modal__title">📊 I tuoi numeri</h3>
      <p style="text-align:center;padding:18px 6px;color:var(--text-soft)">Qui vedrai le tue statistiche di cucina appena salverai e cucinerai qualche ricetta. 🍳</p>
      <button class="btn btn--block" id="stClose">Chiudi</button>`);
    const b = document.querySelector("#modalRoot .modal #stClose"); if (b) b.onclick = closeAllModals;
    return;
  }
  const rank = statRankOf(s.cooked);
  const next = STAT_MILESTONES.find((m) => m > s.cooked) || null;
  const prev = [...STAT_MILESTONES].reverse().find((m) => m <= s.cooked) || 0;
  const ringFrac = next ? Math.max(0.04, (s.cooked - prev) / (next - prev)) : 1;
  const R = 52, CIRC = 2 * Math.PI * R, off = CIRC * (1 - ringFrac);
  const maxTag = Math.max(1, ...s.topTags.map((t) => t[1]));
  const maxIng = Math.max(1, ...s.topIng.map((t) => t[1]));
  const bars = (arr, max, cls) => arr.map(([label, n]) => `
    <div class="stbar">
      <div class="stbar__lbl">${escapeHtml(label)}</div>
      <div class="stbar__track"><div class="stbar__fill ${cls}" data-w="${Math.round((n / max) * 100)}"></div></div>
      <div class="stbar__n" data-countup="${n}">0</div>
    </div>`).join("");
  const tile = (emoji, value, label) => `
    <div class="sttile"><div class="sttile__e">${emoji}</div><div class="sttile__v" data-countup="${value}">0</div><div class="sttile__l">${label}</div></div>`;
  const html = `
    <h3 class="modal__title">📊 I tuoi numeri</h3>
    <div class="stats-scroll">
      <div class="stats-hero">
        <svg class="stats-ring" viewBox="0 0 120 120" width="132" height="132">
          <circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--surface-3)" stroke-width="9"/>
          <circle class="nring__fg stats-ring__fg" cx="60" cy="60" r="${R}" fill="none" stroke="url(#stGrad)" stroke-width="9" stroke-linecap="round"
            stroke-dasharray="${CIRC.toFixed(1)}" stroke-dashoffset="${CIRC.toFixed(1)}" data-off="${off.toFixed(1)}" transform="rotate(-90 60 60)"/>
          <defs><linearGradient id="stGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--primary-2)"/><stop offset="1" stop-color="var(--primary)"/></linearGradient></defs>
          <text x="60" y="55" text-anchor="middle" class="stats-ring__big" data-countup="${s.cooked}">0</text>
          <text x="60" y="74" text-anchor="middle" class="stats-ring__sub">cotture</text>
        </svg>
        <div class="stats-rank">${rank.emoji} ${escapeHtml(rank.title)}</div>
        <div class="stats-rank__sub">${next ? `Ancora <b>${next - s.cooked}</b> per il prossimo traguardo (${next})` : "Hai raggiunto tutti i traguardi! 🎉"}</div>
      </div>
      <div class="stats-tiles">
        ${tile("📚", s.total, s.total === 1 ? "ricetta" : "ricette")}
        ${tile("❤️", s.favorites, "preferiti")}
        ${tile("📷", s.withPhoto, "con foto")}
        ${tile("🔧", s.tools, s.tools === 1 ? "strumento" : "strumenti")}
      </div>
      ${s.topTags.length ? `<div class="stats-sec"><h3 class="stats-sec__t">🍽️ Le tue portate</h3>${bars(s.topTags, maxTag, "is-tag")}</div>` : ""}
      ${s.topIng.length ? `<div class="stats-sec"><h3 class="stats-sec__t">🥕 Ingredienti del cuore</h3>${bars(s.topIng, maxIng, "is-ing")}</div>` : ""}
      ${s.mostCooked ? `<div class="stats-sec"><h3 class="stats-sec__t">👑 La più cucinata</h3>
        <div class="stats-top">${s.mostCooked.photo ? `<img src="${escapeHtml(proxiedImg(s.mostCooked.photo))}" alt="" referrerpolicy="no-referrer"/>` : `<span class="stats-top__ph">🍴</span>`}
          <div><div class="stats-top__t">${escapeHtml(s.mostCooked.title)}</div><div class="stats-top__n">cucinata ${s.mostCooked.cookCount} ${s.mostCooked.cookCount === 1 ? "volta" : "volte"}</div></div></div></div>` : ""}
    </div>
    <button class="btn btn--primary btn--block" id="stJrn" style="margin-bottom:8px">📔 Sfoglia l'album di cucina</button>
    <button class="btn btn--block" id="stClose">Chiudi</button>`;
  const { el } = openModal(html);
  el.classList.add("modal--stats");
  el.querySelector("#stClose").onclick = closeAllModals;
  el.querySelector("#stJrn").onclick = () => { closeAllModals(); openCookJournal(); };
  animateCountUps(el);
  // Barre che crescono
  requestAnimationFrame(() => { el.querySelectorAll(".stbar__fill").forEach((b) => { b.style.width = (b.dataset.w || 0) + "%"; }); });
  // Coriandoli quando si supera un nuovo traguardo (una volta sola per traguardo).
  try {
    const reached = [...STAT_MILESTONES].reverse().find((m) => s.cooked >= m) || 0;
    const cheered = parseInt(localStorage.getItem("ricettario.statsCheer") || "0", 10);
    if (reached > cheered) {
      localStorage.setItem("ricettario.statsCheer", String(reached));
      setTimeout(() => { try { fxBurst(window.innerWidth / 2, window.innerHeight / 3, { count: 44 }); } catch (e) {} playPling(); toast(`🎉 Traguardo: ${reached} cotture!`, "success"); }, 350);
    }
  } catch (e) {}
}

// Cambio tema con "onda" circolare: il nuovo tema si espande da dove tocchi
// (View Transitions API). Fallback al cambio istantaneo se non supportato.
function switchThemeReveal(newTheme, originEl) {
  if (!document.startViewTransition || reduceMotion) { setTheme(newTheme); return; }
  let x = window.innerWidth / 2, y = window.innerHeight / 2;
  try { const r = originEl.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; } catch (e) {}
  document.documentElement.classList.add("theme-switching");
  const vt = document.startViewTransition(() => setTheme(newTheme));
  vt.ready.then(() => {
    const end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
      { duration: 520, easing: "cubic-bezier(0.3,0.7,0.2,1)", pseudoElement: "::view-transition-new(root)" }
    );
  }).catch(() => {});
  vt.finished.finally(() => document.documentElement.classList.remove("theme-switching"));
}

// Carta "Ricetta del giorno" 3D: si inclina seguendo il giroscopio del telefono,
// con un riflesso di luce che scorre. Su desktop/senza giroscopio resta ferma.
let gyroCardInited = false;
function initGyroCard() {
  if (gyroCardInited || reduceMotion || powerSaveActive()) return;
  if (typeof window.DeviceOrientationEvent === "undefined") return;
  gyroCardInited = true;
  let last = 0, b0 = null;
  window.addEventListener("deviceorientation", (e) => {
    if (e.beta == null && e.gamma == null) return;
    const now = performance.now();
    if (now - last < 33) return; // ~30 fps, evita aggiornamenti troppo frequenti
    last = now;
    const card = document.querySelector(".rotd");
    if (!card) return;
    if (b0 == null) b0 = e.beta || 0; // calibra sulla posizione iniziale di tenuta
    const ry = Math.max(-9, Math.min(9, (e.gamma || 0) * 0.55));   // sinistra/destra
    const rx = Math.max(-7, Math.min(7, ((e.beta || 0) - b0) * 0.4)); // avanti/indietro
    card.classList.add("is-tilting");
    card.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    const glare = card.querySelector(".rotd__glare");
    if (glare) glare.style.background = `radial-gradient(circle at ${(50 + ry * 4).toFixed(0)}% ${(50 - rx * 4).toFixed(0)}%, rgba(255,255,255,0.28), transparent 55%)`;
  }, { passive: true });
}

// Comparsa "a cascata": le sezioni della ricetta appaiono con dissolvenza e
// leggera salita mentre entrano nello schermo. Niente classe = nessun rischio
// di contenuto nascosto su browser senza IntersectionObserver o con riduci-movimento.
function wireScrollReveal() {
  if (reduceMotion || !("IntersectionObserver" in window)) return;
  const cards = root ? root.querySelectorAll(".section-card") : [];
  if (!cards.length) return;
  cards.forEach((c, i) => { c.classList.add("reveal"); c.style.setProperty("--reveal-d", (Math.min(i, 6) * 55) + "ms"); });
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("reveal-in"); obs.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -7% 0px", threshold: 0.08 });
  cards.forEach((c) => io.observe(c));
  setTimeout(() => cards.forEach((c) => c.classList.add("reveal-in")), 1600); // sicurezza: rivela comunque tutto
}

// Indicatore "a goccia" della barra in basso: scivola elastico sotto la voce
// attiva, con una piccola deformazione liquida durante lo spostamento.
let navBlobTimer = null;
function moveNavBlob() {
  const nav = document.querySelector(".bottom-nav");
  if (!nav) return;
  let blob = nav.querySelector(".bottom-nav__blob");
  if (!blob) {
    blob = document.createElement("span");
    blob.className = "bottom-nav__blob";
    blob.setAttribute("aria-hidden", "true");
    blob.innerHTML = "<i></i>";
    nav.insertBefore(blob, nav.firstChild);
  }
  const active = nav.querySelector(".bottom-nav__btn.is-active");
  if (!active) return;
  const x = active.offsetLeft + active.offsetWidth / 2;
  blob.style.transform = `translateX(${x}px) translateX(-50%)`;
  blob.classList.add("is-ready");
  if (!reduceMotion) {
    blob.classList.remove("is-moving"); void blob.offsetWidth; blob.classList.add("is-moving");
    clearTimeout(navBlobTimer);
    navBlobTimer = setTimeout(() => { if (blob) blob.classList.remove("is-moving"); }, 440);
  }
}

let root = null;
let currentRoute = "strumenti";
let currentToolId = null;
let currentRecipeId = null;
let detailServings = null; // porzioni scelte nella schermata ricetta
let ingChecks = new Set(); // ingredienti spuntati mentre si cucina (per ricetta aperta)
let convertUnits = false; // mostra le misure estere convertite in metrico
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
let mealSourceCounts = []; // [{label, count}] per il riepilogo "Tutte le fonti"
let pendingMealQuery = ""; // ricerca da avviare quando si apre il Ricettario online
let pendingVideoForImport = ""; // link video da agganciare alla prossima ricetta importata (flusso "cerca dal video")
let mealResults = null;
let mealLoading = false;
let mealError = "";
let mealTotal = null; // totale risultati Moulinex (può superare quelli mostrati)
let mealPage = 0; // pagina corrente dei risultati online
let mealElapsedMs = 0; // tempo impiegato dall'ultima ricerca online

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
// Data della Pasqua (algoritmo di Gauss/Anonymous Gregorian) per l'anno dato.
function easterDate(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const hh = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - hh - k) % 7, mm = Math.floor((a + 11 * hh + 22 * l) / 451);
  const month = Math.floor((hh + l - 7 * mm + 114) / 31), day = ((hh + l - 7 * mm + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
// Tema festività automatico: emoji/etichetta in base al periodo dell'anno.
function festiveInfo() {
  const n = new Date(), m = n.getMonth() + 1, d = n.getDate();
  if (m === 12 && d <= 26) return { emoji: "🎄", label: "Buone feste" };
  if ((m === 12 && d >= 27) || (m === 1 && d <= 6)) return { emoji: "✨", label: "Buon anno" };
  if (m === 10 && d >= 24) return { emoji: "🎃", label: "Dolcetto o scherzetto" };
  if (m === 2 && d === 14) return { emoji: "❤️", label: "Buon San Valentino" };
  const easter = easterDate(n.getFullYear());
  if (Math.abs((n - easter) / 86400000) <= 3) return { emoji: "🐣", label: "Buona Pasqua" };
  return null;
}
// Etichetta difficoltà (1 facile · 2 media · 3 difficile).
const DIFF_LABELS = { 1: "Facile", 2: "Media", 3: "Difficile" };
function diffLabel(d) { return DIFF_LABELS[d] || ""; }

// Indovina la categoria di una ricetta dal titolo (per il tag automatico all'import).
const CATEGORY_GUESS = [
  ["Dolci", /torta|crostat|biscott|tiramis|budino|gelat|muffin|plumcake|cioccolat|\bdolc|ciambell|cheesecake|brownie|panna cotta|profiterol|bign|cantucc|frittell|zeppol|crema pastic|semifreddo|sorbetto|meringa|strudel/i],
  ["Primi", /\bpast(a|e)\b|spaghett|risott|lasagn|gnocch|zupp|minestr|vellutat|tortell|ravioli|\bpenne\b|fusill|carbonara|amatricia|tagliatell|orecchiett|cannellon|maccheron|paella|cous ?cous|tagliolin|pappardell|trofie|pici/i],
  ["Secondi", /pollo|manzo|maiale|vitell|tacchin|polpett|arrosto|scaloppin|cotolett|spezzatin|hamburger|salsicc|pesce|salmon|tonno|merluzz|frittata|\buova\b|stufat|brasato|bistecc|filetto|spiedin|involtin|baccal|seppi|calamar|gamber|polpo|orata|branzino/i],
  ["Antipasti", /antipast|bruschett|tartin|crostin|tartare|carpaccio|sfizi|stuzzichin/i],
  ["Contorni", /contorn|insalat|verdur|patate al|pur[èe]\b|gratin|caponata|peperonata|spinaci/i],
  ["Pane e pizza", /\bpane\b|pizza|focacc|panin|piadin|grissin|baguette|brioche|pan ?brioche|pizzett/i]
];
function guessCategory(title) {
  const t = (title || "").toLowerCase();
  for (const [cat, re] of CATEGORY_GUESS) if (re.test(t)) return cat;
  return null;
}
function diffDots(d) { if (!d) return ""; return `<span class="diffdots">${[1, 2, 3].map((i) => `<span class="diffdot${i <= d ? " on" : ""}"></span>`).join("")}</span>`; }

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

// Alcuni siti (es. Misya) bloccano il caricamento delle immagini dal telefono:
// le facciamo passare dal worker (le scarica lato server e le riserve).
// Preferenze utente (localStorage): diete, porzioni predefinite, sezioni home.
function prefBool(key, def = false) { try { const v = localStorage.getItem("ricettario.pref." + key); return v == null ? def : v === "1"; } catch (e) { return def; } }
function setPrefBool(key, val) { try { localStorage.setItem("ricettario.pref." + key, val ? "1" : "0"); } catch (e) {} }
function prefNum(key, def) { const v = parseInt(localStorage.getItem("ricettario.pref." + key), 10); return isNaN(v) ? def : v; }
function setPrefNum(key, val) { try { localStorage.setItem("ricettario.pref." + key, String(val)); } catch (e) {} }
// Una ricetta è adatta alle preferenze alimentari impostate?
const MEAT_FISH = /pollo|manzo|maial|vitell|tacchin|salsicc|prosciutt|pancett|guancial|speck|wurstel|würstel|bresaol|salame|mortadell|bacon|carne|macinat|hamburger|polpett|spezzatin|arrosto|cotolett|scaloppin|bistecc|agnello|coniglio|anatra|tonno|salmon|merluzz|baccal|gamber|gambero|vongol|cozze|calamar|seppi|pesce|acciug|sgombro|orata|branzino|polpo|frutti di mare|prosciutto|speck/i;
function matchesDiet(r) {
  if (prefBool("dietNg") && (r.allergens || []).includes("Glutine")) return false;
  if (prefBool("dietNl") && (r.allergens || []).includes("Lattosio")) return false;
  if (prefBool("dietVeg")) {
    const txt = ((r.ingredients || []).map((i) => i.name).join(" ") + " " + (r.title || "")).toLowerCase();
    if (MEAT_FISH.test(txt)) return false;
  }
  return true;
}
function anyDietPref() { return prefBool("dietVeg") || prefBool("dietNg") || prefBool("dietNl"); }

const PROXY_IMG_HOSTS = /(^|\.)misya\.info$/i;
function proxiedImg(url) {
  if (!url || !WORKER_URL) return url || "";
  try { if (PROXY_IMG_HOSTS.test(new URL(url).host)) return `${WORKER_URL}/img?u=${encodeURIComponent(url)}`; } catch (e) { /* url non valido */ }
  return url;
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

// Chiude tutti i modali aperti (usato quando si esce dai modali per andare in
// un'altra schermata, es. la ricerca online dal modale "Importa da video").
function closeAllModals() {
  document.querySelectorAll("#modalRoot .modal-backdrop").forEach((b) => b.remove());
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

// ---------------- Casa condivisa (lista spesa in tempo reale) ----------------
function getHousehold() { try { return (localStorage.getItem("ricettario.household") || "").trim(); } catch (e) { return ""; } }
function setHousehold(code) { try { if (code) localStorage.setItem("ricettario.household", code); else localStorage.removeItem("ricettario.household"); } catch (e) {} }
function genHouseCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const arr = (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint32Array(6)) : null;
  for (let i = 0; i < 6; i++) { const n = arr ? arr[i] : Math.floor(Math.random() * A.length); s += A[n % A.length]; }
  return s;
}
function openHouseholdSheet() {
  const info = handlers.getAccountInfo();
  if (!info.cloud) { toast("Disponibile solo con l'accesso cloud (backup attivo)", "error"); return; }
  const cur = getHousehold();
  const apply = (code) => { setHousehold(code); toast(code ? "Casa condivisa attiva" : "Uscito dalla casa", "success"); setTimeout(() => location.reload(), 800); };
  if (cur) {
    const m = openModal(`
      <h3 class="modal__title">👥 Casa condivisa</h3>
      <p class="hint" style="margin-top:-8px;margin-bottom:12px">La lista della spesa è <b>condivisa in tempo reale</b>. Chi entra con questo codice vede e modifica la stessa lista.</p>
      <div class="house-code">${escapeHtml(cur)}</div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button class="btn btn--primary" id="hShare">${iconHtml("arrow-square-out")} Condividi il codice</button>
        <button class="btn btn--ghost" id="hLeave" style="color:var(--danger)">Esci dalla casa</button>
      </div>
      <div class="modal__actions"><button class="btn" data-act="ok">Chiudi</button></div>
    `);
    m.el.querySelector('[data-act="ok"]').onclick = m.close;
    m.el.querySelector("#hShare").onclick = async () => {
      const txt = `Entra nella nostra lista della spesa su Fornelli con il codice: ${cur}`;
      try { if (navigator.share) await navigator.share({ text: txt }); else { await navigator.clipboard.writeText(cur); toast("Codice copiato", "success"); } } catch (e) {}
    };
    m.el.querySelector("#hLeave").onclick = async () => {
      const ok = await confirmDialog({ title: "Uscire dalla casa?", message: "La lista tornerà quella personale di questo account.", confirmText: "Esci", danger: true });
      if (ok) { m.close(); apply(""); }
    };
  } else {
    const m = openModal(`
      <h3 class="modal__title">👥 Casa condivisa</h3>
      <p class="hint" style="margin-top:-8px;margin-bottom:12px">Condividi la <b>lista della spesa</b> e i <b>menù delle feste</b> in tempo reale con un'altra persona (es. tu e Federica). Crea una casa e dalle il codice, oppure entra con il codice ricevuto. Ricette e dispensa restano personali.</p>
      <button class="btn btn--primary btn--block" id="hCreate" style="margin-bottom:12px">${iconHtml("plus")} Crea una casa</button>
      <div class="field"><label>Hai ricevuto un codice?</label><div style="display:flex;gap:8px"><input type="text" id="hCode" placeholder="Es. K7M2QX" style="flex:1;min-width:0;text-transform:uppercase" /><button class="btn" id="hJoin">Entra</button></div></div>
      <div class="hint" style="margin-top:8px">Nota: gli articoli già in lista su questo account non si spostano; la lista condivisa parte da quella della casa.</div>
      <div class="modal__actions"><button class="btn" data-act="ok">Chiudi</button></div>
    `);
    m.el.querySelector('[data-act="ok"]').onclick = m.close;
    m.el.querySelector("#hCreate").onclick = () => apply(genHouseCode());
    m.el.querySelector("#hJoin").onclick = () => {
      const c = (m.el.querySelector("#hCode").value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (c.length < 4) { toast("Codice non valido", "error"); return; }
      apply(c);
    };
  }
}

// ---------------- Navigazione ----------------
export function mount(rootEl) {
  root = rootEl;
  // Ricetta condivisa via link (#r=…): la teniamo da parte e la proponiamo dopo l'accesso.
  try { if (location.hash.indexOf("#r=") === 0) { pendingSharedRecipe = location.hash.slice(3); history.replaceState(null, "", location.pathname + location.search); } } catch (e) {}
  // Inietta le icone Phosphor dove indicato nell'HTML (es. barra di navigazione).
  document.querySelectorAll("[data-ph]").forEach((el) => { el.innerHTML = rawIcon(el.dataset.ph); });
  store.subscribe(() => render());
  // Casa condivisa: avvisa quando l'ALTRA persona aggiunge qualcosa alla lista.
  let shopSeenIds = null;
  store.subscribe((st) => {
    const items = st.shopping || [];
    const ids = new Set(items.map((i) => i.id));
    if (shopSeenIds === null) { shopSeenIds = ids; return; } // primo carico: nessun avviso
    if (getHousehold() && store.getMode() === "cloud") {
      const me = (getNickname() || "").trim();
      const added = items.filter((i) => !shopSeenIds.has(i.id) && i.by && i.by !== me && !i.checked);
      if (added.length) {
        const names = added.slice(0, 3).map((i) => i.name).join(", ");
        toast(`👥 ${added[0].by} ha aggiunto: ${names}${added.length > 3 ? "…" : ""}`, "success");
        haptic(20);
      }
    }
    shopSeenIds = ids;
  });
  document.querySelectorAll(".bottom-nav__btn").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.route));
  });
  const help = document.getElementById("helpBtn");
  if (help) {
    try { if (!localStorage.getItem("ricettario.help.seen")) help.classList.add("hot-dot"); } catch (e) {}
    help.addEventListener("click", () => {
      try { localStorage.setItem("ricettario.help.seen", "1"); } catch (e) {}
      help.classList.remove("hot-dot");
      openHelpAssistant();
    });
  }
  // Guida al primo avvio: mostrala SOLO dopo lo splash (e fuori dal login), e
  // segna "vista" solo quando appare davvero — così non si perde dietro lo splash.
  try {
    if (!localStorage.getItem("ricettario.guide.v8")) {
      whenReadyForPopup(() => { localStorage.setItem("ricettario.guide.v8", "1"); openGuide(true); });
    }
  } catch {}
  setupBackHandler();
  setupRipple();
  setupAurora();
  window.addEventListener("resize", moveNavBlob);
  setupGlassSheen();
  checkPrepReminders();
  setInterval(checkPrepReminders, 60000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { checkPrepReminders(); if (currentRoute === "strumenti" && currentRecipeId) acquireDetailWake(); }
  });
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

// "Vetro liquido": aggiorna la variabile --sheen con lo scroll, così il riflesso
// di luce sulle superfici di vetro scorre mentre si naviga. Throttle con rAF.
function setupGlassSheen() {
  let pending = false;
  const upd = () => {
    pending = false;
    const y = window.scrollY || window.pageYOffset || 0;
    document.documentElement.style.setProperty("--sheen", String(Math.round(y)));
  };
  window.addEventListener("scroll", () => {
    if (pending) return; pending = true; requestAnimationFrame(upd);
  }, { passive: true });
  upd();
}

// Sfondo "aurora" animato dietro i contenuti (soft, gated reduce-motion).
function setupAurora() {
  if (reduceMotion || document.getElementById("aurora")) return;
  const a = document.createElement("div");
  a.id = "aurora";
  document.body.insertBefore(a, document.body.firstChild);
}

// (L'atmosfera stagionale sullo sfondo è ora gestita da applySeason() in theme.js,
//  con anche l'estate e un interruttore in Opzioni.)

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
// Esegue cb solo quando l'app è davvero pronta a mostrare un popup: niente
// splash in corso, niente schermata di login, niente altri popup/guida aperti.
// Evita che benvenuto/novità "lampeggino" dietro lo splash e si perdano.
function whenReadyForPopup(cb, tries) {
  tries = tries || 0;
  const blocked = document.getElementById("splash") || loginMode ||
    document.querySelector("#modalRoot .modal-backdrop") || document.querySelector(".guide");
  if (blocked) { if (tries < 150) setTimeout(() => whenReadyForPopup(cb, tries + 1), 200); return; }
  cb();
}

export function maybeShowWhatsNew() {
  try {
    const KEY = "ricettario.seenVersion";
    const seen = localStorage.getItem(KEY);
    if (seen === APP_VERSION) return; // già vista questa versione
    if (!seen) { localStorage.setItem(KEY, APP_VERSION); return; } // primo avvio assoluto
    const idx = CHANGELOG.findIndex((c) => c.v === seen);
    const all = idx > 0 ? CHANGELOG.slice(0, idx) : (idx === 0 ? [] : [CHANGELOG[0]]);
    // Nel popup solo le novità "degne di nota" (niente correzioni minori).
    const fresh = all.filter((c) => !c.minor);
    if (!fresh.length) { localStorage.setItem(KEY, APP_VERSION); return; }
    // Segna "vista" solo quando la finestra appare DAVVERO (dopo lo splash), così
    // non viene consumata durante un lampo dello splash o della schermata di login.
    whenReadyForPopup(() => { localStorage.setItem(KEY, APP_VERSION); openChangelog(fresh, { whatsNew: true }); });
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

// Esporta/stampa una singola ricetta come scheda PDF.
function exportRecipePdf(r) {
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${escapeHtml(r.title)}</title><style>${PRINT_CSS}</style></head><body><h1>${escapeHtml(r.title)}</h1>${recipePrintHtml(r)}<script>window.onload=function(){setTimeout(function(){window.print();},500);};<\/script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) { toast("Consenti i popup del browser per esportare", "error"); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

// Esporta in PDF tutte le ricette di una raccolta/collezione.
function exportCollectionPdf(title, recipes) {
  if (!recipes || !recipes.length) { toast("Raccolta vuota", "error"); return; }
  const body = recipes.map(recipePrintHtml).join("");
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head><body><h1>${escapeHtml(title)}</h1>${body}<script>window.onload=function(){setTimeout(function(){window.print();},500);};<\/script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) { toast("Consenti i popup del browser per esportare", "error"); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

// Modalità chef: legge ad alta voce l'intera ricetta (titolo, ingredienti, passi).
// Ritorna una funzione per fermare la lettura.
function speakRecipe(r) {
  if (!window.speechSynthesis) { toast("Lettura vocale non supportata", "error"); return null; }
  const parts = [r.title];
  const ings = Array.isArray(r.ingredients) ? r.ingredients : [];
  if (ings.length) { parts.push("Ingredienti."); ings.forEach((it) => parts.push(ingredientText(it))); }
  const steps = Array.isArray(r.steps) ? r.steps : [];
  if (steps.length) { parts.push("Preparazione."); steps.forEach((s, i) => parts.push(`Passo ${i + 1}. ${s}`)); }
  try {
    window.speechSynthesis.cancel();
    for (const p of parts) { const u = new SpeechSynthesisUtterance(p); u.lang = "it-IT"; window.speechSynthesis.speak(u); }
  } catch (e) { return null; }
  return () => { try { window.speechSynthesis.cancel(); } catch (e) {} };
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

  // Grafico: quante volte hai cucinato negli ultimi 6 mesi (dai cookLog).
  const monthly = {};
  recipes.forEach((r) => (r.cookLog || []).forEach((ts) => { const ym = String(ts).slice(0, 7); if (/^\d{4}-\d{2}$/.test(ym)) monthly[ym] = (monthly[ym] || 0) + 1; }));
  const MESI_SHORT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
  const nowD = new Date();
  const months6 = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(nowD.getFullYear(), nowD.getMonth() - i, 1); const ym = d.toISOString().slice(0, 7); months6.push({ label: MESI_SHORT[d.getMonth()], n: monthly[ym] || 0 }); }
  const maxN = Math.max(1, ...months6.map((x) => x.n));
  const chartHtml = totalCooked ? `<div class="stat-block"><div class="stat-block__t">${iconHtml("fire")} Cucinato negli ultimi 6 mesi</div>
    <div class="bar-chart">${months6.map((x) => `<div class="bar-col"><span class="bar-n">${x.n}</span><div class="bar" style="height:${Math.round(x.n / maxN * 64) + 3}px"></div><span class="bar-lbl">${x.label}</span></div>`).join("")}</div></div>` : "";
  const toolHtml = listBlock(`${iconHtml("cooking-pot")} Strumenti più usati`, toolStats.slice(0, 5).map((t) => `<div class="stat-row"><span>${iconHtml(t.icon)} ${escapeHtml(t.name)}</span><b>${t.cooked ? t.cooked + "×" : t.n + " ric."}</b></div>`));

  const m = openModal(`
    <h3 class="modal__title">${iconHtml("fire")} Diario di cucina</h3>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="btn btn--ghost" id="jrnBtn" style="flex:1">📔 Album</button>
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
      ${chartHtml}${topHtml}${recentHtml}${toolHtml}${ingHtml}
    </div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>
  `);
  m.el.querySelector('[data-act="ok"]').onclick = m.close;
  m.el.querySelector("#jrnBtn").onclick = () => { m.close(); openCookJournal(); };
  m.el.querySelector("#achBtn").onclick = openAchievements;
  m.el.querySelector("#calBtn").onclick = openCookCalendar;
  m.el.querySelectorAll(".stat-num").forEach((el) => countUp(el, parseInt(el.textContent, 10) || 0));
}

// "Muro delle ricette": galleria a mosaico (masonry) di tutte le ricette con foto.
function openPhotoWall() {
  let recipes = store.getAllRecipes().filter((r) => r.photo);
  if (!recipes.length) { toast("Nessuna ricetta con foto ancora", "error"); return; }
  recipes = recipes.slice().sort((a, b) => (b.cookCount || 0) - (a.cookCount || 0) || (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const items = recipes.map((r) => {
    const tool = store.getTool(r.toolId);
    const fav = r.favorite ? `<span class="pwall__fav">${iconHtml("heart")}</span>` : "";
    return `<button class="pwall__it" data-id="${r.id}">
      <img src="${escapeHtml(proxiedImg(r.photo))}" alt="" loading="lazy" referrerpolicy="no-referrer"/>
      ${fav}
      <span class="pwall__cap">${escapeHtml(r.title)}${tool ? `<span class="pwall__tool">${iconHtml(tool.icon)} ${escapeHtml(tool.name)}</span>` : ""}</span>
    </button>`;
  }).join("");
  const { el } = openModal(`
    <h3 class="modal__title">🖼️ Muro delle ricette</h3>
    <p class="hint" style="margin-top:-6px">${recipes.length} ricette con foto · tocca per aprire</p>
    <div class="pwall-scroll"><div class="pwall">${items}</div></div>
    <button class="btn btn--block" id="pwClose">Chiudi</button>`);
  el.classList.add("modal--wall");
  el.querySelector("#pwClose").onclick = closeAllModals;
  el.querySelectorAll(".pwall__it").forEach((b) => b.addEventListener("click", () => { closeAllModals(); openRecipe(b.dataset.id); }));
}

// "Album del diario": le volte che hai cucinato in una bella linea del tempo
// con foto, raggruppata per mese (dai cookLog già raccolti).
const MESI_FULL = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
function openCookJournal() {
  const diary = store.getCookDiary(200);
  if (!diary.length) { toast("Il diario è ancora vuoto: completa o segna qualche ricetta come cucinata", "error"); return; }
  const groups = [];
  let cur = null;
  diary.forEach((e) => {
    const d = new Date(e.ts);
    if (isNaN(d)) return;
    const key = d.getFullYear() + "-" + d.getMonth();
    if (!cur || cur.key !== key) { cur = { key, label: MESI_FULL[d.getMonth()] + " " + d.getFullYear(), items: [] }; groups.push(cur); }
    cur.items.push({ e, r: store.getRecipe(e.recipeId), day: d.getDate() });
  });
  const entry = ({ e, r, day }) => {
    const photo = r && r.photo ? `<img src="${escapeHtml(proxiedImg(r.photo))}" alt="" loading="lazy" referrerpolicy="no-referrer"/>` : `<span class="jrn__ph">🍴</span>`;
    const stars = r && r.rating ? `<span class="jrn__stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span>` : "";
    return `<button class="jrn__it"${r ? ` data-id="${r.id}"` : ""}>
      <span class="jrn__media">${photo}</span>
      <span class="jrn__body"><span class="jrn__t">${escapeHtml(e.title)}</span><span class="jrn__meta">il giorno ${day}</span>${stars}</span>
    </button>`;
  };
  const html = groups.map((g) => `<div class="jrn__month">${escapeHtml(g.label)}</div><div class="jrn__list">${g.items.map(entry).join("")}</div>`).join("");
  const tot = diary.length;
  const { el } = openModal(`
    <h3 class="modal__title">📔 Album di cucina</h3>
    <p class="hint" style="margin-top:-6px">${tot} ${tot === 1 ? "piatto cucinato" : "piatti cucinati"}, dal più recente</p>
    <div class="jrn-scroll">${html}</div>
    <button class="btn btn--block" id="jrnClose">Chiudi</button>`);
  el.classList.add("modal--jrn");
  el.querySelector("#jrnClose").onclick = closeAllModals;
  el.querySelectorAll(".jrn__it[data-id]").forEach((b) => b.addEventListener("click", () => { closeAllModals(); openRecipe(b.dataset.id); }));
}

// "Cosa cucino stasera?": assistente che combina dispensa, stagione, tempo e
// preferenze per proporre l'idea giusta, con estrazione animata e rilancio.
function tonightCandidates(opts) {
  const recipes = store.getAllRecipes();
  if (!recipes.length) return [];
  const month = currentMonth();
  const maxT = opts.time || 0;
  const pantry = {};
  try { store.suggestFromPantry().forEach((s) => { if (s && s.recipe) pantry[s.recipe.id] = s; }); } catch (e) {}
  const out = recipes.map((r) => {
    let score = 0; const reasons = [];
    const p = pantry[r.id];
    if (p && p.total) {
      const frac = (p.have || 0) / p.total;
      if (frac >= 0.999) { score += 50; reasons.push("hai tutti gli ingredienti"); }
      else if (frac >= 0.6) { score += 28; reasons.push(`ti manca poco${p.missing ? ` (${p.missing})` : ""}`); }
    }
    if (recipeSeasonalMatches(r, month).length) { score += 18; reasons.push("di stagione"); }
    if (maxT && r.time) {
      if (r.time <= maxT) { score += 14; reasons.push(`pronta in ${r.time}′`); }
      else score -= 100; // troppo lunga per il tempo scelto
    } else if (!maxT && r.time && r.time <= 30) { score += 6; }
    if (r.favorite) { score += 8; reasons.push("tra i preferiti"); }
    if (r.lastCooked) {
      const days = (Date.now() - new Date(r.lastCooked)) / 86400000;
      if (days < 3) score -= 16; else if (days > 30) score += 4;
    }
    score += Math.random() * 9; // pizzico di casualità: rilanci sempre diversi
    return { r, score, reasons };
  }).filter((x) => x.score > -50);
  out.sort((a, b) => b.score - a.score);
  return out;
}
function openTonightAssistant() {
  if (!store.getAllRecipes().length) { toast("Aggiungi prima qualche ricetta", "error"); return; }
  let time = 0;
  const { el } = openModal(`
    <h3 class="modal__title">🍽️ Cosa cucino stasera?</h3>
    <p class="hint" style="margin-top:-6px">Quanto tempo hai? Poi ti propongo l'idea giusta combinando dispensa, stagione e gusti.</p>
    <div class="tn-times">
      <button class="chip tn-time is-on" data-t="0">⏳ Tempo libero</button>
      <button class="chip tn-time" data-t="30">≤ 30 min</button>
      <button class="chip tn-time" data-t="15">≤ 15 min</button>
    </div>
    <div id="tnReveal" class="tn-reveal"></div>
    <button class="btn btn--primary btn--block" id="tnRoll">🎲 Proponimi un piatto</button>`);
  const reveal = el.querySelector("#tnReveal");
  el.querySelectorAll(".tn-time").forEach((c) => c.addEventListener("click", () => {
    el.querySelectorAll(".tn-time").forEach((x) => x.classList.remove("is-on"));
    c.classList.add("is-on"); time = parseInt(c.dataset.t, 10) || 0;
  }));
  const showPick = (c) => {
    const r = c.r;
    reveal.innerHTML = `
      <div class="tn-card">
        ${r.photo ? `<img src="${escapeHtml(proxiedImg(r.photo))}" alt="" referrerpolicy="no-referrer"/>` : `<div class="tn-card__ph">🍽️</div>`}
        <div class="tn-card__body">
          <div class="tn-card__t">${escapeHtml(r.title)}</div>
          ${c.reasons.length ? `<div class="tn-card__why">${c.reasons.slice(0, 3).map((x) => `<span class="tn-why">${escapeHtml(x)}</span>`).join("")}</div>` : ""}
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn btn--ghost" id="tnAgain" style="flex:1">🎲 Rilancia</button>
        <button class="btn btn--primary" id="tnGo" style="flex:1">${iconHtml("cooking-pot")} Cuciniamo</button>
      </div>`;
    reveal.querySelector("#tnGo").onclick = () => { closeAllModals(); openRecipe(r.id); };
    reveal.querySelector("#tnAgain").onclick = roll;
  };
  const roll = () => {
    const pool = tonightCandidates({ time });
    if (!pool.length) { reveal.innerHTML = `<div class="hint" style="text-align:center;padding:10px">Nessuna proposta adatta. Prova a togliere il limite di tempo o aggiungi ricette.</div>`; return; }
    const topN = pool.slice(0, Math.min(8, pool.length));
    if (reduceMotion) { showPick(topN[0]); return; }
    let n = 0; const spins = 11;
    const iv = setInterval(() => {
      if (!reveal.isConnected) { clearInterval(iv); return; }
      reveal.innerHTML = `<div class="tn-spin">${escapeHtml(topN[n % topN.length].r.title)}</div>`;
      n++;
      if (n >= spins) { clearInterval(iv); haptic(20); playPling(); showPick(topN[0]); }
    }, 80);
  };
  el.querySelector("#tnRoll").onclick = roll;
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

// "Sfide della settimana": 3 mini-obiettivi che ruotano ogni lunedì. Diverse dai
// Traguardi (fissi a vita): qui conta solo cosa cucini in questa settimana.
const CHALLENGE_POOL = [
  { id: "season", e: "🍂", t: "Di stagione", goal: 1, hint: "Cucina un piatto con ingredienti di stagione", test: (ev) => ev.some((x) => recipeSeasonalMatches(x.r, currentMonth()).length) ? 1 : 0 },
  { id: "new", e: "🆕", t: "Qualcosa di nuovo", goal: 1, hint: "Cucina una ricetta che non avevi mai fatto", test: (ev, wk) => ev.some((x) => (x.r.cookLog || []).every((ts) => new Date(ts) >= wk)) ? 1 : 0 },
  { id: "three", e: "🔥", t: "Tre ai fornelli", goal: 3, hint: "Cucina almeno 3 volte in settimana", test: (ev) => ev.length },
  { id: "tools", e: "🧰", t: "Cambio strumento", goal: 2, hint: "Usa 2 strumenti di cottura diversi", test: (ev) => new Set(ev.map((x) => x.r.toolId).filter(Boolean)).size },
  { id: "pantry", e: "♻️", t: "Anti-spreco", goal: 1, hint: "Cucina usando qualcosa che hai in dispensa", test: (ev) => ev.some((x) => recipeUsesPantry(x.r)) ? 1 : 0 },
  { id: "sweet", e: "🍰", t: "Coccola dolce", goal: 1, hint: "Prepara un dolce o un dessert", test: (ev) => ev.some((x) => /dolc|dessert|torta|biscott|crostat|budino|tiramis|musse|mousse|gelato/.test(moodText(x.r))) ? 1 : 0 },
  { id: "veg", e: "🥗", t: "Verde in tavola", goal: 1, hint: "Cucina un piatto vegetariano o di verdure", test: (ev) => ev.some((x) => /insalat|verdur|vegetarian|legumi|minestr|zupp|vegan/.test(moodText(x.r))) ? 1 : 0 },
  { id: "fav", e: "❤️", t: "Ritorno al cuore", goal: 1, hint: "Cucina una delle tue ricette preferite", test: (ev) => ev.some((x) => x.r.favorite) ? 1 : 0 }
];
function cookedThisWeek() {
  const start = startOfWeek(new Date());
  const ev = [];
  store.getAllRecipes().forEach((r) => (r.cookLog || []).forEach((ts) => { const d = new Date(ts); if (!isNaN(d) && d >= start) ev.push({ r, d }); }));
  return ev;
}
function recipeUsesPantry(r) {
  let pantry = [];
  try { pantry = store.getPantry() || []; } catch (e) {}
  const names = pantry.map((p) => (p.name || "").toLowerCase().trim()).filter((n) => n.length > 1);
  if (!names.length) return false;
  return (r.ingredients || []).some((it) => { const n = (it.name || "").toLowerCase().trim(); return n && names.some((pn) => n.includes(pn) || pn.includes(n)); });
}
function weeklyChallenges() {
  const wk = startOfWeek(new Date());
  const seed = Math.floor(wk.getTime() / (7 * 86400000));
  const ev = cookedThisWeek();
  const startIdx = ((seed % CHALLENGE_POOL.length) + CHALLENGE_POOL.length) % CHALLENGE_POOL.length;
  const chosen = [0, 1, 2].map((i) => CHALLENGE_POOL[(startIdx + i) % CHALLENGE_POOL.length]);
  return { seed, list: chosen.map((c) => ({ c, prog: Math.min(c.goal, c.test(ev, wk)) })) };
}
function openWeeklyChallenges() {
  const { seed, list } = weeklyChallenges();
  const done = list.filter((x) => x.prog >= x.c.goal).length;
  const rows = list.map((x) => {
    const pct = Math.round(x.prog / x.c.goal * 100);
    const ok = x.prog >= x.c.goal;
    return `<div class="chg ${ok ? "is-done" : ""}">
      <span class="chg__e">${x.c.e}</span>
      <div class="chg__main">
        <div class="chg__t">${escapeHtml(x.c.t)}${ok ? " ✓" : ""}</div>
        <div class="chg__h">${escapeHtml(x.c.hint)}</div>
        <div class="chg__track"><div class="chg__fill" data-w="${pct}"></div></div>
      </div>
      <span class="chg__n">${x.prog}/${x.c.goal}</span>
    </div>`;
  }).join("");
  const { el } = openModal(`
    <h3 class="modal__title">🎯 Sfide della settimana</h3>
    <p class="hint" style="margin-top:-6px">${done}/3 completate · cambiano ogni lunedì</p>
    <div class="chg-list">${rows}</div>
    <button class="btn btn--block" id="chClose">Chiudi</button>`);
  el.querySelector("#chClose").onclick = closeAllModals;
  requestAnimationFrame(() => el.querySelectorAll(".chg__fill").forEach((f) => { f.style.width = (f.dataset.w || 0) + "%"; }));
  try {
    const saved = JSON.parse(localStorage.getItem("ricettario.chWeek") || "{}");
    const prevDone = (saved.seed === seed && Array.isArray(saved.done)) ? saved.done : [];
    const nowDone = list.filter((x) => x.prog >= x.c.goal).map((x) => x.c.id);
    const fresh = nowDone.filter((id) => !prevDone.includes(id));
    localStorage.setItem("ricettario.chWeek", JSON.stringify({ seed, done: nowDone }));
    if (fresh.length && !reduceMotion) { setTimeout(() => { try { fxBurst(window.innerWidth / 2, window.innerHeight / 3, { emojis: ["🎯", "✨", "🎉"] }); } catch (e) {} playPling(); }, 250); }
    if (fresh.length && nowDone.length === 3) toast("🏆 Tutte le sfide della settimana completate!", "success");
  } catch (e) { /* ignora */ }
}

// "Porziona e congela": crea un'etichetta per il congelatore (piatto, porzioni,
// data e "da consumare entro"), e una vista con il conto alla rovescia.
function fzDateIt(ds) { if (!ds) return ""; const p = String(ds).split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : ds; }
function fzDaysLeft(bestBefore) {
  if (!bestBefore) return null;
  const t = new Date(); const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const p = String(bestBefore).split("-").map(Number);
  const bb = new Date(p[0], p[1] - 1, p[2]);
  return Math.round((bb - today) / 86400000);
}
function openFreezeDialog(recipe) {
  const today = new Date();
  let months = 3;
  const m = openModal(`
    <h3 class="modal__title">🧊 Porziona e congela</h3>
    <div class="field"><label>Piatto</label><input type="text" id="fzTitle" value="${escapeHtml(recipe ? recipe.title : "")}" placeholder="Es. Ragù" /></div>
    <div class="field"><label>Porzioni</label><input type="number" id="fzPort" min="1" inputmode="numeric" value="${recipe && recipe.servings ? recipe.servings : 2}" /></div>
    <div class="field"><label>Da consumare entro</label><div class="fz-months">${[1, 3, 6, 12].map((n) => `<button type="button" class="chip fz-month ${n === 3 ? "is-on" : ""}" data-m="${n}">${n} mes${n === 1 ? "e" : "i"}</button>`).join("")}</div></div>
    <div class="field"><label>Nota (facoltativa)</label><input type="text" id="fzNote" placeholder="Es. in 2 vaschette" /></div>
    <div class="modal__actions"><button class="btn" data-act="cancel">Annulla</button><button class="btn btn--primary" data-act="ok">🧊 Congela</button></div>
  `);
  m.el.querySelectorAll(".fz-month").forEach((b) => b.onclick = () => { m.el.querySelectorAll(".fz-month").forEach((x) => x.classList.remove("is-on")); b.classList.add("is-on"); months = parseInt(b.dataset.m, 10) || 3; });
  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  m.el.querySelector('[data-act="ok"]').onclick = async () => {
    const t = m.el.querySelector("#fzTitle").value.trim();
    if (!t) { toast("Dai un nome al piatto", "error"); return; }
    const port = Math.max(1, parseInt(m.el.querySelector("#fzPort").value, 10) || 1);
    const note = m.el.querySelector("#fzNote").value.trim();
    const bb = new Date(today.getFullYear(), today.getMonth() + months, today.getDate());
    await store.addFreezer({ title: t, recipeId: recipe ? recipe.id : null, portions: port, note, frozenAt: ymd(today.getFullYear(), today.getMonth(), today.getDate()), bestBefore: ymd(bb.getFullYear(), bb.getMonth(), bb.getDate()) });
    m.close(); haptic(12); toast("Aggiunto al congelatore 🧊", "success");
  };
}
function openFreezerList() {
  const items = store.getFreezer();
  const rows = items.length
    ? items.map((it) => {
        const days = fzDaysLeft(it.bestBefore);
        const cls = days == null ? "" : (days < 0 ? "is-exp" : (days <= 7 ? "is-soon" : ""));
        const cdown = days == null ? "" : (days < 0 ? `scaduto da ${-days} g` : (days === 0 ? "scade oggi" : `tra ${days} g`));
        return `<div class="fz-item ${cls}" data-id="${it.id}">
          <span class="fz-item__ic">🧊</span>
          <div class="fz-item__main">
            <div class="fz-item__t">${escapeHtml(it.title)} <span class="fz-item__p">${it.portions}×</span></div>
            <div class="fz-item__d">congelato il ${fzDateIt(it.frozenAt)}${it.bestBefore ? ` · entro ${fzDateIt(it.bestBefore)}${cdown ? ` <b>(${cdown})</b>` : ""}` : ""}</div>
            ${it.note ? `<div class="fz-item__n">${escapeHtml(it.note)}</div>` : ""}
          </div>
          <button class="btn btn--ghost fz-item__use" data-use="${it.id}">Consumato</button>
        </div>`;
      }).join("")
    : `<div class="hint">Niente in congelatore. Quando cucini in abbondanza, usa <b>“Porziona e congela”</b> da una ricetta.</div>`;
  const m = openModal(`
    <h3 class="modal__title">🧊 Congelatore</h3>
    <div class="cl-scroll">${rows}</div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>`);
  m.el.querySelector('[data-act="ok"]').onclick = m.close;
  m.el.querySelectorAll("[data-use]").forEach((b) => b.onclick = async () => { await store.deleteFreezer(b.dataset.use); m.close(); openFreezerList(); });
}

// "Svuota il frigo" mirato: scegli gli alimenti (in scadenza già spuntati) e
// trova tra le tue ricette quelle che li usano, o inventane una con l'AI.
function openUseItUp() {
  const pantry = store.getPantry() || [];
  if (!pantry.length) { toast("La dispensa è vuota: aggiungi qualcosa prima", "error"); return; }
  const expSet = new Set((store.getExpiringPantry(5) || []).map((p) => p.name));
  const items = pantry.slice().sort((a, b) => (expSet.has(b.name) ? 1 : 0) - (expSet.has(a.name) ? 1 : 0) || (a.name || "").localeCompare(b.name || ""));
  const rows = items.map((p) => {
    const exp = expSet.has(p.name);
    return `<label class="uiu-row"><input type="checkbox" class="mini-check uiu-chk" data-name="${escapeHtml(p.name)}" ${exp ? "checked" : ""}/><span>${escapeHtml(p.name)}${exp ? ` <span class="uiu-exp">in scadenza</span>` : ""}</span></label>`;
  }).join("");
  const m = openModal(`
    <h3 class="modal__title">♻️ Svuota il frigo</h3>
    <p class="hint" style="margin-top:-6px">Scegli cosa consumare (gli alimenti in scadenza sono già spuntati): ti trovo o invento una ricetta con quelli.</p>
    <div class="cl-scroll">${rows}</div>
    <div class="modal__actions" style="flex-direction:column;gap:8px">
      <button class="btn btn--primary btn--block" data-act="find">${iconHtml("fork-knife")} Trova tra le mie ricette</button>
      ${isImportConfigured() ? `<button class="btn btn--block" data-act="invent">✨ Inventane una (AI)</button>` : ""}
    </div>`);
  const picked = () => [...m.el.querySelectorAll(".uiu-chk:checked")].map((c) => c.dataset.name);
  m.el.querySelector('[data-act="find"]').onclick = () => {
    const sel = picked();
    if (!sel.length) { toast("Seleziona almeno un alimento", "error"); return; }
    const norm = (s) => (s || "").toLowerCase().trim();
    const scored = store.getAllRecipes().map((r) => {
      const names = (r.ingredients || []).map((i) => norm(i.name));
      const hits = sel.filter((s) => names.some((n) => n && (n.includes(norm(s)) || norm(s).includes(n)))).length;
      return { r, hits };
    }).filter((x) => x.hits > 0).sort((a, b) => b.hits - a.hits);
    if (!scored.length) { toast("Nessuna tua ricetta usa questi — prova a inventarne una!", "error"); return; }
    m.close();
    const list = scored.slice(0, 20).map(({ r, hits }) => `<button class="pick-row" data-id="${r.id}"><span class="day-row__icon">${iconHtml("fork-knife")}</span><span class="day-row__name">${escapeHtml(r.title)}<span class="have-badge">${hits}/${sel.length} ingredienti</span></span></button>`).join("");
    const m2 = openModal(`<h3 class="modal__title">♻️ Ricette con i tuoi avanzi</h3><div class="cl-scroll">${list}</div><div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>`);
    m2.el.querySelector('[data-act="ok"]').onclick = m2.close;
    m2.el.querySelectorAll("[data-id]").forEach((b) => b.onclick = () => { m2.close(); openRecipe(b.dataset.id); });
  };
  const inv = m.el.querySelector('[data-act="invent"]');
  if (inv) inv.onclick = () => {
    const sel = picked();
    if (!sel.length) { toast("Seleziona almeno un alimento", "error"); return; }
    m.close();
    openGenerateRecipe(sel.join(", "), (data) => openRecipeForm({ prefill: { title: data.title, servings: data.servings, time: data.time, ingredients: data.ingredients, steps: data.steps, tags: data.tags || [] } }));
  };
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
  // Dissolvenza/scorrimento morbido tra le schede (anche dove le View Transitions
  // non sono supportate). Gated reduce-motion via CSS.
  if (root) { root.classList.remove("view-anim"); void root.offsetWidth; root.classList.add("view-anim"); }
}

// Condivisione ricevuta da un'altra app (Web Share Target, Android): apre il form
// nuova ricetta col link già dentro e avvia l'importazione automaticamente.
export function handleSharedLink(url) {
  if (!url) return;
  setTimeout(() => {
    openRecipeForm({});
    setTimeout(() => {
      const u = document.querySelector("#rUrl");
      const imp = document.querySelector("#rImport");
      if (u) u.value = url;
      if (imp) { toast("Link ricevuto: importo…", "success"); imp.click(); }
      else if (u) toast("Link inserito: tocca Importa", "success");
    }, 350);
  }, 500);
}

// Scorciatoie dall'icona dell'app (manifest "shortcuts"): ?action=new|surprise|timer.
export function handleShortcut(action) {
  if (!action) return;
  setTimeout(() => {
    if (action === "new") openRecipeForm({});
    else if (action === "timer") openTimersTool();
    else if (action === "surprise") {
      const all = store.getAllRecipes();
      if (!all.length) { toast("Aggiungi prima qualche ricetta", "error"); return; }
      openRecipe(all[Math.floor(Math.random() * all.length)].id);
    }
  }, 500);
}

function openTool(toolId) {
  currentToolId = toolId;
  currentRecipeId = null;
  withTransition(() => render());
  window.scrollTo(0, 0);
}

function openRecipe(recipeId) {
  const r = store.getRecipe(recipeId);
  haptic(6);
  // Morph "elemento condiviso": tagga la miniatura sorgente con lo stesso nome
  // della foto hero del dettaglio, così la View Transition la fa "espandere".
  if (document.startViewTransition && !reduceMotion) {
    try {
      const sel = (typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(recipeId) : recipeId;
      const src = root.querySelector(`.pick-row[data-id="${sel}"] img, [data-recipe="${sel}"] img`);
      if (src) src.style.viewTransitionName = "vt-hero";
    } catch (e) { /* ignora */ }
  }
  currentRecipeId = recipeId;
  currentToolId = r ? r.toolId : currentToolId;
  // Porzioni predefinite: se impostate e la ricetta ha le porzioni, apri già scalato.
  const defServ = prefNum("defServings", 0);
  detailServings = r && r.servings ? (defServ > 0 ? defServ : r.servings) : null;
  ingChecks = new Set(); convertUnits = false; // azzera spunte/conversione per la nuova ricetta
  // la schermata ricetta vive nella sezione "Strumenti"
  currentRoute = "strumenti";
  document.querySelectorAll(".bottom-nav__btn").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.route === "strumenti");
  });
  withTransition(() => render());
  window.scrollTo(0, 0);
}

// Tieni acceso lo schermo mentre si guarda una ricetta (oltre alla Modalità cucina).
let detailWake = null;
async function acquireDetailWake() {
  try { if (navigator.wakeLock && !detailWake) { detailWake = await navigator.wakeLock.request("screen"); if (detailWake) detailWake.addEventListener("release", () => { detailWake = null; }); } } catch (e) { /* non supportato */ }
}
function releaseDetailWake() { try { if (detailWake) { detailWake.release(); detailWake = null; } } catch (e) {} }

// Tema festa "automatico": segnala a theme.js se oggi cade un Menù delle feste salvato.
function refreshFestaEvent() {
  try {
    const today = todayStr();
    const on = store.getEvents().some((e) => e.servingAt && e.servingAt.slice(0, 10) === today);
    setFestaEventToday(on);
  } catch (e) { /* eventi non disponibili */ }
}

export function render() {
  if (!root) return;
  refreshFestaEvent();
  // Schermata di login (gestita da app.js tramite renderLogin)
  if (loginMode) return; // login viene renderizzato a parte
  if (!(currentRoute === "strumenti" && currentRecipeId)) releaseDetailWake();
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
  if (pendingSharedRecipe) consumeSharedRecipe();
  moveNavBlob(); // riposiziona la goccia sotto la voce attiva
  updateAppBadge(); // pallino sull'icona app: alimenti/piatti in scadenza
}

// Badge numerico sull'icona dell'app (PWA installata): somma di alimenti in
// dispensa e piatti nel congelatore che scadono a breve o sono già scaduti.
function updateAppBadge() {
  if (!("setAppBadge" in navigator)) return;
  try {
    let n = 0;
    (store.getFreezer() || []).forEach((it) => { const d = fzDaysLeft(it.bestBefore); if (d != null && d <= 3) n++; });
    try { n += (store.getExpiringPantry(2) || []).length; } catch (e) {}
    if (n > 0) navigator.setAppBadge(n).catch(() => {});
    else navigator.clearAppBadge().catch(() => {});
  } catch (e) { /* non supportato o permesso mancante */ }
}

// ---------------- Schermata: Strumenti ----------------
function recipeResultRow(r, i = 0) {
  const tool = store.getTool(r.toolId);
  // Con foto: card grande con titolo in sovrimpressione (stile ricetta del giorno).
  if (r.photo) {
    const meta = [];
    if (r.time) meta.push(`${iconHtml("timer")} ${r.time}′`);
    if (r.difficulty) meta.push(diffDots(r.difficulty));
    if (r.cookCount) meta.push(`${iconHtml("fire")} ${r.cookCount}`);
    return `<button class="pick-row pick-row--photo stagger" data-id="${r.id}" style="--i:${i}">
      <img src="${escapeHtml(proxiedImg(r.photo))}" alt="" loading="lazy" referrerpolicy="no-referrer" />
      <span class="pcard__grad"></span>
      ${r.favorite ? `<span class="pcard__fav">${iconHtml("heart")}</span>` : ""}
      <span class="pcard__body">
        <span class="pcard__title">${escapeHtml(r.title)}</span>
        ${meta.length ? `<span class="pcard__meta">${meta.join(" · ")}</span>` : ""}
      </span>
    </button>`;
  }
  // Senza foto: riga compatta con icona strumento.
  const fav = r.favorite ? ` <span class="meta-fav">${iconHtml("heart")}</span>` : "";
  const rate = r.rating ? ` <span class="meta-star">${iconHtml("star")} ${r.rating}</span>` : "";
  const cooked = r.cookCount ? ` <span class="meta-cooked">${iconHtml("fire")} ${r.cookCount}</span>` : "";
  const tm = r.time ? ` <span class="meta-time">${iconHtml("timer")} ${r.time}′</span>` : "";
  const diff = r.difficulty ? ` <span class="meta-diff">${diffDots(r.difficulty)}</span>` : "";
  const srcLbl = recipeSourceLabel(r);
  const src = srcLbl ? ` <span class="meta-src">${iconHtml("link-simple")} ${escapeHtml(srcLbl)}</span>` : "";
  return `<button class="pick-row stagger" data-id="${r.id}" style="--i:${i}"><span class="day-row__icon">${tool ? iconHtml(tool.icon) : iconHtml("fork-knife")}</span><span class="day-row__name">${escapeHtml(r.title)}${fav}${rate}${cooked}${tm}${diff}${src}</span></button>`;
}

// Punteggio delle reazioni della famiglia su una ricetta (😍>🔥>👍>😐).
function reactionScore(r) {
  const map = { "😍": 3, "🔥": 2, "👍": 1, "😐": 0 };
  return (Array.isArray(r.reactions) ? r.reactions : []).reduce((s, x) => s + (map[x.emoji] || 0), 0);
}
// Motore "Consigliati": impara dai tuoi gusti (cotture, preferiti, reazioni, tag
// ricorrenti, stagione) e ordina le ricette; penalizza quelle cucinate proprio
// ora per varietà. Tutto lato client, nessun dato inviato fuori.
function recommendedRecipes() {
  const all = store.getAllRecipes();
  if (!all.length) return [];
  const norm = (t) => (t || "").toLowerCase().trim();
  const tagScore = {};
  all.forEach((r) => { const w = (r.cookCount || 0) + (r.favorite ? 2 : 0) + reactionScore(r); (r.tags || []).forEach((t) => { const k = norm(t); if (k) tagScore[k] = (tagScore[k] || 0) + w; }); });
  const month = currentMonth();
  return all.map((r) => {
    let s = 0;
    (r.tags || []).forEach((t) => s += (tagScore[norm(t)] || 0) * 0.5);
    if (recipeSeasonalMatches(r, month).length) s += 5;
    s += reactionScore(r) * 2;
    if (r.favorite) s += 3;
    if (r.lastCooked) { const d = (Date.now() - new Date(r.lastCooked)) / 86400000; if (d < 4) s -= 6; else if (d > 40) s += 2; }
    s += Math.random() * 3;
    return { r, s };
  }).sort((a, b) => b.s - a.s).slice(0, 15).map((x) => x.r);
}

function renderHomeBody() {
  const body = root.querySelector("#homeBody");
  if (!body) return;

  if (homeFilter === "menu") { renderMenusBody(body); return; }

  const searching = homeQuery.trim() || homeFilter;
  if (searching) {
    let emptyIcon = "magnifying-glass", emptyMsg = "Nessuna ricetta trovata.";
    // 1) Base in funzione del filtro/categoria scelto (o tutte le ricette).
    let base;
    if (homeFilter === "reco") { base = recommendedRecipes(); emptyIcon = "sparkle"; emptyMsg = "Cucina e reagisci a qualche ricetta: imparerò cosa consigliarti."; }
    else if (homeFilter === "permeo") { base = store.getAllRecipes().filter(matchesDiet); emptyIcon = "heart"; emptyMsg = "Nessuna ricetta adatta alle tue preferenze alimentari (impostale in Opzioni)."; }
    else if (homeFilter === "fav") { base = store.getFavorites(); emptyIcon = "heart"; emptyMsg = "Nessun preferito: tocca il cuore in una ricetta."; }
    else if (homeFilter === "cooked") { base = store.getMostCooked(); emptyIcon = "fire"; emptyMsg = "Nessuna ricetta ancora segnata come cucinata."; }
    else if (homeFilter === "recent") { base = store.getRecentCooked(); emptyIcon = "timer"; emptyMsg = "Niente cucinato di recente."; }
    else if (homeFilter === "season") { const m = currentMonth(); base = store.getAllRecipes().filter((r) => recipeSeasonalMatches(r, m).length); emptyIcon = "carrot"; emptyMsg = `Nessuna ricetta con ingredienti di stagione a ${monthName(m)}.`; }
    else if (homeFilter === "t15") { base = store.getAllRecipes().filter((r) => r.time && r.time <= 15); emptyIcon = "timer"; emptyMsg = "Nessuna ricetta entro 15 minuti. Aggiungi il tempo nelle ricette (modifica)."; }
    else if (homeFilter === "t30") { base = store.getAllRecipes().filter((r) => r.time && r.time <= 30); emptyIcon = "timer"; emptyMsg = "Nessuna ricetta entro 30 minuti. Aggiungi il tempo nelle ricette (modifica)."; }
    else if (homeFilter === "easy") { base = store.getAllRecipes().filter((r) => r.difficulty === 1); emptyIcon = "fire"; emptyMsg = "Nessuna ricetta facile. Segna la difficoltà nelle ricette (modifica)."; }
    else if (homeFilter === "ng") { base = store.getAllRecipes().filter((r) => !(r.allergens || []).includes("Glutine")); emptyIcon = "carrot"; emptyMsg = "Nessuna ricetta senza glutine. Segna gli allergeni nelle ricette (modifica)."; }
    else if (homeFilter === "nl") { base = store.getAllRecipes().filter((r) => !(r.allergens || []).includes("Lattosio")); emptyIcon = "carrot"; emptyMsg = "Nessuna ricetta senza lattosio. Segna gli allergeni nelle ricette (modifica)."; }
    else if (homeFilter) base = store.getByTag(homeFilter);
    else base = store.getAllRecipes();
    // 2) Se c'è anche un testo, restringi la base ai risultati della ricerca.
    let results = base;
    if (homeQuery.trim()) {
      const ids = new Set(store.searchRecipes(homeQuery).map((r) => r.id));
      results = base.filter((r) => ids.has(r.id));
      emptyMsg = homeFilter ? `Nessuna ricetta con "${escapeHtml(homeQuery.trim())}" in questa categoria.` : "Nessuna ricetta trovata.";
    }
    const qText = homeQuery.trim();
    const onlineBtn = qText
      ? `<button class="btn btn--ghost btn--block" id="homeSearchOnline" style="margin-top:14px">${iconHtml("magnifying-glass")} Cerca "${escapeHtml(qText)}" nel ricettario online</button>`
      : "";
    body.innerHTML = (results.length
      ? `<div class="result-grid">${results.map((r, i) => recipeResultRow(r, i)).join("")}</div>`
      : `<div class="empty">${emptyArt(emptyIcon === "heart" ? "heart" : "pot")}<div style="margin-top:6px">${emptyMsg}</div></div>`) + onlineBtn;
    body.querySelectorAll(".pick-row").forEach((b) => b.addEventListener("click", () => openRecipe(b.dataset.id)));
    const ob = body.querySelector("#homeSearchOnline");
    if (ob) ob.addEventListener("click", () => searchOnline(qText));
    return;
  }

  const tools = store.getTools();
  // Primo avvio (nessuno strumento): schermata di benvenuto che riempie e invita.
  if (!tools.length) {
    body.innerHTML = `<div class="welcome-empty">${emptyArt("pot")}
      <h2 class="welcome-empty__t">Inizia da qui!</h2>
      <p class="welcome-empty__p">Crea uno <b>strumento</b> di cottura (forno, friggitrice, Bimby, Companion…), poi salva le tue ricette al suo interno.</p>
      <button class="btn btn--primary btn--block" id="addTool" style="max-width:300px">${iconHtml("plus")} Crea il primo strumento</button>
      <button class="btn btn--ghost btn--block" id="seedTools" style="max-width:300px;margin-top:8px">${iconHtml("sparkle")} Usa gli strumenti predefiniti</button>
    </div>`;
    body.querySelector("#addTool").addEventListener("click", () => openToolForm());
    body.querySelector("#seedTools").addEventListener("click", async () => { const n = await store.seedDefaults(); toast(n ? `${n} strumenti aggiunti` : "Fatto", "success"); });
    return;
  }
  const cards = tools
    .map((t, i) => {
      const n = store.countRecipes(t.id);
      if (toolReorder) {
        return `<div class="tool-card tool-card--reorder" style="--ac:${ACCENTS[i % ACCENTS.length]}">
          <span class="tool-card__emoji">${iconHtml(t.icon)}</span>
          <span class="tool-card__name">${escapeHtml(t.name)}</span>
          <div class="tool-reorder">
            <button class="stepper__btn" data-up="${t.id}" ${i === 0 ? "disabled" : ""}>↑</button>
            <button class="stepper__btn" data-down="${t.id}" ${i === tools.length - 1 ? "disabled" : ""}>↓</button>
          </div>
        </div>`;
      }
      return `
      <button class="tool-card stagger" data-tool="${t.id}" style="--ac:${ACCENTS[i % ACCENTS.length]};--i:${i}">
        <span class="tool-card__emoji">${iconHtml(t.icon)}</span>
        <span class="tool-card__name">${escapeHtml(t.name)}</span>
        <span class="tool-card__count">${n} ${n === 1 ? "ricetta" : "ricette"}</span>
      </button>`;
    })
    .join("");
  body.innerHTML = `<div class="tool-grid">${cards}
    ${toolReorder ? "" : `<button class="add-card stagger" id="addTool" style="--i:${tools.length}">
      <span class="add-card__plus">${iconHtml("plus")}</span>
      <span>Aggiungi strumento</span>
    </button>`}</div>
    ${tools.length > 1 ? `<button class="btn btn--ghost btn--block" id="toolReorderBtn" style="margin-top:10px">${toolReorder ? "✓ Fine riordino" : "⇅ Riordina strumenti"}</button>` : ""}`;
  body.querySelectorAll(".tool-card[data-tool]").forEach((c) => c.addEventListener("click", () => openTool(c.dataset.tool)));
  const addT = body.querySelector("#addTool");
  if (addT) addT.addEventListener("click", () => openToolForm());
  const reBtn = body.querySelector("#toolReorderBtn");
  if (reBtn) reBtn.addEventListener("click", () => { toolReorder = !toolReorder; renderHomeBody(); });
  body.querySelectorAll("[data-up]").forEach((b) => b.addEventListener("click", () => store.moveTool(b.dataset.up, -1)));
  body.querySelectorAll("[data-down]").forEach((b) => b.addEventListener("click", () => store.moveTool(b.dataset.down, 1)));
}
let toolReorder = false;

// Suggerimenti personalizzati dalle abitudini: affinità col giorno della
// settimana, quante volte cucinato, preferiti, e bonus anti-spreco (in scadenza).
function pickSuggestions(limit = 3) {
  let recipes = store.getAllRecipes();
  if (anyDietPref()) { const f = recipes.filter(matchesDiet); if (f.length >= 4) recipes = f; }
  if (recipes.length < 4) return [];
  const todayDow = new Date().getDay();
  const planned = new Set(store.getPlanByDate(todayStr()).map((e) => e.recipeId));
  let expSet = new Set();
  try { expSet = new Set(store.recipesForExpiring(3).map((r) => r.id)); } catch (e) {}
  const scored = recipes.filter((r) => !planned.has(r.id)).map((r) => {
    let s = (r.cookCount || 0);
    const log = Array.isArray(r.cookLog) ? r.cookLog : [];
    const sameDow = log.filter((ts) => { const d = new Date(ts); return !isNaN(d) && d.getDay() === todayDow; }).length;
    s += sameDow * 3;
    if (r.favorite) s += 2;
    if (expSet.has(r.id)) s += 6;
    return { r, s };
  });
  if (!scored.some((x) => x.s > 0)) return []; // niente storico → niente "suggeriti"
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.r);
}

// "Lo sapevi?": consigli a bassa pressione, uno per sessione, ognuno una volta sola.
const APP_TIPS = [
  { id: "t-chiedi", text: "tocca il ❓ in alto e chiedi a Fornelli come fare qualsiasi cosa.", topic: null },
  { id: "t-voce", text: "in Modalità cucina, col microfono, puoi fare domande a voce (\"posso sostituire il burro?\").", topic: "modalita-cucina" },
  { id: "t-casa", text: "puoi condividere la lista della spesa in tempo reale con un'altra persona.", topic: "casa-condivisa" },
  { id: "t-adatta", text: "puoi rendere una ricetta vegana o più leggera con un tocco.", topic: "adatta-ricetta" },
  { id: "t-frigo", text: "fotografa il frigo e l'app riconosce gli alimenti.", topic: "foto-frigo" },
  { id: "t-teglia", text: "hai una teglia diversa? L'app riadatta le dosi.", topic: "teglia" },
  { id: "t-menuai", text: "fatti proporre il menù della settimana dall'AI.", topic: "menu-settimana" },
  { id: "t-robot", text: "trasforma una ricetta nei comandi del tuo Companion o Bimby.", topic: "robot" }
];
let tipChosen = false;     // tip della sessione già scelto
let tipDismissed = false;  // l'utente l'ha chiuso (non ricompare nei re-render)
let currentTip = null;
function buildTipBanner() {
  if (tipDismissed) return "";
  if (!tipChosen) {
    tipChosen = true;
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem("ricettario.tips.seen") || "[]"); } catch (e) {}
    const avail = APP_TIPS.filter((t) => !seen.includes(t.id));
    currentTip = avail.length ? avail[Math.floor(Math.random() * avail.length)] : null;
    if (currentTip) { try { localStorage.setItem("ricettario.tips.seen", JSON.stringify([...seen, currentTip.id])); } catch (e) {} }
  }
  if (!currentTip) return "";
  return `<div class="didyouknow" id="dyk"><span class="dyk__ic">💡</span><button class="dyk__txt" id="dykGo"><b>Lo sapevi?</b> ${escapeHtml(currentTip.text)}</button><button class="dyk__x" id="dykX" title="Chiudi">✕</button></div>`;
}

function renderStrumenti() {
  const tools = store.getTools();
  const info = handlers.getAccountInfo();
  const banner =
    !info.configured
      ? `<div class="banner">💡 <div>Stai usando il salvataggio <b>solo su questo telefono</b>. Per attivare il <b>backup nel cloud</b> apri <b>Impostazioni</b>.</div></div>`
      : "";

  const total = tools.reduce((s, t) => s + store.countRecipes(t.id), 0);
  const photoCount = store.getAllRecipes().filter((r) => r.photo).length;
  const chWeek = total ? weeklyChallenges() : null;
  const chDone = chWeek ? chWeek.list.filter((x) => x.prog >= x.c.goal).length : 0;
  const allTags = store.getAllTags();
  const voiceOK = ("webkitSpeechRecognition" in window) || ("SpeechRecognition" in window);

  // Promemoria backup: solo in modalità locale (dati solo sul telefono), se non
  // esporti da oltre 30 giorni e hai qualche ricetta. Posticipabile di 7 giorni.
  let backupBanner = "";
  if (!info.configured && allR.length >= 3) {
    let lastBk = 0, snooze = 0;
    try { lastBk = Date.parse(localStorage.getItem("ricettario.lastBackup") || "") || 0; snooze = parseInt(localStorage.getItem("ricettario.bkSnooze"), 10) || 0; } catch (e) {}
    if (Date.now() > snooze && (Date.now() - lastBk) > 30 * 86400000) {
      backupBanner = `<button class="alert-banner" id="bkAlert">${iconHtml("download-simple")} <span>Fai un backup delle tue ricette (Opzioni → Esporta)</span></button>`;
    }
  }

  // Ricetta del giorno: stabile nell'arco della giornata (cambia ogni giorno).
  const allR = store.getAllRecipes();
  let rotdCard = "";
  if (allR.length && prefBool("homeRotd", true)) {
    const n = new Date();
    const seed = n.getFullYear() * 1000 + (n.getMonth() * 31 + n.getDate());
    const rotd = allR[seed % allR.length];
    rotdCard = `<button class="rotd" data-recipe="${rotd.id}">
        ${rotd.photo ? `<img class="rotd__img" src="${escapeHtml(proxiedImg(rotd.photo))}" alt="" referrerpolicy="no-referrer" />` : `<span class="rotd__ph">${iconHtml("fork-knife")}</span>`}
        <span class="rotd__grad"></span>
        ${rotd.photo ? STEAM_HTML : ""}
        <span class="rotd__glare"></span>
        <span class="rotd__body"><span class="rotd__lbl">${iconHtml("sparkle")} Ricetta del giorno</span><span class="rotd__title">${escapeHtml(rotd.title)}</span></span>
      </button>`;
  }

  // Oggi si mangia
  const today = store.getPlanByDate(todayStr()).filter((e) => store.getRecipe(e.recipeId));
  const todayCard = today.length && prefBool("homeToday", true)
    ? `<div class="today-card">
        <div class="today__h">${iconHtml("calendar-dots")} Oggi si mangia</div>
        ${today.map((e) => {
          const r = store.getRecipe(e.recipeId);
          const slot = e.slot ? `<span class="today__slot">${SLOT_LABEL[e.slot] || ""}</span>` : "";
          return `<button class="today__item" data-recipe="${r.id}">${slot}<span class="today__name">${escapeHtml(r.title)}</span>${iconHtml("caret-right")}</button>`;
        }).join("")}
      </div>`
    : "";

  // Avviso scadenze (giorni di anticipo configurabili in Opzioni → Notifiche).
  const expDays = getNotifyPrefs().days || 3;
  const exp = store.getExpiringPantry(expDays);
  const expBanner = exp.length
    ? `<button class="alert-banner" id="expAlert">${iconHtml("basket")} <span>${exp.length} ${exp.length === 1 ? "alimento in scadenza" : "alimenti in scadenza"} — controlla la dispensa</span></button>`
    : "";

  // "Usa prima che scada": ricette che sfruttano gli alimenti in scadenza
  const useFirst = exp.length ? store.recipesForExpiring(expDays).slice(0, 4) : [];
  const useFirstCard = useFirst.length
    ? `<div class="today-card">
        <div class="today__h">${iconHtml("basket")} Usa prima che scada</div>
        ${useFirst.map((r) => `<button class="today__item" data-recipe="${r.id}"><span class="today__name">${escapeHtml(r.title)}</span>${iconHtml("caret-right")}</button>`).join("")}
      </div>`
    : "";

  // Di stagione: prodotti del mese corrente (sezione informativa + filtro).
  const sMonth = currentMonth();
  const produce = seasonalProduce(sMonth);
  const seasonCard = produce.length && prefBool("homeSeason", true)
    ? `<div class="today-card season-card">
        <div class="today__h">${iconHtml("carrot")} Di stagione a ${monthName(sMonth)}</div>
        <div class="season-row">${produce.map((p) => `<button class="season-chip" data-season="${escapeHtml(p.name)}" title="Cerca ricette con ${escapeHtml(p.name)}">${p.emoji} ${escapeHtml(p.name)}</button>`).join("")}</div>
        <div class="season-hint">Tocca un ingrediente per cercare le tue ricette (e online).</div>
      </div>`
    : "";

  // "Non lo cucini da un po'": preferiti cucinati ma non di recente (oltre 30 giorni).
  const neglCutoff = Date.now() - 30 * 86400000;
  const neglected = allR
    .filter((r) => r.favorite && r.lastCooked && new Date(r.lastCooked).getTime() < neglCutoff)
    .sort((a, b) => (a.lastCooked || "").localeCompare(b.lastCooked || ""))
    .slice(0, 4);
  const neglectedCard = neglected.length && prefBool("homeNeglect", true)
    ? `<div class="today-card">
        <div class="today__h">${iconHtml("timer")} Non lo cucini da un po'</div>
        ${neglected.map((r) => `<button class="today__item" data-recipe="${r.id}"><span class="today__name">${escapeHtml(r.title)}</span>${iconHtml("caret-right")}</button>`).join("")}
      </div>`
    : "";

  // "Suggeriti per te": scelte personalizzate dalle abitudini (giorno della
  // settimana, piatti più cucinati, preferiti) + priorità anti-spreco.
  const suggested = prefBool("homeSuggest", true) ? pickSuggestions(3) : [];
  const suggestedCard = suggested.length
    ? `<div class="today-card">
        <div class="today__h">${iconHtml("sparkle")} Suggeriti per te</div>
        ${suggested.map((r) => `<button class="today__item" data-recipe="${r.id}"><span class="today__name">${escapeHtml(r.title)}</span>${iconHtml("caret-right")}</button>`).join("")}
      </div>`
    : "";

  const specials = [
    ...(total >= 4 ? [{ k: "reco", label: "Consigliati", icon: "sparkle" }] : []),
    ...(anyDietPref() ? [{ k: "permeo", label: "Per me", icon: "heart" }] : []),
    { k: "season", label: "Di stagione", icon: "carrot" },
    { k: "fav", label: "Preferiti", icon: "heart" },
    { k: "cooked", label: "Più cucinate", icon: "fire" },
    { k: "recent", label: "Di recente", icon: "timer" },
    { k: "t15", label: "≤15 min", icon: "timer" },
    { k: "t30", label: "≤30 min", icon: "timer" },
    { k: "easy", label: "Facili", icon: "fire" },
    { k: "ng", label: "Senza glutine", icon: "carrot" },
    { k: "nl", label: "Senza lattosio", icon: "carrot" },
    { k: "menu", label: "Menu e feste", icon: "book-bookmark" }
  ];
  const chips = specials.map((s) => `<button class="filter-chip ${homeFilter === s.k ? "is-on" : ""}" data-filter="${s.k}">${iconHtml(s.icon)} ${s.label}</button>`).join("") +
    allTags.map((t) => `<button class="filter-chip ${homeFilter === t ? "is-on" : ""}" data-filter="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("");

  const cover = getCover();
  const coverHero = cover
    ? `<div class="cover-hero" style="background-image:url('${cover.replace(/'/g, "%27")}')">
        <div class="cover-hero__grad"></div>
        <div class="cover-hero__txt">
          <span class="cover-hero__sub">${greeting()}! ${(() => { const f = festiveInfo(); return f ? f.emoji : "👋"; })()}</span>
          <span class="cover-hero__t">Il ricettario di ${escapeHtml(getNickname() || "casa")}</span>
        </div>
      </div>`
    : `<h1 class="page-title">${greeting()}${getNickname() ? " " + escapeHtml(getNickname()) : ""}! ${(() => { const f = festiveInfo(); return f ? f.emoji : "👋"; })()}</h1>`;
  root.innerHTML = `
    ${(() => { const f = festiveInfo(); return f ? `<div class="festive-banner">${f.emoji} ${f.label}!</div>` : ""; })()}
    ${coverHero}
    ${rotdCard}
    <div class="home-hero">
      <div>
        <div class="home-hero__num" id="heroNum">${total}</div>
        <div class="home-hero__lbl">${total === 1 ? "ricetta salvata" : "ricette salvate"}</div>
      </div>
      <button class="home-hero__btn" id="heroAdd">${iconHtml("plus")} Nuova ricetta</button>
    </div>
    ${expBanner}
    ${backupBanner}
    ${useFirstCard}
    ${todayCard}
    ${suggestedCard}
    ${neglectedCard}
    ${seasonCard}
    ${banner}
    ${buildTipBanner()}
    <div class="search-bar search-bar--hero">
      <span class="search-bar__ic">${iconHtml("magnifying-glass")}</span>
      <input type="search" id="homeSearch" placeholder="Cerca una ricetta o un ingrediente…" value="${escapeHtml(homeQuery)}" />
      ${voiceOK ? `<button class="btn mic-btn" id="homeMic" title="Cerca a voce" aria-label="Cerca a voce">🎤</button>` : ""}
    </div>
    ${total ? `<div class="home-bento">
      <button class="bento-tile bento-tile--wide" id="surpriseBtn"><span class="bento-tile__e">🍽️</span><span class="bento-tile__l">Cosa cucino stasera?</span></button>
      <button class="bento-tile" id="moodBtn"><span class="bento-tile__e">😋</span><span class="bento-tile__l">Che voglia hai?</span></button>
      <button class="bento-tile" id="chBtn"><span class="bento-tile__e">🎯</span><span class="bento-tile__l">Sfide${chWeek ? ` ${chDone}/3` : ""}</span></button>
      <button class="bento-tile" id="recoTile"><span class="bento-tile__e">✨</span><span class="bento-tile__l">Consigliati</span></button>
      ${photoCount >= 4 ? `<button class="bento-tile" id="wallBtn"><span class="bento-tile__e">🖼️</span><span class="bento-tile__l">Muro</span></button>` : ""}
    </div>` : ""}
    <div class="home-tags">${chips}</div>
    <div id="homeBody"></div>
  `;

  root.querySelector("#heroAdd").addEventListener("click", () => openRecipeForm({}));
  const ea = root.querySelector("#expAlert");
  if (ea) ea.addEventListener("click", () => { shopTab = "dispensa"; navigate("spesa"); });
  const bk = root.querySelector("#bkAlert");
  if (bk) bk.addEventListener("click", () => { try { localStorage.setItem("ricettario.bkSnooze", String(Date.now() + 7 * 86400000)); } catch (e) {} navigate("impostazioni"); });
  root.querySelectorAll(".today__item").forEach((b) => b.addEventListener("click", () => openRecipe(b.dataset.recipe)));
  const rotdEl = root.querySelector(".rotd");
  if (rotdEl) rotdEl.addEventListener("click", () => openRecipe(rotdEl.dataset.recipe));

  const search = root.querySelector("#homeSearch");
  search.addEventListener("input", () => {
    homeQuery = search.value;
    // Il filtro "Menu" non si combina con la ricerca testuale: lo azzero.
    if (homeFilter === "menu") { homeFilter = ""; renderStrumenti(); }
    else renderHomeBody();
  });
  root.querySelectorAll(".filter-chip").forEach((c) => c.addEventListener("click", () => {
    homeFilter = homeFilter === c.dataset.filter ? "" : c.dataset.filter;
    if (homeFilter === "menu") homeQuery = ""; // Menu è una vista a parte
    renderStrumenti();
  }));

  const moodBtn = root.querySelector("#moodBtn");
  if (moodBtn) moodBtn.addEventListener("click", () => openMoodPicker());
  const wallBtn = root.querySelector("#wallBtn");
  if (wallBtn) wallBtn.addEventListener("click", () => openPhotoWall());
  const chBtn = root.querySelector("#chBtn");
  if (chBtn) chBtn.addEventListener("click", () => openWeeklyChallenges());
  const recoTile = root.querySelector("#recoTile");
  if (recoTile) recoTile.addEventListener("click", () => { homeFilter = "reco"; homeQuery = ""; renderStrumenti(); });
  initGyroCard(); // carta del giorno reattiva al giroscopio (solo su dispositivi che lo supportano)
  const surprise = root.querySelector("#surpriseBtn");
  if (surprise) surprise.addEventListener("click", () => {
    if (!store.getAllRecipes().length) { toast("Aggiungi prima qualche ricetta", "error"); return; }
    fxBurstFrom(surprise, { emojis: ["🍽️", "🎲", "✨"] });
    openTonightAssistant();
  });

  const mic = root.querySelector("#homeMic");
  if (mic) mic.addEventListener("click", () => startVoiceSearch());

  // "Lo sapevi?": tocca per andare alla funzione, ✕ per chiudere.
  const dykGo = root.querySelector("#dykGo");
  if (dykGo) dykGo.addEventListener("click", () => {
    if (currentTip && currentTip.topic) { const t = HELP_TOPICS.find((x) => x.id === currentTip.topic); if (t) { executeHelpAction(t); return; } }
    openHelpAssistant();
  });
  const dykX = root.querySelector("#dykX");
  if (dykX) dykX.addEventListener("click", () => { tipDismissed = true; const b = root.querySelector("#dyk"); if (b) b.remove(); });

  // "Di stagione": tocca un ingrediente → cerca tra le ricette salvate (in Home).
  // Dai risultati si può poi estendere la ricerca al Ricettario online col pulsante.
  root.querySelectorAll(".season-chip[data-season]").forEach((c) => c.addEventListener("click", () => {
    homeQuery = c.dataset.season; homeFilter = "";
    renderStrumenti();
    const sb = root.querySelector("#homeSearch");
    if (sb) { try { sb.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {} }
  }));

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

// Ricerca vocale nel Ricettario online: detta il termine e cerca sulla fonte scelta.
function startMealVoiceSearch() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  const mic = root.querySelector("#mealMic");
  const rec = new SR();
  rec.lang = "it-IT"; rec.interimResults = false; rec.maxAlternatives = 1;
  if (mic) mic.classList.add("is-listening");
  rec.onresult = (e) => {
    const text = ((e.results[0] && e.results[0][0] && e.results[0][0].transcript) || "").trim();
    if (text) performMealSearch(text);
  };
  rec.onerror = (e) => { if (e && e.error !== "aborted" && e.error !== "no-speech") toast("Non ho capito, riprova", "error"); };
  rec.onend = () => { const m = root.querySelector("#mealMic"); if (m) m.classList.remove("is-listening"); };
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
    <div class="${recipes.length ? "result-grid" : ""}">${list}</div>
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

// Estrae un colore dominante (medio, ravvivato) da un'immagine e lo passa al
// callback come [r,g,b]. Funziona con foto caricate (data URL) e immagini same-
// origin; per le immagini esterne senza CORS fallisce in silenzio (niente tinta).
function tintFromImage(url, cb) {
  if (!url) return;
  const img = new Image();
  if (!url.startsWith("data:")) img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const c = document.createElement("canvas");
      const w = (c.width = 24), h = (c.height = 24);
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const R = d[i], G = d[i + 1], B = d[i + 2], A = d[i + 3];
        if (A < 128) continue;
        const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
        if (mx < 30 || (mx > 235 && mn > 235)) continue; // salta troppo scuro/slavato
        r += R; g += G; b += B; n++;
      }
      if (!n) return;
      cb([Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
    } catch (e) { /* canvas "tainted" per CORS: niente tinta */ }
  };
  img.onerror = () => {};
  img.src = url;
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

// Idee per il contorno: pesca dalle tue ricette che sembrano contorni + idee fisse.
const SIDE_KEYS = ["contorn", "insalat", "verdur", "patate", "purè", "pure", "spinaci", "fagiolin", "grigliat", "caponata", "peperonata", "funghi"];
const SIDE_IDEAS = ["Insalata mista", "Patate al forno", "Verdure grigliate", "Spinaci saltati", "Purè di patate"];
function suggestSides(r) {
  const txt = (x) => ((x.title || "") + " " + (x.tags || []).join(" ")).toLowerCase();
  const mine = store.getAllRecipes().filter((x) => x.id !== r.id && SIDE_KEYS.some((k) => txt(x).includes(k))).slice(0, 4);
  return { mine, ideas: SIDE_IDEAS };
}

// Rileva se una ricetta va iniziata in anticipo (ammollo, lievitazione, riposo…).
const PREP_AHEAD = [[/ammoll/i, "ammollo"], [/lievit/i, "lievitazione"], [/marin/i, "marinatura"], [/(sera prima|giorno prima|una notte|tutta la notte|per una notte|riposare in frigo|in frigo per una notte)/i, "riposo lungo"]];
function prepAheadLabel(r) {
  const text = ((r.steps || []).join(" ") + " " + (r.notes || "")).toLowerCase();
  for (const [re, label] of PREP_AHEAD) if (re.test(text)) return label;
  return null;
}

// ---------------- Schermata: dettaglio ricetta ----------------
function renderRecipeDetail() {
  const r = store.getRecipe(currentRecipeId);
  if (!r) { currentRecipeId = null; return render(); }
  acquireDetailWake();
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
      </div>${!base ? `<div class="hint">Imposta le porzioni nella ricetta (modifica) per ricalcolare le quantità.</div>` : ""}
      ${base && ingredients.some((it) => it.qty != null && it.unit) ? `<button class="btn btn--ghost btn--block" id="scaleByWeight" style="margin-top:8px">⚖️ Ho una quantità precisa…</button>` : ""}
      ${base ? `<button class="btn btn--ghost btn--block" id="panScale" style="margin-top:8px">🍰 Adatta alla teglia/stampo</button>` : ""}`
    : "";

  const pantryActive = store.getPantry().length > 0;
  const missingCount = pantryActive ? ingredients.filter((it) => !store.inPantry(it.name)).length : 0;
  const hasForeign = ingredients.some((it) => { const t = ingredientText(it); return convertMeasures(t) !== t; });
  const ingList = ingredients.length
    ? `<div class="ing-list">${ingredients
        .map((it, i) => {
          const miss = pantryActive && !store.inPantry(it.name);
          const done = ingChecks.has(i);
          const t0 = ingredientText(it, factor);
          const txt = convertUnits ? convertMeasures(t0) : t0;
          return `<div class="ing-row${miss ? " ing-row--missing" : ""}${done ? " ing-row--done" : ""}" data-ix="${i}"><span class="ing-dot" style="--ac:${ACCENTS[i % ACCENTS.length]}"></span><span class="ing-row__txt">${escapeHtml(txt)}</span>${miss ? `<span class="ing-miss">manca</span>` : ""}</div>`;
        })
        .join("")}</div>
       <div class="hint" style="margin-top:6px">Tocca un ingrediente per spuntarlo mentre cucini.</div>
       ${hasForeign ? `<button class="btn btn--ghost btn--block" id="convUnits" style="margin-top:8px">${iconHtml("shuffle")} ${convertUnits ? "Mostra misure originali" : "Converti misure (cup/oz/°F)"}</button>` : ""}
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
  // Idee per il contorno (non per dolci o per i contorni stessi).
  const dishTxt = ((r.title || "") + " " + tagsArr.join(" ")).toLowerCase();
  const isDessertOrSide = /dolc|torta|biscott|crostat|tiramis|budino|gelato|muffin|plumcake|crema|contorn|insalat/.test(dishTxt);
  const sides = isDessertOrSide ? { mine: [], ideas: [] } : suggestSides(r);
  const sidesCard = (sides.mine.length || sides.ideas.length) ? `<div class="section-card">
      <h3 class="section-title">🥗 Idee per il contorno</h3>
      ${sides.mine.length ? `<div class="sim-row" style="margin-bottom:${sides.ideas.length ? "10px" : "0"}">${sides.mine.map((s) => `<button class="sim-card" data-sim="${s.id}">${s.photo ? `<img src="${escapeHtml(proxiedImg(s.photo))}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : `<span class="sim-card__ph">${iconHtml("fork-knife")}</span>`}<span class="sim-card__t">${escapeHtml(s.title)}</span></button>`).join("")}</div>` : ""}
      ${sides.ideas.length ? `<div class="tag-row">${sides.ideas.map((i) => `<span class="tagchip tagchip--ro">${escapeHtml(i)}</span>`).join("")}</div>` : ""}
    </div>` : "";

  root.innerHTML = `
    <div class="read-progress" aria-hidden="true"></div>
    <div class="toolbar">
      <button class="back-btn" id="back">${iconHtml("arrow-left")}</button>
      <div class="toolbar__title" style="flex:1">${r.photo ? "" : escapeHtml(r.title)}</div>
      <button class="back-btn fav-btn ${r.favorite ? "is-fav" : ""}" id="favBtn" title="Preferito">${iconHtml("heart")}</button>
    </div>
    ${r.photo
      ? `<div class="recipe-hero"><img src="${escapeHtml(proxiedImg(r.photo))}" alt="" referrerpolicy="no-referrer" style="view-transition-name:vt-hero" /><div class="recipe-hero__grad"></div>${STEAM_HTML}<h2 class="recipe-hero__title">${escapeHtml(r.title)}</h2></div>`
      : `<div class="recipe-hero recipe-hero--mesh" style="--mh:${(() => { let h = 0; const s = r.title || ""; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000; return 12 + (h % 66); })()}"><span class="recipe-hero__meshic">${tool ? iconHtml(tool.icon) : iconHtml("fork-knife")}</span><div class="recipe-hero__grad"></div><h2 class="recipe-hero__title">${escapeHtml(r.title)}</h2></div>`}
    <div class="detail-top">
      ${tool ? `<span class="recipe-tool-chip" style="margin:0">${iconHtml(tool.icon)} ${escapeHtml(tool.name)}</span>` : "<span></span>"}
      ${ratingRow}
    </div>
    ${(() => { const sh = recipeSeasonalMatches(r, currentMonth()); return sh.length ? `<div class="tag-row"><span class="tagchip tagchip--season">${iconHtml("carrot")} Di stagione · ${sh.slice(0, 3).map((p) => escapeHtml(p.name)).join(", ")}</span></div>` : ""; })()}
    ${(() => { const pa = prepAheadLabel(r); return pa ? `<div class="tag-row"><span class="tagchip tagchip--ahead">⏳ Richiede anticipo · ${pa}</span><button class="chip" id="prepRemind" style="margin-left:6px">⏰ Ricordamelo</button></div>` : ""; })()}
    ${(tagsArr.length || r.time || r.difficulty) ? `<div class="tag-row">${r.time ? `<span class="tagchip tagchip--ro">${iconHtml("timer")} ${r.time} min</span>` : ""}${r.difficulty ? `<span class="tagchip tagchip--ro">${diffDots(r.difficulty)} ${diffLabel(r.difficulty)}</span>` : ""}${tagsArr.map((t) => `<span class="tagchip tagchip--ro">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
    ${Array.isArray(r.allergens) && r.allergens.length ? `<div class="tag-row">${r.allergens.map((a) => `<span class="tagchip tagchip--allerg">⚠ ${escapeHtml(a)}</span>`).join("")}</div>` : ""}
    ${(() => { const s = recipeSourceLabel(r); return s ? `<div class="tag-row"><span class="tagchip tagchip--src">${iconHtml("link-simple")} Fonte: ${escapeHtml(s)}</span></div>` : ""; })()}
    ${url ? `<a class="btn btn--block" id="openLink" href="${escapeHtml(url)}" target="_blank" rel="noopener" style="margin-bottom:16px">${iconHtml("arrow-square-out")} Apri la ricetta</a>` : ""}

    <div class="section-card">
      <h3 class="section-title">${iconHtml("list-bullets")} Ingredienti</h3>
      ${stepper}
      ${ingList}
    </div>

    ${ingredients.length ? `<div class="section-card" id="nutriCard">${nutritionCardHtml(r, base, detailServings)}</div>` : ""}

    ${(() => { const im = estimateImpact(ingredients); return im ? `<div class="impact impact--${im.level.toLowerCase()}"><span class="impact__e">${im.emoji}</span><div class="impact__b"><div class="impact__t">Impatto ambientale: ${im.level} <button class="impact__i" popovertarget="impactInfo" aria-label="Come si calcola">ⓘ</button></div>${im.tip ? `<div class="impact__d">${escapeHtml(im.tip)}</div>` : ""}</div><div id="impactInfo" popover class="pop">Stima indicativa dai principali ingredienti (dati aggregati Poore &amp; Nemecek, 2018). Serve solo a dare un'idea: non è un valore preciso.</div></div>` : ""; })()}

    ${costCard}
    ${subsCard}
    ${wineCard}
    ${sidesCard}

    ${steps.length ? `<div class="section-card">
      <h3 class="section-title">${iconHtml("fork-knife")} Preparazione</h3>
      <ol class="steps-list">${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
      <button class="btn btn--primary btn--block" id="cookBtn" style="margin-top:6px">${iconHtml("fire")} Modalità cucina</button>
    </div>` : ""}

    ${r.notes ? `<div class="section-card"><h3 class="section-title">${iconHtml("note-pencil")} Note</h3><div class="recipe-item__notes" style="margin-top:0">${escapeHtml(r.notes)}</div></div>` : ""}

    <div class="section-card" id="voiceCard">
      <h3 class="section-title">🎙️ Nota vocale</h3>
      <div id="voiceBody"></div>
    </div>

    <div class="section-card" id="reactCard">
      <h3 class="section-title">😋 Reazioni della famiglia</h3>
      <div id="reactBody">${reactionsBarHtml(r)}</div>
    </div>

    ${(() => { const sim = similarRecipes(r); return sim.length ? `<div class="section-card">
      <h3 class="section-title">${iconHtml("sparkle")} Ti potrebbe piacere</h3>
      <div class="sim-row">${sim.map((s) => `<button class="sim-card" data-sim="${s.id}">${s.photo ? `<img src="${escapeHtml(proxiedImg(s.photo))}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : `<span class="sim-card__ph">${iconHtml("fork-knife")}</span>`}<span class="sim-card__t">${escapeHtml(s.title)}</span></button>`).join("")}</div>
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
    <button class="btn btn--block" id="reviewBtn" style="margin-bottom:10px">📝 Com'è venuta? (voto, foto, nota)</button>
    <button class="btn btn--block" id="timelineBtn" style="margin-bottom:10px">🕐 Quando inizio? (per servire in orario)</button>
    <button class="btn btn--block" id="completeMealBtn" style="margin-bottom:10px">🍽️ Completa il pasto (abbinamenti)</button>
    <button class="btn btn--block" id="freezeBtn" style="margin-bottom:10px">🧊 Porziona e congela</button>
    ${(videoInfo(r.videoUrl) || videoInfo(r.url)) ? `<button class="btn btn--block" id="watchVideo" style="margin-bottom:10px">▶ Guarda il video</button>` : ""}
    <button class="btn btn--block" id="checkPhotoBtn" style="margin-bottom:10px">📷 Com'è venuto? Controlla con una foto</button>
    <input type="file" id="checkPhotoFile" accept="image/*" capture="environment" hidden />
    ${isImportConfigured() ? `<button class="btn btn--block" id="askChefBtn" style="margin-bottom:10px">💬 Chiedi allo chef (AI)</button>` : ""}
    ${isImportConfigured() && (steps.length || ingredients.length) ? `<button class="btn btn--block" id="robotBtn" style="margin-bottom:10px">🤖 Modalità robot (Companion / Bimby)</button>` : ""}
    ${isImportConfigured() && ingredients.length ? `<button class="btn btn--block" id="convertBtn" style="margin-bottom:10px">🥗 Adatta la ricetta (vegano, leggero…)</button>` : ""}
    <button class="btn btn--block" id="collectionsBtn" style="margin-bottom:10px">${iconHtml("book-bookmark")} Aggiungi a una raccolta</button>
    <button class="btn btn--block" id="shareImg" style="margin-bottom:10px">${iconHtml("image")} Condividi come immagine</button>
    <button class="btn btn--block" id="qrBtn" style="margin-bottom:10px">${iconHtml("qr-code")} Mostra codice QR</button>
    ${steps.length ? `<button class="btn btn--block" id="chefBtn" style="margin-bottom:10px">🍳 Leggi la ricetta</button>` : ""}
    <button class="btn btn--block" id="pdfRecipeBtn" style="margin-bottom:10px">${iconHtml("download-simple")} Esporta in PDF</button>
    <button class="btn btn--block" id="shareLinkBtn" style="margin-bottom:10px">${iconHtml("link-simple")} Condividi come link (Fornelli)</button>
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
  // "Impiattamento": la foto si rivela con un cerchio che si espande e il titolo
  // compare con effetto macchina-da-scrivere.
  if (heroEl && !reduceMotion) {
    heroEl.classList.add("is-plating");
    const titleEl = heroEl.querySelector(".recipe-hero__title");
    if (titleEl) {
      const full = titleEl.textContent;
      titleEl.textContent = "";
      titleEl.classList.add("is-typing");
      setTimeout(() => {
        if (!document.body.contains(titleEl)) return;
        let i = 0;
        const iv = setInterval(() => {
          if (!document.body.contains(titleEl)) { clearInterval(iv); return; }
          titleEl.textContent = full.slice(0, ++i);
          if (i >= full.length) { clearInterval(iv); titleEl.classList.remove("is-typing"); }
        }, 40);
      }, 340);
    }
  }
  wireScrollReveal(); // sezioni che appaiono a cascata mentre si scorre

  const pMinus = root.querySelector("#pMinus");
  const pPlus = root.querySelector("#pPlus");
  if (pMinus) pMinus.addEventListener("click", () => { detailServings = Math.max(1, (detailServings || base || 1) - 1); render(); });
  if (pPlus) pPlus.addEventListener("click", () => { detailServings = (detailServings || base || 1) + 1; render(); });
  const sbw = root.querySelector("#scaleByWeight");
  if (sbw) sbw.addEventListener("click", () => openScaleByWeight(r, base, ingredients));
  const pscale = root.querySelector("#panScale");
  if (pscale) pscale.addEventListener("click", () => openPanScaler(r, base));

  root.querySelector("#favBtn").addEventListener("click", (e) => {
    if (!r.favorite) { fxBurstFrom(e.currentTarget, { emojis: ["❤️", "💛", "✨"] }); haptic(15); }
    store.updateRecipe(r.id, { favorite: !r.favorite });
  });
  root.querySelectorAll("#rating .star").forEach((st) => st.addEventListener("click", () => {
    const v = parseInt(st.dataset.v, 10);
    store.updateRecipe(r.id, { rating: v === r.rating ? 0 : v });
  }));

  root.querySelectorAll(".ing-row[data-ix]").forEach((row) => row.addEventListener("click", () => {
    const ix = parseInt(row.dataset.ix, 10);
    if (ingChecks.has(ix)) ingChecks.delete(ix); else ingChecks.add(ix);
    row.classList.toggle("ing-row--done");
  }));
  const convUnits = root.querySelector("#convUnits");
  if (convUnits) convUnits.addEventListener("click", () => { convertUnits = !convertUnits; render(); });

  const addToCart = root.querySelector("#addToCart");
  if (addToCart) addToCart.addEventListener("click", async () => {
    const items = ingredients.map((it) => ({
      name: it.name,
      unit: it.unit || "",
      qty: it.qty != null ? it.qty * factor : null,
      category: categorize(it.name),
      from: r.title
    }));
    const res = await store.addShoppingItems(items);
    toast(shoppingToast(res), "success");
  });

  const addMissing = root.querySelector("#addMissing");
  if (addMissing) addMissing.addEventListener("click", async () => {
    const items = ingredients
      .filter((it) => !store.inPantry(it.name))
      .map((it) => ({ name: it.name, unit: it.unit || "", qty: it.qty != null ? it.qty * factor : null, category: categorize(it.name), from: r.title }));
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
  root.querySelector("#freezeBtn").addEventListener("click", () => openFreezeDialog(r));

  const reviewBtn = root.querySelector("#reviewBtn");
  if (reviewBtn) reviewBtn.addEventListener("click", () => openCookReview(r));
  const timelineBtn = root.querySelector("#timelineBtn");
  if (timelineBtn) timelineBtn.addEventListener("click", () => openCookTimeline([r]));
  const completeMealBtn = root.querySelector("#completeMealBtn");
  if (completeMealBtn) completeMealBtn.addEventListener("click", () => openCompleteMeal(r));
  const collectionsBtn = root.querySelector("#collectionsBtn");
  if (collectionsBtn) collectionsBtn.addEventListener("click", () => openCollections(r));
  const prepRemind = root.querySelector("#prepRemind");
  if (prepRemind) prepRemind.addEventListener("click", () => openPrepReminder(r));

  // Galleria "Le mie creazioni"
  const checkPhotoBtn = root.querySelector("#checkPhotoBtn");
  const checkPhotoFile = root.querySelector("#checkPhotoFile");
  if (checkPhotoBtn) checkPhotoBtn.addEventListener("click", () => checkPhotoFile.click());
  if (checkPhotoFile) checkPhotoFile.addEventListener("change", async () => {
    const f = checkPhotoFile.files[0]; checkPhotoFile.value = "";
    if (!f) return;
    openDishCheck(f, r.title);
  });
  const askChefBtn = root.querySelector("#askChefBtn");
  if (askChefBtn) askChefBtn.addEventListener("click", () => openAskChef(r));
  const watchVideo = root.querySelector("#watchVideo");
  if (watchVideo) watchVideo.addEventListener("click", () => openVideoPlayer(videoInfo(r.videoUrl) ? r.videoUrl : r.url));
  const robotBtn = root.querySelector("#robotBtn");
  if (robotBtn) robotBtn.addEventListener("click", () => openRobotMode(r));
  const convertBtn = root.querySelector("#convertBtn");
  if (convertBtn) convertBtn.addEventListener("click", () => openConvertRecipe(r));

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

  let chefStop = null;
  const chefBtn = root.querySelector("#chefBtn");
  if (chefBtn) chefBtn.addEventListener("click", () => {
    if (chefStop) { chefStop(); chefStop = null; chefBtn.innerHTML = "🍳 Leggi la ricetta"; return; }
    chefStop = speakRecipe(r);
    if (chefStop) chefBtn.innerHTML = "⏹ Ferma la lettura";
  });

  const pdfRecipeBtn = root.querySelector("#pdfRecipeBtn");
  if (pdfRecipeBtn) pdfRecipeBtn.addEventListener("click", () => exportRecipePdf(r));
  const shareLinkBtn = root.querySelector("#shareLinkBtn");
  if (shareLinkBtn) shareLinkBtn.addEventListener("click", () => shareRecipeLink(r));

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
  wireVoiceNote(r);
  wireReactions(r);
  animateCountUps(root); // anima anelli nutrizionali e numeri della ricetta

  // Tinta dell'hero dal colore dominante della foto (ravvivato e scurito per
  // tenere leggibile il titolo bianco).
  if (r.photo) tintFromImage(r.photo, ([R, G, B]) => {
    const hero = root.querySelector(".recipe-hero");
    if (!hero) return;
    const mx = Math.max(R, G, B) || 1;
    const k = Math.min(1, 110 / mx);
    hero.style.setProperty("--hero-tint", `${Math.round(R * k)},${Math.round(G * k)},${Math.round(B * k)}`);
  });
}

// Nota vocale di una ricetta: registrata col microfono e salvata SOLO su questo
// telefono (in localStorage, non sincronizzata). Max 30 secondi.
function voiceKey(id) { return "ricettario.voice." + id; }
// Reazioni della famiglia: ognuno (per nickname) lascia una reazione rapida a un
// piatto. Si sincronizzano con le ricette (stesso account/casa).
const REACTIONS = ["😍", "🔥", "👍", "😐"];
function reactionsBarHtml(r) {
  const list = Array.isArray(r.reactions) ? r.reactions : [];
  const me = getNickname() || "Io";
  const mine = list.find((x) => x.by === me);
  const counts = {};
  list.forEach((x) => { (counts[x.emoji] = counts[x.emoji] || []).push(x.by); });
  const btns = REACTIONS.map((e) => {
    const who = counts[e] || [];
    const on = mine && mine.emoji === e;
    return `<button class="react ${on ? "is-on" : ""}" data-react="${e}">${e}${who.length ? `<span class="react__n">${who.length}</span>` : ""}</button>`;
  }).join("");
  const whoLine = list.length
    ? `<div class="react__who">${list.map((x) => `${x.emoji} ${escapeHtml(x.by)}`).join(" · ")}</div>`
    : `<div class="react__hint">Tocca un'emoji per dire com'era!</div>`;
  return `<div class="reactions">${btns}</div>${whoLine}`;
}
async function toggleReaction(r, emoji) {
  const me = getNickname() || "Io";
  let list = Array.isArray(r.reactions) ? r.reactions.slice() : [];
  const existing = list.find((x) => x.by === me);
  if (existing && existing.emoji === emoji) list = list.filter((x) => x.by !== me); // ri-tocco = tolgo
  else { list = list.filter((x) => x.by !== me); list.push({ by: me, emoji, ts: new Date().toISOString() }); }
  r.reactions = list;
  haptic(8);
  try { await store.updateRecipe(r.id, { reactions: list }); } catch (e) { /* offline: resta locale */ }
}
function wireReactions(r) {
  const body = root.querySelector("#reactBody");
  if (!body) return;
  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-react]");
    if (!b) return;
    const wasOn = b.classList.contains("is-on");
    await toggleReaction(r, b.dataset.react);
    body.innerHTML = reactionsBarHtml(r);
    if (!wasOn && !reduceMotion) { try { fxBurstFrom(body.querySelector(".react.is-on") || body, { emojis: [b.dataset.react, "✨"], count: 8 }); } catch (e2) {} }
  });
}
function wireVoiceNote(r) {
  const body = root.querySelector("#voiceBody");
  if (!body) return;
  const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  let rec = null, chunks = [], startTs = 0, durTimer = null;
  const stored = () => { try { return localStorage.getItem(voiceKey(r.id)); } catch (e) { return null; } };

  function paint() {
    const note = stored();
    if (note) {
      body.innerHTML = `<audio controls src="${note}" style="width:100%"></audio>
        <button class="btn btn--block" id="voiceDel" style="margin-top:8px;color:var(--danger)">${iconHtml("trash")} Elimina nota</button>`;
      body.querySelector("#voiceDel").addEventListener("click", async () => {
        const ok = await confirmDialog({ title: "Eliminare la nota vocale?", confirmText: "Elimina", danger: true });
        if (ok) { try { localStorage.removeItem(voiceKey(r.id)); } catch (e) {} paint(); }
      });
    } else if (!supported) {
      body.innerHTML = `<div class="hint" style="margin:0">La registrazione vocale non è supportata su questo dispositivo.</div>`;
    } else {
      body.innerHTML = `<button class="btn btn--block" id="voiceRec">🎙️ Registra una nota</button>
        <div class="hint" style="margin-top:6px">Un promemoria vocale per questa ricetta (max 30s, salvato solo su questo telefono).</div>`;
      body.querySelector("#voiceRec").addEventListener("click", startRec);
    }
  }

  async function startRec() {
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { toast("Permesso microfono negato", "error"); return; }
    try {
      rec = new MediaRecorder(stream); chunks = []; startTs = Date.now();
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(durTimer);
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        const fr = new FileReader();
        fr.onload = () => {
          try { localStorage.setItem(voiceKey(r.id), fr.result); toast("Nota vocale salvata", "success"); }
          catch (e) { toast("Memoria piena: prova una nota più breve", "error"); }
          paint();
        };
        fr.readAsDataURL(blob);
      };
      rec.start();
      body.innerHTML = `<button class="btn btn--block btn--primary" id="voiceStop">⏹ Ferma · <span id="voiceTime">0:00</span></button>
        <div class="hint" style="margin-top:6px">Sto registrando… tocca per fermare (max 30s).</div>`;
      body.querySelector("#voiceStop").addEventListener("click", () => { if (rec && rec.state !== "inactive") rec.stop(); });
      durTimer = setInterval(() => {
        const s = Math.floor((Date.now() - startTs) / 1000);
        const t = body.querySelector("#voiceTime"); if (t) t.textContent = `0:${String(s).padStart(2, "0")}`;
        if (s >= 30 && rec && rec.state !== "inactive") rec.stop();
      }, 250);
    } catch (e) { stream.getTracks().forEach((t) => t.stop()); toast("Registrazione non riuscita", "error"); }
  }

  paint();
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
  const ringVals = perPortion || totalScaled;
  const ringsHtml = `<div class="nrings">
    ${nutriRing("kcal", ringVals.kcal, "", 2000, "var(--primary-2)")}
    ${nutriRing("Prot.", ringVals.p, "g", 75, "#5aa9ff")}
    ${nutriRing("Carb.", ringVals.c, "g", 260, "#ffd166")}
    ${nutriRing("Grassi", ringVals.f, "g", 70, "#ef6f9c")}
  </div><div class="hint" style="margin:-2px 0 8px;text-align:center">${perPortion ? "per porzione" : "totale"}</div>`;
  const rows = [];
  if (perPortion) rows.push(`<div class="nutri-row"><span class="nutri-lbl">Per porzione</span><span class="nutri-val">${macroLine(perPortion)}</span></div>`);
  rows.push(`<div class="nutri-row"><span class="nutri-lbl">Totale${detailServings ? ` (${detailServings} porz.)` : ""}</span><span class="nutri-val">${macroLine(totalScaled)}</span></div>`);
  const missing = Array.isArray(nut.skippedNames) ? nut.skippedNames : [];
  const note = `<div class="hint" style="margin-top:8px">Stima da ${nut.used} ingredienti${missing.length ? ` · ${missing.length} non conteggiati` : ""}.</div>`;
  const missList = missing.length
    ? `<div class="nutri-missing">Non conteggiati: ${missing.map((m) => escapeHtml(m)).join(", ")}.<br>Aggiungili nelle note o correggi la riga per migliorare la stima.</div>`
    : "";
  return `${title}
    ${ringsHtml}
    <div class="nutri-box">${rows.join("")}</div>
    ${note}
    ${missList}
    <button class="btn btn--ghost btn--block" id="nutriCalc" style="margin-top:10px">${iconHtml("sparkle")} Ricalcola</button>`;
}

// Anello di progresso per un macronutriente (valore / riferimento giornaliero).
function nutriRing(label, value, unit, ref, color) {
  const pct = Math.max(0, Math.min(1, (value || 0) / ref));
  const R = 20, CIRC = 2 * Math.PI * R;
  const off = CIRC * (1 - pct);
  return `<div class="nring">
    <svg viewBox="0 0 50 50" width="58" height="58" aria-hidden="true">
      <circle cx="25" cy="25" r="${R}" fill="none" stroke="var(--surface-3)" stroke-width="5"/>
      <circle class="nring__fg" cx="25" cy="25" r="${R}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${CIRC.toFixed(1)}" stroke-dashoffset="${CIRC.toFixed(1)}" data-off="${off.toFixed(1)}" transform="rotate(-90 25 25)"/>
    </svg>
    <div class="nring__v" data-countup="${Math.round(value || 0)}" data-suffix="${unit}">0${unit}</div>
    <div class="nring__l">${label}</div>
  </div>`;
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

// Link "Fornelli" che incorpora la ricetta nell'hash: aprendolo nell'app, propone
// di salvarla. Da inviare a chi ha Fornelli. (Niente foto nel link: troppo pesante.)
function buildRecipeLink(r) {
  const data = {
    t: r.title || "", s: r.servings || null, m: r.time || null, u: r.url || "",
    g: Array.isArray(r.tags) ? r.tags : [],
    i: (r.ingredients || []).map((it) => it.raw || ingredientText(it)),
    p: Array.isArray(r.steps) ? r.steps : []
  };
  const enc = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  return location.origin + location.pathname + "#r=" + enc;
}
async function shareRecipeLink(r) {
  const link = buildRecipeLink(r);
  try {
    if (navigator.share) await navigator.share({ title: r.title, text: `${r.title} — ricetta da Fornelli`, url: link });
    else { await navigator.clipboard.writeText(link); toast("Link copiato negli appunti", "success"); }
  } catch (e) { /* annullato */ }
}
let pendingSharedRecipe = null;
function consumeSharedRecipe() {
  if (!pendingSharedRecipe || loginMode) return;
  const enc = pendingSharedRecipe; pendingSharedRecipe = null;
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(enc))));
    openRecipeForm({ prefill: { title: data.t, servings: data.s, time: data.m, url: data.u, tags: data.g, ingredients: data.i, steps: data.p } });
    toast("Ricetta ricevuta: controlla e salva", "success");
  } catch (e) { /* link non valido */ }
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

// "Com'è venuta?": voto a stelle + nota datata + foto, dopo aver cucinato.
// "Com'è venuto?": scatta/scegli una foto del piatto e chiede a un'AI di visione
// un breve parere (cottura, colore, consistenza). Onesto sui limiti: è un parere
// a colpo d'occhio, non valuta sale/sapore/cottura interna.
async function openDishCheck(file, title) {
  let dataUrl;
  try { dataUrl = await fileToDataUrl(file, 672, 0.6); }
  catch (e) { toast("Foto non valida", "error"); return; }
  const m = openModal(`
    <h3 class="modal__title">📷 Com'è venuto?</h3>
    <img src="${escapeHtml(dataUrl)}" alt="" style="width:100%;max-height:240px;object-fit:cover;border-radius:14px;display:block;margin-bottom:12px" />
    <div id="dishCheckBody"><div style="text-align:center;padding:6px 0"><div class="ai-load"><div class="sk sk--line"></div><div class="sk sk--line sk--short"></div><div class="sk sk--line"></div></div><div class="hint">Sto guardando il piatto…</div></div></div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>
  `);
  m.el.querySelector('[data-act="ok"]').onclick = m.close;
  const body = m.el.querySelector("#dishCheckBody");
  try {
    const feedback = await analyzeDishPhoto(dataUrl, title);
    if (!body.isConnected) return; // l'utente ha chiuso nel frattempo
    body.innerHTML = `<div class="dish-feedback">${escapeHtml(feedback).replace(/\n+/g, "<br>")}</div>
      <div class="hint" style="margin-top:12px">⚠️ È solo un parere "a colpo d'occhio" da una foto: può sbagliare e non valuta sale, sapore o cottura interna.</div>`;
  } catch (e) {
    if (!body.isConnected) return;
    body.innerHTML = `<div class="hint" style="color:var(--danger)">${escapeHtml(e.message || "Analisi non riuscita.")}</div>`;
  }
}

// Importa una ricetta da un link video social (o da testo incollato), via AI worker.
// Riconosce titolo e autore di un video (YouTube/TikTok) senza chiavi, via oEmbed.
async function videoMeta(url) {
  try {
    const u = new URL(url); const h = u.hostname.replace(/^www\./, "");
    let endpoint = null;
    if (/youtube\.com|youtu\.be/.test(h)) endpoint = "https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(url);
    else if (/tiktok\.com/.test(h)) endpoint = "https://www.tiktok.com/oembed?url=" + encodeURIComponent(url);
    if (!endpoint) return null;
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 8000);
    const r = await fetch(endpoint, { signal: c.signal }); clearTimeout(t);
    if (!r.ok) return null;
    const d = await r.json();
    return { title: d.title || "", author: d.author_name || "" };
  } catch (e) { return null; }
}
// Dal titolo del video ricava una query "pulita" col nome del piatto (toglie il
// canale, parole di contorno, emoji, punteggiatura).
function dishQueryFromTitle(title, author) {
  let t = " " + (title || "") + " ";
  if (author) t = t.replace(new RegExp(author.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), " ");
  t = t.replace(/[​-‍﻿]/g, ""); // caratteri a larghezza zero (dagli emoji)
  // Taglia al primo separatore "forte" (due punti, barra o emoji): di solito
  // divide il nome del piatto dal sottotitolo promozionale.
  const cut = t.search(/[:|｜]|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}]/u);
  if (cut > 5) t = t.slice(0, cut);
  t = t.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}]/gu, " ")
    .replace(/[“”"'|•·–—_\-!?,;]+/g, " ")
    .replace(/\b(ricetta|ricette|la mia|le mie|il mio|i miei|come si fa|come fare|tutorial|video ?ricetta|originale|facile|veloce|perfett[ao]|cremos[ao]|buonissim[ao]|anni\s*\d0)\b/ig, " ")
    // toglie gli accenti (la ricerca di alcune fonti non li gestisce: "crêpes" -> "crepes")
    .replace(/[àáâ]/gi, "a").replace(/[èéê]/gi, "e").replace(/[ìíî]/gi, "i").replace(/[òóô]/gi, "o").replace(/[ùúû]/gi, "u")
    .replace(/\s+/g, " ").trim().toLowerCase();
  return t;
}

// Dall'autore/canale del video ricava la fonte del Ricettario online su cui
// filtrare la ricerca (così cerca sullo stesso sito del video). null = tutte.
function sourceFromAuthor(author) {
  const a = (author || "").toLowerCase();
  if (/giallo\s*zafferano/.test(a)) return "gz";
  if (/cookist/.test(a)) return "cookist";
  if (/misya/.test(a)) return "misya";
  if (/ricette\s*della\s*nonna|\bnonna\b/.test(a)) return "ricettenonna";
  if (/moulinex|companion|cookeo/.test(a)) return "moulinex";
  if (/bimby|cookidoo|thermomix/.test(a)) return "bimby";
  return null;
}

function openVideoImport(prefillUrl, onRecipe) {
  const m = openModal(`
    <h3 class="modal__title">📱 Importa da video</h3>
    <p class="hint" style="margin-top:-8px;margin-bottom:12px">Incolla il link di un video (TikTok, Instagram, YouTube): l'AI prova a ricavarne la ricetta. Funziona meglio se la ricetta è scritta nella descrizione del video.</p>
    <div class="field"><input type="url" id="viUrl" inputmode="url" placeholder="https://..." value="${escapeHtml(prefillUrl || "")}" /></div>
    <div class="field"><label>Oppure incolla qui la descrizione del video (facoltativo)</label><textarea id="viText" rows="4" placeholder="Incolla il testo della ricetta se il link non basta"></textarea></div>
    <button class="btn btn--ghost btn--block" id="viSearchNow" style="margin-bottom:6px">${iconHtml("magnifying-glass")} Cerca questa ricetta nel Ricettario online</button>
    <div id="viBody"></div>
    <div class="modal__actions"><button class="btn" data-act="cancel">Annulla</button><button class="btn btn--primary" data-act="ok">Importa</button></div>
  `);
  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  // Sempre disponibile: riconosce il video e cerca quel piatto nel Ricettario online.
  const doSearchOnline = async (url) => {
    if (!url) { toast("Incolla prima il link del video", "error"); return; }
    const body = m.el.querySelector("#viBody");
    body.innerHTML = `<div style="text-align:center;padding:6px 0"><div class="ai-load"><div class="sk sk--line"></div><div class="sk sk--line sk--short"></div><div class="sk sk--line"></div></div><div class="hint">Riconosco il video…</div></div>`;
    const meta = await videoMeta(url);
    const q = meta && meta.title ? dishQueryFromTitle(meta.title, meta.author) : "";
    if (!q) { body.innerHTML = `<div class="hint" style="color:var(--danger)">Non riconosco questo video. Funziona con i link di YouTube o TikTok.</div>`; return; }
    const src = meta ? sourceFromAuthor(meta.author) : null;
    if (src) mealSource = src; // filtra sulla fonte del video (es. Cookist)
    closeAllModals(); // chiude anche il form della ricetta sotto, altrimenti copre i risultati
    searchOnline(q);
    if (videoInfo(url)) pendingVideoForImport = url; // aggancia il video alla ricetta che importerai
  };
  m.el.querySelector("#viSearchNow").onclick = () => doSearchOnline(m.el.querySelector("#viUrl").value.trim());
  const okBtn = m.el.querySelector('[data-act="ok"]');
  okBtn.onclick = async () => {
    const url = m.el.querySelector("#viUrl").value.trim();
    const text = m.el.querySelector("#viText").value.trim();
    if (!url && !text) { toast("Inserisci un link o incolla la descrizione", "error"); return; }
    const body = m.el.querySelector("#viBody");
    body.innerHTML = `<div style="text-align:center;padding:6px 0"><div class="ai-load"><div class="sk sk--line"></div><div class="sk sk--line sk--short"></div><div class="sk sk--line"></div></div><div class="hint">Leggo la ricetta…</div></div>`;
    okBtn.disabled = true;
    try {
      const data = await importFromVideo(url, text);
      m.close();
      onRecipe(data);
      toast("Ricetta importata! Controllala e salva.", "success");
    } catch (e) {
      okBtn.disabled = false;
      const hint = e.code === "nocaption" ? " Apri il video, copia la descrizione e incollala nel riquadro qui sopra." : "";
      body.innerHTML = `<div class="hint" style="color:var(--danger)">${escapeHtml(e.message || "Import non riuscito.")}${hint}</div>`;
      // Passo in più: riconosco il video e propongo di cercarne la ricetta online.
      const meta = url ? await videoMeta(url) : null;
      if (meta && meta.title) {
        const q = dishQueryFromTitle(meta.title, meta.author);
        const src = sourceFromAuthor(meta.author);
        const where = src ? `su ${escapeHtml(SOURCE_LABEL[src] || src)}` : "nel Ricettario online";
        body.insertAdjacentHTML("beforeend", `<div class="hint" style="margin-top:12px">🎬 Riconosciuto: <b>${escapeHtml(meta.title)}</b>${meta.author ? ` · ${escapeHtml(meta.author)}` : ""}.</div>${q ? `<button class="btn btn--primary btn--block" id="viSearch" style="margin-top:8px">${iconHtml("magnifying-glass")} Cerca "${escapeHtml(q)}" ${where}</button>` : ""}`);
        const sb = body.querySelector("#viSearch");
        if (sb) sb.onclick = () => { if (src) mealSource = src; closeAllModals(); searchOnline(q); if (videoInfo(url)) pendingVideoForImport = url; };
      }
    }
  };
}

// Inventa una ricetta dagli ingredienti, via AI worker.
function openGenerateRecipe(prefill, onRecipe) {
  const m = openModal(`
    <h3 class="modal__title">✨ Inventa una ricetta</h3>
    <p class="hint" style="margin-top:-8px;margin-bottom:12px">Scrivi gli ingredienti che hai: l'AI propone una ricetta semplice. Poi puoi modificarla e salvarla.</p>
    <div class="field"><label>Ingredienti</label><textarea id="grIng" rows="3" placeholder="es. zucchine, uova, pasta, parmigiano">${escapeHtml(prefill || "")}</textarea></div>
    <div class="field"><label>Nota (facoltativa)</label><input type="text" id="grNote" placeholder="es. veloce, vegetariana, per 2 persone" /></div>
    <div id="grBody"></div>
    <div class="modal__actions"><button class="btn" data-act="cancel">Annulla</button><button class="btn btn--primary" data-act="ok">Inventa</button></div>
  `);
  setTimeout(() => m.el.querySelector("#grIng").focus(), 50);
  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  const okBtn = m.el.querySelector('[data-act="ok"]');
  okBtn.onclick = async () => {
    const ing = m.el.querySelector("#grIng").value.trim();
    if (!ing) { toast("Scrivi qualche ingrediente", "error"); return; }
    const note = m.el.querySelector("#grNote").value.trim();
    const body = m.el.querySelector("#grBody");
    body.innerHTML = `<div style="text-align:center;padding:6px 0"><div class="ai-load"><div class="sk sk--line"></div><div class="sk sk--line sk--short"></div><div class="sk sk--line"></div></div><div class="hint">Sto inventando…</div></div>`;
    okBtn.disabled = true;
    try {
      const data = await generateRecipe(ing, note);
      m.close();
      onRecipe(data);
      toast("Ricetta creata! Controllala e salva.", "success");
    } catch (e) {
      okBtn.disabled = false;
      body.innerHTML = `<div class="hint" style="color:var(--danger)">${escapeHtml(e.message || "Non riuscito.")}</div>`;
    }
  };
}

// "Chiedi allo chef": mini chat di domande di cucina (AI worker).
function openAskChef(r) {
  const ctx = r ? { title: r.title, ingredients: (r.ingredients || []).map((i) => i.name || ingredientText(i)).filter(Boolean).slice(0, 40) } : {};
  const m = openModal(`
    <h3 class="modal__title">💬 Chiedi allo chef</h3>
    <p class="hint" style="margin-top:-8px;margin-bottom:10px">Sostituzioni, tempi di cottura, dubbi in cucina…${r ? ` (stai guardando "${escapeHtml(r.title)}")` : ""}</p>
    <div id="chefLog" class="chef-log"></div>
    <div class="search-bar"><input type="text" id="chefQ" placeholder="Es. posso sostituire il burro?" /><button class="btn btn--primary" id="chefSend">Chiedi</button></div>
    <div class="modal__actions"><button class="btn" data-act="ok">Chiudi</button></div>
  `);
  m.el.querySelector('[data-act="ok"]').onclick = m.close;
  const log = m.el.querySelector("#chefLog");
  const input = m.el.querySelector("#chefQ");
  const sendBtn = m.el.querySelector("#chefSend");
  setTimeout(() => input.focus(), 50);
  const ask = async () => {
    const q = input.value.trim(); if (!q) return;
    input.value = "";
    log.insertAdjacentHTML("beforeend", `<div class="chef-q">${escapeHtml(q)}</div><div class="chef-a chef-a--load"><span class="spinner spinner--sm"></span></div>`);
    log.scrollTop = log.scrollHeight;
    const aEl = log.lastElementChild;
    sendBtn.disabled = true;
    try {
      const ans = await askChef(q, ctx);
      aEl.classList.remove("chef-a--load");
      aEl.innerHTML = escapeHtml(ans).replace(/\n+/g, "<br>");
    } catch (e) {
      aEl.classList.remove("chef-a--load");
      aEl.innerHTML = `<span style="color:var(--danger)">${escapeHtml(e.message || "Non riuscito.")}</span>`;
    }
    sendBtn.disabled = false;
    log.scrollTop = log.scrollHeight;
  };
  sendBtn.onclick = ask;
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") ask(); });
}

// ---------------- Strumento Timer (globale, fuori dalla Modalità cucina) ----------------
// I timer continuano a contare mentre navighi nell'app e suonano/vibrano a fine.
let gTimers = []; // { id, label, remaining, running, alarming }
let gTicker = null, gAlarm = null, gSeq = 0;
let timersPanelEl = null; // modale Timer aperta (per ridisegnarla a ogni tick)
function playBeep() {
  if (getSoundOn()) { playChime(); return; } // "tin" gentile se i micro-suoni sono accesi
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = "sine"; o.frequency.value = 880;
    o.start(); g.gain.setValueAtTime(0.3, ctx.currentTime); o.stop(ctx.currentTime + 0.6);
  } catch (e) { /* audio non disponibile */ }
}
function vibrateAlarm() { try { navigator.vibrate && navigator.vibrate([300, 120, 300]); } catch (e) {} }
function fmtClock(s) { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, "0")}`; }
function ensureGlobalTicker() {
  const any = gTimers.some((t) => t.running);
  if (any && !gTicker) gTicker = setInterval(gTick, 1000);
  else if (!any && gTicker) { clearInterval(gTicker); gTicker = null; }
}
function ensureGlobalAlarm() {
  const any = gTimers.some((t) => t.alarming);
  if (any && !gAlarm) gAlarm = setInterval(() => { playBeep(); vibrateAlarm(); }, 1700);
  else if (!any && gAlarm) { clearInterval(gAlarm); gAlarm = null; }
}
function gTick() {
  for (const t of gTimers) {
    if (!t.running) continue;
    t.remaining--;
    if (t.remaining <= 0) { t.remaining = 0; t.running = false; t.alarming = true; playBeep(); vibrateAlarm(); toast(`⏰ ${t.label} finito!`, "success"); }
  }
  ensureGlobalTicker(); ensureGlobalAlarm(); paintTimerWidget(); paintTimersPanel();
}
function addGlobalTimer(mins, secs, label) {
  const total = Math.max(1, (parseInt(mins, 10) || 0) * 60 + (parseInt(secs, 10) || 0));
  gTimers.push({ id: ++gSeq, label: (label || "").trim() || `Timer ${gTimers.length + 1}`, remaining: total, running: true });
  ensureGlobalTicker(); paintTimerWidget(); paintTimersPanel();
}
// Indicatore fluttuante mostrato quando c'è almeno un timer attivo.
function paintTimerWidget() {
  let w = document.getElementById("timerWidget");
  // Mentre il pannello Timer è aperto i timer si vedono già lì: niente chip
  // fluttuante (evita la sovrapposizione col tasto "Avvia").
  if (timersPanelEl && !timersPanelEl.isConnected) timersPanelEl = null;
  if (timersPanelEl) { if (w) w.remove(); return; }
  if (!gTimers.length) { if (w) w.remove(); return; }
  if (!w) { w = document.createElement("button"); w.id = "timerWidget"; w.className = "timer-widget"; w.onclick = openTimersTool; document.body.appendChild(w); }
  const alarming = gTimers.some((t) => t.alarming);
  const soon = gTimers.filter((t) => t.running).sort((a, b) => a.remaining - b.remaining)[0] || gTimers.find((t) => t.alarming) || gTimers[0];
  w.classList.toggle("is-alarm", alarming);
  w.innerHTML = `⏱ ${alarming ? "Finito!" : fmtClock(soon.remaining)}${gTimers.length > 1 ? ` · ${gTimers.length}` : ""}`;
}
function paintTimersPanel() {
  if (!timersPanelEl || !timersPanelEl.isConnected) { timersPanelEl = null; return; }
  const box = timersPanelEl.querySelector("#timersList");
  if (!box) return;
  box.innerHTML = gTimers.length
    ? gTimers.map((t) => `<div class="ctimer ${t.alarming ? "is-alarm" : ""}" data-id="${t.id}">
        <span class="ctimer__lbl">${escapeHtml(t.label)}</span>
        <span class="ctimer__time">${t.alarming ? "Finito!" : fmtClock(t.remaining)}</span>
        <button class="ctimer__btn" data-act="toggle">${t.alarming ? "🔕 OK" : (t.running ? "⏸" : "▶")}</button>
        <button class="ctimer__btn" data-act="del">✕</button>
      </div>`).join("")
    : `<div class="hint" style="text-align:center;padding:8px">Nessun timer attivo. Aggiungine uno qui sotto.</div>`;
  box.querySelectorAll(".ctimer").forEach((row) => {
    const id = parseInt(row.dataset.id, 10);
    const t = gTimers.find((x) => x.id === id);
    row.querySelector('[data-act="toggle"]').onclick = () => { if (t.alarming) { t.alarming = false; ensureGlobalAlarm(); } else if (t.remaining > 0) { t.running = !t.running; ensureGlobalTicker(); } paintTimersPanel(); paintTimerWidget(); };
    row.querySelector('[data-act="del"]').onclick = () => { gTimers = gTimers.filter((x) => x.id !== id); ensureGlobalTicker(); ensureGlobalAlarm(); paintTimersPanel(); paintTimerWidget(); };
  });
}
function openTimersTool() {
  const m = openModal(`
    <h3 class="modal__title">⏱ Timer da cucina</h3>
    <p class="hint" style="margin-top:-8px;margin-bottom:12px">Avvia più timer con nome: continuano a contare mentre usi l'app e suonano alla fine.</p>
    <div id="timersList"></div>
    <div class="timer-add">
      <input type="text" id="ntName" placeholder="Nome (es. Pasta)" />
      <label class="timer-unit">min<input type="number" id="ntMin" min="0" inputmode="numeric" value="10" /></label>
      <label class="timer-unit">sec<input type="number" id="ntSec" min="0" max="59" inputmode="numeric" value="0" /></label>
      <button class="btn btn--primary" id="ntAdd">${iconHtml("plus")} Avvia</button>
    </div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>
  `);
  timersPanelEl = m.el;
  m.el.querySelector('[data-act="ok"]').onclick = () => { timersPanelEl = null; m.close(); paintTimerWidget(); };
  const add = () => { addGlobalTimer(m.el.querySelector("#ntMin").value, m.el.querySelector("#ntSec").value, m.el.querySelector("#ntName").value); m.el.querySelector("#ntName").value = ""; };
  m.el.querySelector("#ntAdd").onclick = add;
  paintTimersPanel();
}

// ---------------- Video della ricetta ----------------
// Riconosce un link video e ne ricava l'URL da incorporare (player nell'app).
function videoInfo(url) {
  if (!url) return null;
  let u;
  try { u = new URL(url); } catch (e) { return null; }
  const h = u.hostname.replace(/^www\./, "");
  if (h === "youtu.be" || h === "youtube.com" || h.endsWith(".youtube.com")) {
    let id = "";
    if (h === "youtu.be") id = u.pathname.slice(1);
    else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2];
    else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2];
    else id = u.searchParams.get("v") || "";
    id = (id || "").split(/[/?#]/)[0];
    if (id) return { kind: "youtube", embed: `https://www.youtube.com/embed/${id}`, tall: false };
  }
  if (h === "tiktok.com" || h.endsWith(".tiktok.com")) {
    const mm = u.pathname.match(/\/video\/(\d+)/) || u.pathname.match(/\/(\d{6,})/);
    if (mm) return { kind: "tiktok", embed: `https://www.tiktok.com/embed/v2/${mm[1]}`, tall: true };
    return { kind: "external" };
  }
  if (h === "vimeo.com" || h === "player.vimeo.com") { const mm = u.pathname.match(/\/(\d+)/); if (mm) return { kind: "vimeo", embed: `https://player.vimeo.com/video/${mm[1]}`, tall: false }; }
  if (h.endsWith("instagram.com") || h.endsWith("facebook.com") || h.endsWith("fb.watch")) return { kind: "external" };
  return null;
}
function openVideoPlayer(url) {
  const vi = videoInfo(url);
  if (!vi || vi.kind === "external" || !vi.embed) { try { window.open(url, "_blank", "noopener"); } catch (e) {} return; }
  const m = openModal(`
    <h3 class="modal__title">▶ Video della ricetta</h3>
    <div class="video-wrap ${vi.tall ? "video-wrap--tall" : ""}"><iframe src="${escapeHtml(vi.embed)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>
    <div class="modal__actions"><button class="btn" id="vOpen">Apri originale</button><button class="btn btn--primary" data-act="ok">Chiudi</button></div>
  `);
  m.el.querySelector('[data-act="ok"]').onclick = m.close;
  m.el.querySelector("#vOpen").onclick = () => { try { window.open(url, "_blank", "noopener"); } catch (e) {} };
}

// "Fotografa il frigo": l'AI riconosce gli alimenti da una foto, poi li aggiungi
// in dispensa o cerchi ricette online.
async function openFridgePhoto(file) {
  let dataUrl;
  try { dataUrl = await fileToDataUrl(file, 800, 0.6); } catch (e) { toast("Foto non valida", "error"); return; }
  const m = openModal(`
    <h3 class="modal__title">🧊 Cosa c'è nel frigo</h3>
    <div id="frBody"><div style="text-align:center;padding:8px 0"><div class="ai-load"><div class="sk sk--line"></div><div class="sk sk--line sk--short"></div><div class="sk sk--line"></div></div><div class="hint">Guardo cosa c'è…</div></div></div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>
  `);
  m.el.querySelector('[data-act="ok"]').onclick = m.close;
  const body = m.el.querySelector("#frBody");
  let items = [];
  const draw = () => {
    body.innerHTML = `<div class="hint" style="margin-bottom:8px">Ingredienti riconosciuti (tocca per togliere quelli sbagliati):</div>
      <div class="fr-chips">${items.length ? items.map((x, i) => `<button class="chip fr-chip" data-i="${i}">${escapeHtml(x)} ✕</button>`).join("") : '<span class="hint">Nessun alimento riconosciuto.</span>'}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <button class="btn btn--primary" id="frPantry">${iconHtml("basket")} Aggiungi in dispensa</button>
        <button class="btn btn--ghost" id="frOnline">${iconHtml("magnifying-glass")} Cerca ricette online</button>
      </div>`;
    body.querySelectorAll(".fr-chip").forEach((b) => b.onclick = () => { items.splice(parseInt(b.dataset.i, 10), 1); draw(); });
    body.querySelector("#frPantry").onclick = async () => {
      if (!items.length) { toast("Nessun alimento", "error"); return; }
      for (const it of items) await store.addPantryItem(it, null);
      m.close();
      toast(`${items.length} alimenti aggiunti in dispensa`, "success");
      if (currentRoute === "spesa") renderShopping();
    };
    body.querySelector("#frOnline").onclick = () => {
      if (!items.length) { toast("Nessun alimento", "error"); return; }
      m.close(); mealTab = "online"; navigate("ricettario"); performMealSearch(items.join(", "));
    };
  };
  try { items = await fridgeIngredients(dataUrl); if (!body.isConnected) return; draw(); }
  catch (e) { if (!body.isConnected) return; body.innerHTML = `<div class="hint" style="color:var(--danger)">${escapeHtml(e.message || "Non riuscito.")}</div>`; }
}

// "Scansiona lo scontrino": foto → OCR sul telefono (Tesseract) → alimenti in
// dispensa. Tutto locale: nessuna AI, quindi legge ciò che c'è, senza inventare.
async function openReceiptScan(file) {
  const m = openModal(`
    <h3 class="modal__title">🧾 Scontrino → Dispensa</h3>
    <div id="rcBody"><div style="text-align:center;padding:10px 0"><div class="ai-load"><div class="sk sk--line"></div><div class="sk sk--line sk--short"></div><div class="sk sk--line"></div></div><div class="hint rc-prog">Leggo lo scontrino sul telefono…</div></div></div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>
  `);
  m.el.querySelector('[data-act="ok"]').onclick = m.close;
  const body = m.el.querySelector("#rcBody");
  let items = [];
  const draw = () => {
    body.innerHTML = `<div class="hint" style="margin-bottom:8px">Spesa riconosciuta (tocca per togliere ciò che non è cibo):</div>
      <div class="fr-chips">${items.length ? items.map((x, i) => `<button class="chip fr-chip" data-i="${i}">${escapeHtml(x)} ✕</button>`).join("") : '<span class="hint">Niente riconosciuto.</span>'}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <button class="btn btn--primary" id="rcPantry">${iconHtml("basket")} Aggiungi in dispensa</button>
      </div>`;
    body.querySelectorAll(".fr-chip").forEach((b) => b.onclick = () => { items.splice(parseInt(b.dataset.i, 10), 1); draw(); });
    body.querySelector("#rcPantry").onclick = async () => {
      if (!items.length) { toast("Niente da aggiungere", "error"); return; }
      for (const it of items) await store.addPantryItem(it, null);
      m.close();
      toast(`${items.length} alimenti aggiunti in dispensa`, "success");
      if (currentRoute === "spesa") renderShopping();
    };
  };
  try {
    const { ocrImage } = await import("./ocr.js");
    const text = await ocrImage(file, (p) => { const el = body.querySelector(".rc-prog"); if (el) el.textContent = `Leggo lo scontrino… ${Math.round(p * 100)}%`; });
    if (!body.isConnected) return;
    items = parseReceiptText(text);
    if (!items.length) { body.innerHTML = `<div class="hint">Non ho letto la spesa. Prova con una foto più nitida, dritta e ben illuminata (inquadra solo lo scontrino).</div>`; return; }
    draw();
  } catch (e) {
    if (!body.isConnected) return;
    body.innerHTML = `<div class="hint" style="color:var(--danger)">${escapeHtml(e.message || "Riconoscimento non riuscito.")}</div>`;
  }
}

// Pianificatore settimanale AI: propone le cene della settimana scegliendo tra le
// tue ricette, con anteprima (rigenera / applica). Riempie solo i giorni vuoti.
function openWeekPlanner(days) {
  let recipes = allRecipes();
  if (typeof anyDietPref === "function" && anyDietPref()) { const f = recipes.filter(matchesDiet); if (f.length >= 2) recipes = f; }
  if (recipes.length < 2) { toast("Servono almeno 2 ricette salvate", "error"); return; }
  const titles = recipes.map((r) => r.title);
  let expiring = [];
  try { expiring = store.recipesForExpiring(3).map((r) => r.title); } catch (e) {}
  const matchTitle = (t) => {
    const lt = (t || "").toLowerCase().trim(); if (!lt) return null;
    return recipes.find((r) => r.title.toLowerCase().trim() === lt)
      || recipes.find((r) => { const rt = r.title.toLowerCase(); return rt.includes(lt) || lt.includes(rt); });
  };
  const m = openModal(`<h3 class="modal__title">✨ Menù della settimana (AI)</h3><div id="wpBody"></div>`);
  const body = m.el.querySelector("#wpBody");
  const spinner = () => { body.innerHTML = `<div style="text-align:center;padding:10px 0"><div class="ai-load"><div class="sk sk--line"></div><div class="sk sk--line sk--short"></div><div class="sk sk--line"></div></div><div class="hint">Compongo la settimana…</div></div>`; };
  const draw = (daysData) => {
    body.innerHTML = `<div class="hint" style="margin-bottom:8px">Proposta per le cene. Rigenera o applica (riempie solo i giorni senza cena).</div>
      <div class="wp-list">${days.map((d, i) => { const rec = matchTitle((daysData[i] || {}).cena); return `<div class="wp-day"><span class="wp-day__d">${WEEKDAYS_IT[i]} ${d.getDate()}</span><span class="wp-day__r">${rec ? escapeHtml(rec.title) : '<span style="color:var(--text-soft)">—</span>'}</span></div>`; }).join("")}</div>
      <div class="modal__actions" style="margin-top:12px"><button class="btn" id="wpRegen">↻ Rigenera</button><button class="btn btn--primary" id="wpApply">Applica</button></div>`;
    body.querySelector("#wpRegen").onclick = load;
    body.querySelector("#wpApply").onclick = async () => {
      let n = 0;
      for (let i = 0; i < days.length; i++) {
        const d = days[i]; const ds = ymd(d.getFullYear(), d.getMonth(), d.getDate());
        if (store.getPlanByDate(ds).some((e) => e.slot === "cena")) continue;
        const rec = matchTitle((daysData[i] || {}).cena);
        if (rec) { await store.addPlan(ds, rec.id, "cena"); n++; }
      }
      m.close(); toast(n ? `${n} cene pianificate ✨` : "Cene già pianificate", n ? "success" : ""); render();
    };
  };
  const load = async () => {
    spinner();
    try { const daysData = await planWeekAI(titles, false, expiring); if (!body.isConnected) return; draw(daysData); }
    catch (e) { if (!body.isConnected) return; body.innerHTML = `<div class="hint" style="color:var(--danger)">${escapeHtml(e.message || "Non riuscito.")}</div><div class="modal__actions"><button class="btn btn--primary" id="wpClose">Chiudi</button></div>`; const c = body.querySelector("#wpClose"); if (c) c.onclick = m.close; }
  };
  load();
}

// "Adatta la ricetta" a una dieta (vegano, leggero…): l'AI riscrive la ricetta,
// poi la salvi come NUOVA ricetta (l'originale resta intatta).
function openConvertRecipe(r) {
  const ingredients = (r.ingredients || []).map((it) => ingredientText(it)).filter(Boolean);
  const diets = [["vegano", "🌱 Vegano"], ["vegetariano", "🥚 Vegetariano"], ["senzaglutine", "🌾 Senza glutine"], ["senzalattosio", "🥛 Senza lattosio"], ["leggero", "🍃 Più leggero"]];
  const run = async (diet, label) => {
    const m = openModal(`
      <h3 class="modal__title">🥗 Adatta: ${escapeHtml(label)}</h3>
      <div id="cvBody"><div style="text-align:center;padding:8px 0"><div class="ai-load"><div class="sk sk--line"></div><div class="sk sk--line sk--short"></div><div class="sk sk--line"></div></div><div class="hint">Adatto la ricetta…</div></div></div>
      <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>
    `);
    m.el.querySelector('[data-act="ok"]').onclick = m.close;
    const body = m.el.querySelector("#cvBody");
    try {
      const d = await convertRecipe({ title: r.title, ingredients, steps: r.steps || [] }, diet);
      if (!body.isConnected) return;
      body.innerHTML = `${d.note ? `<div class="hint" style="margin-bottom:10px">${escapeHtml(d.note)}</div>` : ""}
        <div class="dish-feedback"><b>${escapeHtml(d.title)}</b><br><br><b>Ingredienti</b><br>${d.ingredients.map(escapeHtml).join("<br>")}${d.steps && d.steps.length ? `<br><br><b>Preparazione</b><br>${d.steps.map((s, i) => (i + 1) + ". " + escapeHtml(s)).join("<br>")}` : ""}</div>
        <button class="btn btn--primary btn--block" id="cvSave" style="margin-top:12px">${iconHtml("plus")} Salva come nuova ricetta</button>`;
      body.querySelector("#cvSave").onclick = () => { m.close(); openRecipeForm({ prefill: { title: d.title, servings: d.servings || r.servings, ingredients: d.ingredients, steps: d.steps, tags: (r.tags || []).slice() } }); };
    } catch (e) { if (!body.isConnected) return; body.innerHTML = `<div class="hint" style="color:var(--danger)">${escapeHtml(e.message || "Non riuscito.")}</div>`; }
  };
  const m = openModal(`
    <h3 class="modal__title">🥗 Adatta la ricetta</h3>
    <p class="hint" style="margin-top:-8px;margin-bottom:12px">L'AI riscrive "${escapeHtml(r.title)}" nella versione scelta. La salvi come nuova ricetta: l'originale resta com'è.</p>
    <div class="modal__actions" style="flex-direction:column;gap:8px">${diets.map(([k, l]) => `<button class="btn btn--block" data-diet="${k}">${l}</button>`).join("")}</div>
  `);
  m.el.querySelectorAll("[data-diet]").forEach((b) => b.onclick = () => { const label = b.textContent.trim(); m.close(); run(b.dataset.diet, label); });
}

// "Modalità robot": converte la ricetta in comandi per Companion o Bimby (AI).
function openRobotMode(r) {
  const run = async (device) => {
    try { localStorage.setItem("ricettario.robot", device); } catch (e) {}
    const ingredients = (r.ingredients || []).map((it) => ingredientText(it)).filter(Boolean);
    const label = device === "bimby" ? "Bimby" : "Companion";
    const m = openModal(`
      <h3 class="modal__title">🤖 Modalità ${escapeHtml(label)}</h3>
      <div id="robotBody"><div style="text-align:center;padding:8px 0"><div class="ai-load"><div class="sk sk--line"></div><div class="sk sk--line sk--short"></div><div class="sk sk--line"></div></div><div class="hint">Converto la ricetta per il ${escapeHtml(label)}…</div></div></div>
      <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>
    `);
    m.el.querySelector('[data-act="ok"]').onclick = m.close;
    const body = m.el.querySelector("#robotBody");
    try {
      const prog = await robotProgram({ title: r.title, ingredients, steps: r.steps || [] }, device);
      if (!body.isConnected) return;
      const note = prog.note ? `<div class="hint" style="margin-bottom:10px">${escapeHtml(prog.note)}</div>` : "";
      const list = prog.steps.map((s, i) => `<div class="robot-step"><span class="robot-step__n">${i + 1}</span><div class="robot-step__main"><div class="robot-step__a">${escapeHtml(s.azione)}</div>${s.impostazioni ? `<div class="robot-step__s">${iconHtml("sliders-horizontal")} ${escapeHtml(s.impostazioni)}</div>` : ""}</div></div>`).join("");
      body.innerHTML = note + `<div class="robot-list">${list}</div><div class="hint" style="margin-top:10px">⚠️ Valori indicativi generati dall'AI: controllali sul tuo ${escapeHtml(label)}. L'app non comanda il robot.</div>`;
    } catch (e) {
      if (!body.isConnected) return;
      body.innerHTML = `<div class="hint" style="color:var(--danger)">${escapeHtml(e.message || "Non riuscito.")}</div>`;
    }
  };
  const m = openModal(`
    <h3 class="modal__title">🤖 Modalità robot</h3>
    <p class="hint" style="margin-top:-8px;margin-bottom:12px">Converto la ricetta nei comandi del tuo robot da impostare a mano (accessorio, velocità, temperatura, tempo). Scegli il tuo robot:</p>
    <div class="modal__actions" style="flex-direction:column;gap:8px">
      <button class="btn btn--primary btn--block" data-dev="companion">🤖 Moulinex Companion</button>
      <button class="btn btn--block" data-dev="bimby">🥣 Bimby (Thermomix)</button>
    </div>
  `);
  m.el.querySelectorAll("[data-dev]").forEach((b) => b.onclick = () => { m.close(); run(b.dataset.dev); });
}

function openCookReview(r) {
  let rating = r.rating || 0;
  const stars = () => [1, 2, 3, 4, 5].map((v) => `<button class="star ${v <= rating ? "is-on" : ""}" data-v="${v}">${iconHtml("star")}</button>`).join("");
  const m = openModal(`
    <h3 class="modal__title">📝 Com'è venuta?</h3>
    <div class="field"><label>Voto</label><div class="rating" id="rvStars">${stars()}</div></div>
    <div class="field"><label>Nota (facoltativa)</label><textarea id="rvNote" rows="3" placeholder="Es. venuta benissimo, meno sale la prossima volta"></textarea></div>
    <button class="btn btn--ghost btn--block" id="rvPhoto">${iconHtml("image")} Aggiungi una foto</button>
    <input type="file" id="rvFile" accept="image/*" capture="environment" hidden />
    <div class="modal__actions"><button class="btn" data-act="cancel">Annulla</button><button class="btn btn--primary" data-act="ok">Salva</button></div>
  `);
  const redraw = () => m.el.querySelectorAll("#rvStars .star").forEach((s) => s.classList.toggle("is-on", parseInt(s.dataset.v, 10) <= rating));
  m.el.querySelector("#rvStars").addEventListener("click", (e) => { const b = e.target.closest(".star"); if (!b) return; const v = parseInt(b.dataset.v, 10); rating = v === rating ? 0 : v; redraw(); });
  const file = m.el.querySelector("#rvFile");
  m.el.querySelector("#rvPhoto").addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    const f = file.files[0]; file.value = "";
    if (!f) return;
    try { const url = await fileToDataUrl(f); const gallery = [...(Array.isArray(r.gallery) ? r.gallery : []), url]; await store.updateRecipe(r.id, { gallery }); r.gallery = gallery; toast("Foto aggiunta", "success"); } catch (e) { toast("Foto non aggiunta", "error"); }
  });
  m.el.querySelector('[data-act="cancel"]').addEventListener("click", m.close);
  m.el.querySelector('[data-act="ok"]').addEventListener("click", async () => {
    const note = m.el.querySelector("#rvNote").value.trim();
    const patch = { rating };
    if (note) { const stamp = new Date().toLocaleDateString("it-IT"); patch.notes = (r.notes ? r.notes + "\n\n" : "") + `[${stamp}] ${note}`; }
    await store.updateRecipe(r.id, patch);
    m.close(); toast("Salvato", "success"); render();
  });
}

// Aggiungi/togli la ricetta dalle raccolte (basate sui menu).
function openCollections(r) {
  const menus = store.getMenus();
  const rows = menus.map((mn) => {
    const inIt = store.getMenuRecipes(mn.id).some((x) => x.id === r.id);
    return `<label class="setting-row" style="cursor:pointer"><div class="setting-row__label">${escapeHtml(mn.name)}</div><input type="checkbox" class="mini-check" data-menu="${mn.id}" ${inIt ? "checked" : ""} /></label>`;
  }).join("");
  const m = openModal(`
    <h3 class="modal__title">${iconHtml("book-bookmark")} Aggiungi a una raccolta</h3>
    <div class="cl-scroll">${rows || `<div class="hint">Nessuna raccolta ancora. Creane una qui sotto.</div>`}</div>
    <div class="search-bar" style="margin-top:10px"><input type="text" id="newColl" placeholder="Nuova raccolta (es. Feste)..." /><button class="btn btn--primary" id="addColl">${iconHtml("plus")}</button></div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Fatto</button></div>
  `);
  m.el.querySelectorAll("[data-menu]").forEach((cb) => cb.addEventListener("change", () => store.toggleRecipeInMenu(cb.dataset.menu, r.id)));
  const add = async () => {
    const name = m.el.querySelector("#newColl").value.trim();
    if (!name) return;
    const id = await store.addMenu(name);
    if (id) await store.toggleRecipeInMenu(id, r.id);
    m.close(); openCollections(r);
  };
  m.el.querySelector("#addColl").addEventListener("click", add);
  m.el.querySelector("#newColl").addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
  m.el.querySelector('[data-act="ok"]').addEventListener("click", m.close);
}

// Promemoria di preparazione anticipata (ammollo, lievitazione…), salvato in locale
// e mostrato quando scade (se l'app è aperta o in notifica, se permessa).
const PREP_REM_KEY = "ricettario.prepReminders";
function getPrepReminders() { try { return JSON.parse(localStorage.getItem(PREP_REM_KEY) || "[]"); } catch (e) { return []; } }
function setPrepReminders(l) { try { localStorage.setItem(PREP_REM_KEY, JSON.stringify(l)); } catch (e) {} }
function openPrepReminder(r) {
  const now = new Date();
  const at = (h, plusDay) => { const d = new Date(); if (plusDay) d.setDate(d.getDate() + 1); d.setHours(h, 0, 0, 0); return d.getTime(); };
  const opts = [
    { label: "Tra 1 ora", due: Date.now() + 3600000 },
    { label: "Tra 3 ore", due: Date.now() + 3 * 3600000 },
    { label: "Stasera 20:00", due: at(20, now.getHours() >= 20) },
    { label: "Domani 8:00", due: at(8, true) }
  ];
  const m = openModal(`
    <h3 class="modal__title">⏰ Ricordamelo</h3>
    <p class="hint" style="margin-top:-8px;margin-bottom:12px">Ti avviso di iniziare la preparazione di "${escapeHtml(r.title)}".</p>
    <div style="display:flex;flex-direction:column;gap:8px">${opts.map((o, i) => `<button class="btn btn--block" data-i="${i}">${o.label}</button>`).join("")}</div>
    <div class="modal__actions"><button class="btn" data-act="cancel">Annulla</button></div>
  `);
  m.el.querySelector('[data-act="cancel"]').addEventListener("click", m.close);
  m.el.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => {
    const o = opts[parseInt(b.dataset.i, 10)];
    const list = getPrepReminders().filter((x) => x.recipeId !== r.id);
    list.push({ recipeId: r.id, title: r.title, due: o.due });
    setPrepReminders(list);
    try { if (window.Notification && Notification.permission === "default") Notification.requestPermission(); } catch (e) {}
    m.close();
    toast(`Promemoria impostato: ${o.label.toLowerCase()}`, "success");
  }));
}
function checkPrepReminders() {
  const list = getPrepReminders();
  if (!list.length) return;
  const now = Date.now();
  const due = list.filter((x) => x.due <= now);
  if (!due.length) return;
  setPrepReminders(list.filter((x) => x.due > now));
  for (const x of due) {
    const msg = `Inizia la preparazione: ${x.title}`;
    let shown = false;
    try { if (window.Notification && Notification.permission === "granted") { new Notification("Fornelli — promemoria", { body: msg, icon: "icons/icon-192.png" }); shown = true; } } catch (e) {}
    if (!shown) toast("⏰ " + msg, "success");
  }
}

// Scala le dosi su una quantità reale di un ingrediente ("ho 600 g di pollo").
function openScaleByWeight(r, base, ingredients) {
  if (!base) return;
  const scalable = ingredients.filter((it) => it.qty != null && it.unit && it.unit !== "q.b.");
  if (!scalable.length) return;
  const opts = scalable.map((it) => `<option value="${ingredients.indexOf(it)}">${escapeHtml(it.name)} (${formatQty(it.qty)} ${escapeHtml(it.unit)})</option>`).join("");
  const m = openModal(`
    <h3 class="modal__title">⚖️ Scala su una quantità</h3>
    <p class="hint" style="margin-top:-8px;margin-bottom:12px">Hai una quantità precisa di un ingrediente? Ricalcolo tutte le dosi su quella.</p>
    <div class="field"><label>Ingrediente</label><select id="swIng">${opts}</select></div>
    <div class="field"><label>Quanto ne hai</label><input type="text" id="swQty" inputmode="decimal" placeholder="es. 600" /></div>
    <div class="hint" id="swInfo" style="min-height:1.2em"></div>
    <div class="modal__actions"><button class="btn" data-act="cancel">Annulla</button><button class="btn btn--primary" data-act="ok">Ricalcola</button></div>
  `);
  const sel = m.el.querySelector("#swIng"), qtyIn = m.el.querySelector("#swQty"), info = m.el.querySelector("#swInfo");
  const calc = () => {
    const it = ingredients[parseInt(sel.value, 10)];
    const have = parseFloat((qtyIn.value || "").replace(",", "."));
    if (!it || !it.qty || !isFinite(have) || have <= 0) { info.textContent = ""; return null; }
    const serv = Math.max(1, Math.round(base * (have / it.qty)));
    info.innerHTML = `Diventano <b>${serv}</b> ${serv === 1 ? "porzione" : "porzioni"} circa.`;
    return serv;
  };
  sel.addEventListener("change", calc);
  qtyIn.addEventListener("input", calc);
  qtyIn.focus();
  m.el.querySelector('[data-act="cancel"]').addEventListener("click", m.close);
  m.el.querySelector('[data-act="ok"]').addEventListener("click", () => {
    const serv = calc();
    if (serv == null) { toast("Inserisci una quantità valida", "error"); return; }
    detailServings = serv; m.close(); render();
  });
}

// Adatta alla teglia/stampo: ricalcola le dosi in base alla superficie della
// teglia (rotonda Ø, oppure rettangolare/quadrata A×B). Imposta le porzioni così
// che le quantità si scalino del fattore area-target / area-ricetta.
function openPanScaler(r, base) {
  const st = { from: { shape: "round" }, to: { shape: "round" } };
  const area = (s) => {
    const a = parseFloat(String(s.a || "").replace(",", "."));
    if (s.shape === "round") return a > 0 ? Math.PI * a * a / 4 : 0;
    const b = parseFloat(String(s.b || "").replace(",", "."));
    return a > 0 && b > 0 ? a * b : 0;
  };
  const dimsHtml = (side) => st[side].shape === "round"
    ? `<input class="pan-in" type="number" inputmode="decimal" data-side="${side}" data-dim="a" placeholder="diametro cm" />`
    : `<div style="display:flex;gap:8px;align-items:center"><input class="pan-in" type="number" inputmode="decimal" data-side="${side}" data-dim="a" placeholder="lato A cm" style="flex:1;min-width:0" /><span>×</span><input class="pan-in" type="number" inputmode="decimal" data-side="${side}" data-dim="b" placeholder="lato B cm" style="flex:1;min-width:0" /></div>`;
  const m = openModal(`
    <h3 class="modal__title">🍰 Adatta alla teglia</h3>
    <p class="hint" style="margin-top:-8px;margin-bottom:12px">Inserisci la teglia della ricetta e la tua: ricalcolo le dosi in base alla superficie.</p>
    <div class="field"><label>Teglia della ricetta</label><select id="panFromShape" class="mini-select" style="width:100%"><option value="round">Rotonda (Ø)</option><option value="rect">Rettangolare / quadrata</option></select><div id="panFromDims" style="margin-top:6px"></div></div>
    <div class="field"><label>La tua teglia</label><select id="panToShape" class="mini-select" style="width:100%"><option value="round">Rotonda (Ø)</option><option value="rect">Rettangolare / quadrata</option></select><div id="panToDims" style="margin-top:6px"></div></div>
    <div id="panResult"></div>
    <div class="modal__actions"><button class="btn" data-act="cancel">Annulla</button><button class="btn btn--primary" data-act="ok" disabled>Adatta le dosi</button></div>
  `);
  const okBtn = m.el.querySelector('[data-act="ok"]');
  let ratio = 0, newServ = 0;
  const recalc = () => {
    const af = area(st.from), at = area(st.to);
    ratio = af > 0 && at > 0 ? at / af : 0;
    newServ = ratio ? Math.max(1, Math.round(base * ratio)) : 0;
    m.el.querySelector("#panResult").innerHTML = ratio
      ? `<div class="nutri-box"><div class="nutri-row"><span class="nutri-lbl">Fattore dosi</span><span class="nutri-val"><b>×${ratio.toFixed(2)}</b></span></div><div class="nutri-row"><span class="nutri-lbl">Equivale a</span><span class="nutri-val"><b>${newServ}</b> ${newServ === 1 ? "porzione" : "porzioni"} (da ${base})</span></div></div>`
      : `<div class="hint">Inserisci le misure per vedere il calcolo.</div>`;
    okBtn.disabled = !ratio;
  };
  const bindDims = (side, containerId) => {
    const c = m.el.querySelector(containerId);
    c.innerHTML = dimsHtml(side);
    c.querySelectorAll(".pan-in").forEach((i) => i.oninput = () => { st[side][i.dataset.dim] = i.value; recalc(); });
  };
  bindDims("from", "#panFromDims"); bindDims("to", "#panToDims");
  m.el.querySelector("#panFromShape").onchange = (e) => { st.from = { shape: e.target.value }; bindDims("from", "#panFromDims"); recalc(); };
  m.el.querySelector("#panToShape").onchange = (e) => { st.to = { shape: e.target.value }; bindDims("to", "#panToDims"); recalc(); };
  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  okBtn.onclick = () => { if (!ratio) return; detailServings = newServ; m.close(); render(); toast(`Dosi adattate alla teglia (×${ratio.toFixed(2)})`, "success"); };
  recalc();
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
    const items = ingredients.map((it) => ({ name: it.name, unit: it.unit || "", qty: it.qty != null ? it.qty * factor : null, category: categorize(it.name), from: r.title }));
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
    <p class="hint" style="margin-top:-8px;margin-bottom:10px">Controlla il testo e scegli cosa farne.</p>
    <div class="field"><textarea id="ocrText" rows="9">${escapeHtml(text)}</textarea></div>
    ${isImportConfigured() ? `<button class="btn btn--primary btn--block" data-act="full" style="margin-bottom:10px">📖 È una ricetta intera: compilala con l'AI</button>` : ""}
    <div class="modal__actions">
      <button class="btn" data-act="ing">Negli ingredienti</button>
      <button class="btn" data-act="steps">Nella preparazione</button>
    </div>
  `);
  const getText = () => om.el.querySelector("#ocrText").value;
  om.el.querySelector('[data-act="ing"]').onclick = () => { appendToField(form, "#rIngredients", getText()); om.close(); toast("Aggiunto agli ingredienti", "success"); };
  om.el.querySelector('[data-act="steps"]').onclick = () => { appendToField(form, "#rSteps", getText()); om.close(); toast("Aggiunto alla preparazione", "success"); };
  const fullBtn = om.el.querySelector('[data-act="full"]');
  if (fullBtn) fullBtn.onclick = async () => {
    const old = fullBtn.innerHTML;
    fullBtn.disabled = true; fullBtn.textContent = "Leggo la ricetta…";
    try {
      const data = await structureRecipeText(getText());
      const tEl = form.el.querySelector("#rTitle"); if (tEl && !tEl.value.trim() && data.title) tEl.value = data.title;
      const sEl = form.el.querySelector("#rServings"); if (sEl && !sEl.value.trim() && data.servings) sEl.value = data.servings;
      if (data.ingredients && data.ingredients.length) appendToField(form, "#rIngredients", data.ingredients.join("\n"));
      if (data.steps && data.steps.length) appendToField(form, "#rSteps", data.steps.join("\n"));
      om.close();
      toast("Ricetta letta dalla foto! Controllala e salva.", "success");
    } catch (e) { fullBtn.disabled = false; fullBtn.innerHTML = old; toast(e.message || "Non riuscito", "error"); }
  };
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
// Dà un nome al timer in base all'azione vicina alla durata nel passo
// (es. "cuoci 10 min" -> "Cottura", "lascia riposare 5 min" -> "Riposo").
const TIMER_VERBS = [
  [/inforn|in forno/, "Forno"],
  [/frigg|frittura/, "Frittura"],
  [/bolli|bollore|lessa|sbollent/, "Bollitura"],
  [/rosol|soffrigg|soffri/, "Rosolatura"],
  [/lievit/, "Lievitazione"],
  [/marin/, "Marinatura"],
  [/ammoll|in acqua|a bagno/, "Ammollo"],
  [/raffredd|in frigo|frigorifero|riposa in frigo/, "In frigo"],
  [/ripos|lascia\s+riposare|far\s+riposare/, "Riposo"],
  [/tosta/, "Tostatura"],
  [/gratin/, "Gratinatura"],
  [/scongel/, "Scongelamento"],
  [/manteca|mescol|gira/, "Mescola"],
  [/cuoc|cuoci|cottura|cuocere|cuocete/, "Cottura"]
];
function timerLabelFor(text, min) {
  const low = String(text || "").toLowerCase();
  const patts = [new RegExp("\\b" + min + "\\s*minut"), new RegExp("\\b" + min + "\\s*min\\b")];
  if (min % 60 === 0) patts.push(new RegExp("\\b" + (min / 60) + "\\s*or[ae]"));
  if (min === 30) patts.push(/mezz['\s]?or/);
  if (min === 60) patts.push(/un['\s]?or/);
  let idx = -1;
  for (const p of patts) { const m = low.match(p); if (m) { idx = m.index; break; } }
  if (idx < 0) return null;
  const before = low.slice(Math.max(0, idx - 42), idx);
  // Sceglie il verbo più VICINO alla durata (posizione più avanzata nel testo).
  let best = null, bestPos = -1;
  for (const [rx, lab] of TIMER_VERBS) { const mm = before.match(rx); if (mm && mm.index > bestPos) { bestPos = mm.index; best = lab; } }
  return best;
}
// Pulisce il nome di un ingrediente da numeri e unità (alcune fonti scrivono
// "Merluzzo 500 g", quindi il nome grezzo contiene la quantità).
const ING_STOP = new Set(["di", "da", "in", "il", "la", "lo", "le", "gli", "un", "una", "uno", "con", "per", "del", "della", "dello", "delle", "degli", "dei", "al", "allo", "alla", "alle", "sul", "sulla", "fresco", "fresca", "fresche", "freschi", "medie", "medio", "media", "medi", "grande", "grandi", "piccolo", "piccola", "tipo", "circa", "fino", "fine", "extra", "vergine", "qb", "quanto", "basta"]);
const ING_UNITS = /\b(g|gr|kg|ml|l|cl|dl|q\.?\s?b\.?|cucchiai|cucchiaio|cucchiaini|cucchiaino|tazze|tazza|bustine|bustina|spicchi|spicchio|fette|fetta|ciuffo|ciuffi|pizzico|pizzichi|confezioni|confezione|barattoli|barattolo|lattine|lattina|foglie|foglia|rametti|rametto|mazzetti|mazzetto|pezzi|pezzo|noci|noce|gocce|goccia|litri|litro)\b/gi;
function cleanIngName(name) {
  return String(name || "").toLowerCase()
    .replace(/\d+([.,]\d+)?/g, " ")
    .replace(ING_UNITS, " ")
    .replace(/[^a-zà-ù\s]/gi, " ")
    .replace(/\s+/g, " ").trim();
}
// Evidenzia nel testo del passo gli ingredienti della ricetta, rendendoli
// toccabili per vedere la quantità senza tornare alla lista (stile Crouton/Mela).
function buildStepHtml(text, ingredients) {
  text = String(text || "");
  // Per ogni ingrediente, prepara i termini di ricerca (frase pulita + parole chiave).
  const pairs = []; // { term, label }
  (ingredients || []).forEach((it) => {
    if (!it || !it.name) return;
    const label = ingredientText(it);
    const clean = cleanIngName(it.name);
    const words = clean.split(" ").filter((w) => w.length >= 3 && !ING_STOP.has(w));
    const terms = [];
    if (clean.includes(" ") && clean.length >= 5) terms.push(clean);
    words.sort((a, b) => b.length - a.length).forEach((w) => terms.push(w));
    [...new Set(terms)].forEach((term) => pairs.push({ term, label }));
  });
  if (!pairs.length) return escapeHtml(text);
  pairs.sort((a, b) => b.term.length - a.term.length); // i termini più specifici prima
  const lower = text.toLowerCase();
  const isSep = (ch) => ch === undefined || /[^a-zà-ù0-9]/i.test(ch);
  const marks = [];
  const usedLabels = new Set();
  for (const p of pairs) {
    if (usedLabels.has(p.label)) continue; // un solo segno per ingrediente
    let from = 0, i;
    while ((i = lower.indexOf(p.term, from)) !== -1) {
      const end = i + p.term.length;
      if (isSep(lower[i - 1]) && isSep(lower[end]) && !marks.some((mk) => i < mk.end && end > mk.start)) {
        marks.push({ start: i, end, label: p.label });
        usedLabels.add(p.label);
        break;
      }
      from = end;
    }
  }
  if (!marks.length) return escapeHtml(text);
  marks.sort((a, b) => a.start - b.start);
  let html = "", pos = 0;
  for (const mk of marks) {
    if (mk.start < pos) continue;
    html += escapeHtml(text.slice(pos, mk.start));
    html += `<span class="cook-ing" data-q="${escapeHtml(mk.label)}">${escapeHtml(text.slice(mk.start, mk.end))}</span>`;
    pos = mk.end;
  }
  html += escapeHtml(text.slice(pos));
  return html;
}
// Nome "intelligente" per un timer dedotto dal contenuto del passo.
function stepTimerLabel(text, n) {
  const t = (text || "").toLowerCase();
  if (/forn|inforn|gratin/.test(t)) return "Forno";
  if (/lievit/.test(t)) return "Lievitazione";
  if (/marin/.test(t)) return "Marinatura";
  if (/ripos|raffredd|in frigo|frigorifer/.test(t)) return "Riposo";
  if (/frigg|frittur/.test(t)) return "Frittura";
  if (/boll|less|scott|sbollent/.test(t)) return "Cottura";
  if (/soffrigg|rosol|cuoci|cottura|cuocere|stufa/.test(t)) return "Cottura";
  return "Passo " + n;
}

// Riconosce il metodo di cottura dal testo (per la "Cucina viva"). L'ordine conta:
// "olio bollente" è frittura, non bollito.
function detectCookMethod(text) {
  const t = (text || "").toLowerCase();
  if (/frigg|frittur|olio bollente|olio caldo|abbondante olio|dorare in olio|immerg/.test(t)) return "frittura";
  if (/forn|inforn|gratin|180°|190°|200°|220°|grigli|cartoccio/.test(t)) return "forno";
  if (/bolli|lessa|sbollent|acqua bollente|cuoci la pasta|scola|in pentola|bagnomaria|vapore|brodo/.test(t)) return "bollito";
  if (/padella|rosola|soffri|saltar|mantec|tegame|sciogliere il burro|filo d'olio/.test(t)) return "padella";
  return "";
}
// Genera le particelle animate dello sfondo "vivo" in base al metodo.
function buildAmbientBits(method) {
  const rnd = (a, b) => a + Math.random() * (b - a);
  let html = "";
  if (method === "bollito") {
    for (let i = 0; i < 18; i++) { const s = Math.round(rnd(6, 18)); html += `<span class="cka cka--bubble" style="left:${rnd(4, 94).toFixed(1)}%;width:${s}px;height:${s}px;animation-duration:${rnd(2.8, 6).toFixed(1)}s;animation-delay:${(-rnd(0, 5)).toFixed(1)}s"></span>`; }
    for (let i = 0; i < 4; i++) html += `<span class="cka cka--steam" style="left:${rnd(20, 80).toFixed(0)}%;animation-duration:${rnd(6, 9).toFixed(1)}s;animation-delay:${(-rnd(0, 6)).toFixed(1)}s"></span>`;
  } else if (method === "frittura") {
    for (let i = 0; i < 22; i++) { const s = Math.round(rnd(3, 7)); html += `<span class="cka cka--spark" style="left:${rnd(8, 92).toFixed(1)}%;width:${s}px;height:${s}px;animation-duration:${rnd(0.7, 1.8).toFixed(2)}s;animation-delay:${(-rnd(0, 2)).toFixed(2)}s"></span>`; }
  } else if (method === "forno") {
    for (let i = 0; i < 12; i++) html += `<span class="cka cka--ember" style="left:${rnd(10, 90).toFixed(1)}%;animation-duration:${rnd(4, 8).toFixed(1)}s;animation-delay:${(-rnd(0, 6)).toFixed(1)}s"></span>`;
  } else if (method === "padella") {
    for (let i = 0; i < 8; i++) html += `<span class="cka cka--ember" style="left:${rnd(20, 80).toFixed(1)}%;animation-duration:${rnd(3, 6).toFixed(1)}s;animation-delay:${(-rnd(0, 5)).toFixed(1)}s"></span>`;
    for (let i = 0; i < 3; i++) html += `<span class="cka cka--steam" style="left:${rnd(30, 70).toFixed(0)}%;animation-duration:${rnd(6, 9).toFixed(1)}s;animation-delay:${(-rnd(0, 6)).toFixed(1)}s"></span>`;
  }
  return html;
}

function openCookingMode(recipe) {
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  if (!steps.length) return;
  let idx = 0;
  let wakeLock = null;
  let timers = []; // { id, label, remaining, running, alarming }
  let ticker = null;
  let alarmTicker = null;
  let tseq = 0;
  let speak = false; // lettura vocale
  let xl = localStorage.getItem("ricettario.cookXL") === "1"; // testo grande
  let voiceOn = false; // comandi vocali a mani libere
  let vrec = null;
  let speaking = false; // sta parlando l'assistente (ascolto in pausa)
  let asking = false;   // domanda all'AI in corso
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  const host = document.getElementById("modalRoot");
  const el = document.createElement("div");
  el.className = "cook";
  host.appendChild(el);

  // "Cucina viva": sfondo ambientale legato al metodo di cottura del passo
  // corrente (bagliore del forno, bollicine, scintille della frittura, fiamma
  // della padella). Vive sotto la UI, che viene ridisegnata a ogni passo.
  const ambient = document.createElement("div");
  ambient.className = "cook__ambient";
  ambient.setAttribute("aria-hidden", "true");
  el.appendChild(ambient);
  const ui = document.createElement("div");
  ui.className = "cook__ui";
  el.appendChild(ui);
  // Metodo "di base" dall'intera ricetta (usato se un passo non è esplicito).
  const recipeMethod = detectCookMethod([recipe.title, (steps || []).join(" "), (recipe.ingredients || []).map((it) => ingredientText(it)).join(" ")].join(" "));
  function setAmbient(method) {
    const m = method || "neutro";
    if (ambient.dataset.method === m) return;
    ambient.dataset.method = m;
    if (reduceMotion || powerSaveActive()) { ambient.innerHTML = ""; return; }
    ambient.innerHTML = buildAmbientBits(m);
  }

  function goNext() {
    if (idx < steps.length - 1) { idx++; haptic(6); playFlip(); draw(); speakStep(); }
    else finishCooking();
  }
  function goPrev() { if (idx > 0) { idx--; haptic(6); playFlip(); draw(); speakStep(); } }

  // Schermata celebrativa di fine ricetta: coriandoli + scorciatoia al voto/foto.
  function finishCooking() {
    store.markCooked(recipe.id);
    if (ticker) { clearInterval(ticker); ticker = null; }
    if (alarmTicker) { clearInterval(alarmTicker); alarmTicker = null; }
    stopSpeak(); stopVoice();
    haptic(30); playPling();
    el.classList.add("cook--done");
    el.innerHTML = `
      <div class="cook__done">
        <div class="cook__done-emoji">🎉</div>
        <h2 class="cook__done-title">Piatto pronto!</h2>
        <p class="cook__done-text">Hai completato <b>${escapeHtml(recipe.title)}</b>.</p>
        <p class="cook__done-sub">L'abbiamo segnata nel tuo diario di cucina.</p>
        <div class="cook__done-btns">
          <button class="btn btn--primary btn--block" id="ckRate">${iconHtml("star")} Com'è venuta?</button>
          <button class="btn btn--block" id="ckDone">Chiudi</button>
        </div>
      </div>`;
    try { fxBurst(window.innerWidth / 2, window.innerHeight / 3, { count: 46 }); } catch (e) {}
    try { navigator.vibrate && navigator.vibrate([40, 60, 40]); } catch (e) {}
    el.querySelector("#ckRate").onclick = () => { close(); openCookReview(recipe); };
    el.querySelector("#ckDone").onclick = close;
  }

  // Comandi vocali: avanti / indietro / timer N minuti / leggi.
  const NUMWORDS = { uno: 1, una: 1, un: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10, undici: 11, dodici: 12, quindici: 15, venti: 20, venticinque: 25, trenta: 30, quaranta: 40, quarantacinque: 45, sessanta: 60 };
  function handleVoiceCommand(text) {
    const t = (text || "").toLowerCase();
    if (/ingredient/.test(t)) {
      const lines = (recipe.ingredients || []).map((it) => ingredientText(it)).filter(Boolean);
      speakText(lines.length ? "Ingredienti. " + lines.join(", ") : "Nessun ingrediente nella ricetta");
      return;
    }
    if (/quanto manca|quanto tempo|tempo rimast/.test(t)) {
      const running = timers.filter((x) => x.running && x.remaining > 0);
      speakText(running.length ? running.map((x) => `${x.label}: ${Math.ceil(x.remaining / 60)} ${Math.ceil(x.remaining / 60) === 1 ? "minuto" : "minuti"}`).join(". ") : "Nessun timer attivo");
      return;
    }
    if (/\b(avanti|prossim|continua|vai)\b/.test(t)) { goNext(); return; }
    if (/\b(indietro|precedent|torna)\b/.test(t)) { goPrev(); return; }
    if (/\b(leggi|ripeti)\b/.test(t)) { speak = true; speakStep(); return; }
    if (/\b(ferma|stop|basta|zitt)\b/.test(t)) { stopSpeak(); return; }
    const mt = t.match(/timer\D*(\d+)/) || t.match(/(\d+)\s*minut/);
    if (mt) { addTimer(parseInt(mt[1], 10), "Voce"); return; }
    const wm = t.match(/timer\s+([a-zà]+)/);
    if (wm && NUMWORDS[wm[1]]) { addTimer(NUMWORDS[wm[1]], "Voce"); return; }
    // Domanda libera allo chef AI: solo se suona come una domanda di cucina.
    if (isImportConfigured() && t.trim().split(/\s+/).length >= 2 &&
        /\b(come|quant|perch|posso|possi|devo|dobbiamo|qual|cosa|che cosa|quando|si pu|va bene|sostitu|invece di|al posto|meglio|serve|bisogna)\b/.test(t)) {
      answerQuestion(text); return;
    }
  }
  // Risponde a voce a una domanda libera, mettendo in pausa l'ascolto mentre
  // parla (così il microfono non capta la voce dell'assistente).
  function speakAndWait(txt) {
    return new Promise((res) => {
      if (!window.speechSynthesis || !txt) { res(); return; }
      try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); u.lang = "it-IT"; u.onend = res; u.onerror = res; window.speechSynthesis.speak(u); }
      catch (e) { res(); }
    });
  }
  async function answerQuestion(text) {
    if (asking) return;
    asking = true; speaking = true;
    try { if (vrec) vrec.stop(); } catch (e) {}
    try {
      const ctx = { title: recipe.title, ingredients: (recipe.ingredients || []).map((i) => ingredientText(i)).filter(Boolean) };
      const q = `${text} (Sto cucinando "${recipe.title}", passo ${idx + 1} di ${steps.length}: "${steps[idx]}".)`;
      const ans = await askChef(q, ctx);
      toast("💬 " + ans.slice(0, 90), "success");
      await speakAndWait(ans);
    } catch (e) { await speakAndWait("Scusa, non riesco a rispondere ora."); }
    asking = false; speaking = false;
    if (voiceOn) { try { startVoice(); } catch (e) {} } // riprende l'ascolto
  }
  function startVoice() {
    if (!SR) return;
    try {
      vrec = new SR();
      vrec.lang = "it-IT";
      vrec.continuous = true;
      vrec.interimResults = false;
      vrec.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) handleVoiceCommand(e.results[i][0].transcript); };
      vrec.onend = () => { if (voiceOn && !speaking) { try { vrec.start(); } catch (e) {} } };
      vrec.onerror = (e) => { if (e && e.error === "not-allowed") { voiceOn = false; toast("Permesso microfono negato", "error"); draw(); } };
      vrec.start();
    } catch (e) { voiceOn = false; }
  }
  function stopVoice() { voiceOn = false; if (vrec) { try { vrec.stop(); } catch (e) {} vrec = null; } }
  function toggleVoice() {
    voiceOn = !voiceOn;
    if (voiceOn) { startVoice(); toast("A voce: \"avanti\", \"indietro\", \"timer 10 minuti\", o fai una domanda (\"posso sostituire il burro?\")", "success"); }
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
  function speakText(txt) { if (!window.speechSynthesis || !txt) return; try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); u.lang = "it-IT"; window.speechSynthesis.speak(u); } catch {} }

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
      if (t.remaining <= 0) { t.remaining = 0; t.running = false; t.alarming = true; if (getSoundOn()) playChime(); else beep(); try { navigator.vibrate && navigator.vibrate([300, 120, 300]); } catch (e) {} toast(`⏰ ${t.label} finito!`, "success"); }
    }
    ensureTicker();
    ensureAlarm();
    tickPaint();
  }
  // Aggiorna SOLO testo e anello dei timer esistenti (così l'anello si anima in
  // modo fluido grazie alla transizione CSS, senza ridisegnare tutto).
  function tickPaint() {
    const box = el.querySelector("#ckTimers"); if (!box) return;
    for (const t of timers) {
      const row = box.querySelector(`.ctimer[data-id="${t.id}"]`);
      if (!row) { paintTimers(); return; }
      row.classList.toggle("is-done", t.remaining <= 0);
      row.classList.toggle("is-alarm", !!t.alarming);
      const tEl = row.querySelector(".ctimer__time"); if (tEl) tEl.textContent = t.alarming ? "Finito!" : fmt(t.remaining);
      const fg = row.querySelector(".ctimer__ring-fg");
      if (fg && t.total) {
        const C = parseFloat(fg.dataset.c) || 94.2;
        const frac = Math.max(0, Math.min(1, t.remaining / t.total));
        fg.style.strokeDashoffset = (C * (1 - frac)).toFixed(1);
        fg.style.stroke = t.alarming || t.remaining <= 0 ? "var(--danger)" : (frac <= 0.2 ? "#ff9f43" : "var(--primary)");
      }
      const tog = row.querySelector('[data-act="toggle"]'); if (tog) tog.textContent = t.alarming ? "🔕 OK" : (t.running ? "⏸" : "▶");
    }
  }
  // Allarme ripetuto (suono + vibrazione) finché non lo si ferma toccando il timer.
  function ensureAlarm() {
    const any = timers.some((t) => t.alarming);
    if (any && !alarmTicker) alarmTicker = setInterval(() => { if (getSoundOn()) playChime(); else beep(); try { navigator.vibrate && navigator.vibrate([300, 120, 300]); } catch (e) {} }, 1700);
    else if (!any && alarmTicker) { clearInterval(alarmTicker); alarmTicker = null; }
  }
  function addTimer(mins, label) {
    const m = Math.max(1, parseInt(mins, 10) || 0);
    timers.push({ id: ++tseq, label: (label || "").trim() || `Timer ${timers.length + 1}`, remaining: m * 60, total: m * 60, running: true });
    ensureTicker();
    paintTimers();
  }
  function paintTimers() {
    const box = el.querySelector("#ckTimers");
    if (!box) return;
    if (!timers.length) { box.innerHTML = `<div class="cook__notim">Nessun timer attivo</div>`; return; }
    const C = 94.2; // circonferenza dell'anello (r=15)
    box.innerHTML = timers.map((t) => {
      const frac = t.total ? Math.max(0, Math.min(1, t.remaining / t.total)) : 0;
      const off = (C * (1 - frac)).toFixed(1);
      const col = t.alarming || t.remaining <= 0 ? "var(--danger)" : (frac <= 0.2 ? "#ff9f43" : "var(--primary)");
      return `<div class="ctimer ${t.remaining <= 0 ? "is-done" : ""}${t.alarming ? " is-alarm" : ""}" data-id="${t.id}">
      <span class="ctimer__ringwrap"><svg class="ctimer__ring" viewBox="0 0 38 38">
        <circle class="ctimer__ring-bg" cx="19" cy="19" r="15"></circle>
        <circle class="ctimer__ring-fg" cx="19" cy="19" r="15" data-c="${C}" stroke-dasharray="${C}" stroke-dashoffset="${off}" style="stroke:${col}" transform="rotate(-90 19 19)"></circle>
      </svg></span>
      <span class="ctimer__lbl">${escapeHtml(t.label)}</span>
      <span class="ctimer__time">${t.alarming ? "Finito!" : fmt(t.remaining)}</span>
      <button class="ctimer__btn" data-act="toggle">${t.alarming ? "🔕 OK" : (t.running ? "⏸" : "▶")}</button>
      <button class="ctimer__btn" data-act="del">✕</button>
    </div>`; }).join("");
    box.querySelectorAll(".ctimer").forEach((row) => {
      const id = parseInt(row.dataset.id, 10);
      const t = timers.find((x) => x.id === id);
      row.querySelector('[data-act="toggle"]').onclick = () => { if (t.alarming) { t.alarming = false; ensureAlarm(); paintTimers(); return; } if (t.remaining <= 0) return; t.running = !t.running; ensureTicker(); paintTimers(); };
      row.querySelector('[data-act="del"]').onclick = () => { timers = timers.filter((x) => x.id !== id); ensureTicker(); ensureAlarm(); paintTimers(); };
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
    setAmbient(detectCookMethod(steps[idx]) || recipeMethod);
    ui.innerHTML = `
      <div class="cook__bar">
        <button class="cook__close" id="ckClose">${iconHtml("x")}</button>
        <div class="cook__progress">Passo ${idx + 1} di ${steps.length}</div>
        <button class="cook__close ${xl ? "is-on" : ""}" id="ckXL" title="Testo grande">Aa</button>
        ${SR ? `<button class="cook__close ${voiceOn ? "is-on" : ""}" id="ckVoice" title="Comandi vocali">🎤</button>` : ""}
        <button class="cook__close ${speak ? "is-on" : ""}" id="ckSpeak" title="Leggi ad alta voce">🔊</button>
      </div>
      <div class="cook__track"><div class="cook__fill" style="width:${((idx + 1) / steps.length) * 100}%"></div></div>
      <div class="cook__body"><div class="cook__step">${buildStepHtml(steps[idx], recipe.ingredients)}</div></div>
      <div class="cook__timers" id="ckTimers"></div>
      ${(() => { const ds = parseDurations(steps[idx]); return ds.length ? `<div class="cook__quick">${ds.map((d) => { const lab = timerLabelFor(steps[idx], d); return `<button class="chip" data-qmin="${d}" data-tlabel="${lab ? escapeHtml(lab) : ""}">${iconHtml("timer")} ${lab ? escapeHtml(lab) + " · " : ""}${fmtDur(d)}</button>`; }).join("")}</div>` : ""; })()}
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
    el.querySelectorAll("[data-qmin]").forEach((b) => b.onclick = () => addTimer(parseInt(b.dataset.qmin, 10), b.dataset.tlabel || stepTimerLabel(steps[idx], idx + 1)));
    // Tocca un ingrediente nel testo del passo → mostra la quantità in un fumetto.
    el.querySelectorAll(".cook-ing").forEach((s) => s.addEventListener("click", () => {
      document.querySelectorAll(".cook-ing-pop").forEach((p) => p.remove());
      const pop = document.createElement("div");
      pop.className = "cook-ing-pop";
      pop.textContent = s.dataset.q || s.textContent;
      document.body.appendChild(pop);
      const r = s.getBoundingClientRect();
      pop.style.left = Math.max(8, Math.min(window.innerWidth - 8 - pop.offsetWidth, r.left + r.width / 2 - pop.offsetWidth / 2)) + "px";
      pop.style.top = Math.max(8, r.top - pop.offsetHeight - 8) + "px";
      haptic(8);
      setTimeout(() => pop.remove(), 2600);
    }));
    paintTimers();
  }

  function close() {
    if (ticker) clearInterval(ticker);
    if (alarmTicker) clearInterval(alarmTicker);
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
  // Mantieni il valore salvato (icona disegnata o emoji) per evidenziare la scelta.
  let selected = editing ? (resolveIcon(tool.icon) || tool.icon) : "cooking-pot";
  const iconBtns = ICON_PICKER.map(
    (name) => `<button type="button" data-icon="${name}" class="${name === selected ? "is-selected" : ""}">${iconHtml(name)}</button>`
  ).join("");
  const emojiBtns = EMOJI_PICKER.map(
    (e) => `<button type="button" data-icon="${e}" class="icon-emoji ${e === selected ? "is-selected" : ""}">${e}</button>`
  ).join("");

  const m = openModal(`
    <h3 class="modal__title">${editing ? "Modifica strumento" : "Nuovo strumento"}</h3>
    <div class="field">
      <label>Nome</label>
      <input type="text" id="toolName" placeholder="Es. Friggitrice ad aria" value="${escapeHtml(tool ? tool.name : "")}" />
    </div>
    <div class="field">
      <label>Icona</label>
      <div class="icon-picker" id="iconPicker">${iconBtns}${emojiBtns}</div>
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
  // Se arrivi dalla ricerca avviata da un video, aggancia quel video alla ricetta
  // importata (vale una sola volta).
  const carryVideo = (!recipe && !(prefill && prefill.video) && pendingVideoForImport && videoInfo(pendingVideoForImport)) ? pendingVideoForImport : "";
  pendingVideoForImport = "";
  const videoUrl = recipe ? (recipe.videoUrl || "") : (prefill && prefill.video ? prefill.video : carryVideo);
  const source = recipe ? (recipe.source || "") : (prefill && prefill.source ? prefill.source : "");
  const ingText = recipe
    ? (recipe.ingredients || []).map((i) => i.raw || ingredientText(i)).join("\n")
    : (prefill && prefill.ingredients ? prefill.ingredients.join("\n") : "");
  const stepsText = recipe
    ? (recipe.steps || []).join("\n")
    : (prefill && prefill.steps ? prefill.steps.join("\n") : "");
  let photo = recipe ? (recipe.photo || "") : (prefill && prefill.image ? prefill.image : "");
  let tags = recipe ? [...(recipe.tags || [])] : (prefill && Array.isArray(prefill.tags) ? [...prefill.tags] : []);
  // Categoria automatica all'import: aggiungi un tag (Primi/Secondi/Dolci…) dal titolo.
  if (!recipe && prefill && prefill.title) {
    const cat = guessCategory(prefill.title);
    if (cat && !tags.some((t) => (t || "").toLowerCase() === cat.toLowerCase())) tags.push(cat);
  }
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
      ${isImportConfigured() ? `<button type="button" class="btn btn--ghost" id="rImportVideo" style="margin-top:8px">📱 Importa da video social (TikTok/Instagram/YouTube)</button>` : ""}
    </div>
    <div class="field">
      <label>Link video (facoltativo)</label>
      <input type="url" id="rVideo" inputmode="url" placeholder="https://youtu.be/... (YouTube, TikTok, Vimeo)" value="${escapeHtml(videoUrl)}" />
      <div class="hint" style="margin-top:4px">Se la pagina della ricetta ha un video, lo trovo in automatico all'import; oppure incollalo qui.</div>
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
      <button type="button" class="btn btn--ghost" id="rOcr" style="margin-top:8px">${iconHtml("image")} Fotografa una ricetta (o ingredienti)</button>
      <input type="file" id="rOcrFile" accept="image/*" capture="environment" hidden />
      ${isImportConfigured() ? `<button type="button" class="btn btn--ghost" id="rGenerate" style="margin-top:8px">✨ Inventa una ricetta (AI)</button>` : ""}
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
      if (data.video && !m.el.querySelector("#rVideo").value.trim()) { m.el.querySelector("#rVideo").value = data.video; toast("Trovato anche un video 🎬", "success"); }
      toast("Ricetta importata", "success");
    } catch (e) {
      toast(e.message || "Import non riuscito", "error");
    }
    rImport.disabled = false; rImport.innerHTML = old;
  });

  // Riempie i campi del form da una ricetta strutturata (AI / video).
  const fillForm = (data, { replaceTitle = false } = {}) => {
    if (data.title && (replaceTitle || !titleInput.value.trim())) titleInput.value = data.title;
    if (data.servings) m.el.querySelector("#rServings").value = data.servings;
    if (data.time) m.el.querySelector("#rTime").value = data.time;
    if (data.ingredients && data.ingredients.length) {
      const cur = m.el.querySelector("#rIngredients").value.trim();
      m.el.querySelector("#rIngredients").value = (cur ? cur + "\n" : "") + data.ingredients.join("\n");
    }
    if (data.steps && data.steps.length) {
      const cur = m.el.querySelector("#rSteps").value.trim();
      m.el.querySelector("#rSteps").value = (cur ? cur + "\n" : "") + data.steps.join("\n");
    }
    if (data.image && !photo) { photo = data.image; renderPhoto(); }
    if (data.sourceUrl && !m.el.querySelector("#rUrl").value.trim()) m.el.querySelector("#rUrl").value = data.sourceUrl;
    // Se l'import arriva da un video social, salvo anche il link video.
    if (data.sourceUrl && videoInfo(data.sourceUrl) && !m.el.querySelector("#rVideo").value.trim()) m.el.querySelector("#rVideo").value = data.sourceUrl;
    if (data.tags && data.tags.length) data.tags.forEach((tg) => addTag(tg));
  };
  const rImportVideo = m.el.querySelector("#rImportVideo");
  if (rImportVideo) rImportVideo.addEventListener("click", () => openVideoImport(m.el.querySelector("#rUrl").value.trim(), (data) => fillForm(data, { replaceTitle: true })));
  const rGenerate = m.el.querySelector("#rGenerate");
  if (rGenerate) rGenerate.addEventListener("click", () => openGenerateRecipe(m.el.querySelector("#rIngredients").value.trim(), (data) => fillForm(data, { replaceTitle: true })));

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
      allergens: allergens,
      videoUrl: m.el.querySelector("#rVideo").value.trim(),
      source: source
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
      if (editing) toast("Ricetta aggiornata", "success");
      else celebrateSave(data.title);
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

const SOURCE_LABEL = { mealdb: "TheMealDB", gz: "GialloZafferano", blog: "Blog GialloZafferano", misya: "Misya", cookist: "Cookist", ricettenonna: "Ricette della Nonna", moulinex: "Moulinex Companion", bimby: "Bimby", spoon: "Spoonacular", edamam: "Edamam" };
// Riconosce la fonte di una ricetta dal dominio del link (per quelle importate).
const HOST_SOURCE = [
  [/blog\.giallozafferano\.it/i, "Blog GialloZafferano"], [/giallozafferano\.it/i, "GialloZafferano"], [/fattoincasadabenedetta\.it/i, "Fatto in casa da Benedetta"],
  [/misya\.info/i, "Misya"], [/cookist\.it/i, "Cookist"], [/ricettedellanonna\.net/i, "Ricette della Nonna"],
  [/cookaround\.com/i, "Cookaround"], [/buttalapasta\.it/i, "Buttalapasta"], [/lacucinaitaliana\.it/i, "La Cucina Italiana"],
  [/salepepe\.it/i, "Sale&Pepe"], [/cucchiaio\.it/i, "Cucchiaio d'Argento"], [/tavolartegusto\.it/i, "Tavolartegusto"],
  [/cookidoo|thermomix|vorwerk/i, "Bimby · Cookidoo"], [/moulinex|clubcompanion|cookeo/i, "Moulinex Companion"],
  [/themealdb\.com/i, "TheMealDB"], [/spoonacular\.com/i, "Spoonacular"], [/edamam\.com/i, "Edamam"],
  [/youtube\.com|youtu\.be/i, "YouTube"], [/tiktok\.com/i, "TikTok"], [/instagram\.com/i, "Instagram"]
];
// Etichetta della fonte: prima quella salvata (import online), poi dal link.
function recipeSourceLabel(recipe) {
  if (!recipe) return "";
  if (recipe.source) return SOURCE_LABEL[recipe.source] || recipe.source;
  const url = recipe.url || "";
  if (!url) return "";
  for (const [re, label] of HOST_SOURCE) if (re.test(url)) return label;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
}
function onlineSources() {
  const list = [
    { k: "all", label: "Tutte le fonti" },
    { k: "gz", label: "GialloZafferano (IT)" },
    { k: "blog", label: "Blog GialloZafferano (IT)" },
    { k: "misya", label: "Misya (IT)" },
    { k: "cookist", label: "Cookist (IT)" },
    { k: "ricettenonna", label: "Ricette della Nonna (IT)" },
    { k: "moulinex", label: "Moulinex (4800+ ricette)" },
    { k: "bimby", label: "Bimby · Cookidoo (IT)" },
    { k: "mealdb", label: "TheMealDB (tradotto)" }
  ];
  if (SPOONACULAR_ENABLED) list.push({ k: "spoon", label: "Spoonacular (tradotto)" });
  if (EDAMAM_ENABLED) list.push({ k: "edamam", label: "Edamam (tradotto)" });
  return list;
}

const mapMealdb = (r) => ({ source: "mealdb", title: r.title, image: r.thumb || "", link: r.link, ingredients: r.ingredients || [], steps: r.steps || [], meta: [r.category, r.area].filter(Boolean).join(" · ") });
const mapGz = (r) => ({ source: "gz", title: r.title, title_it: r.title, image: r.image || "", link: r.url, meta: "GialloZafferano" });
const mapBlog = (r) => ({ source: "blog", title: r.title, title_it: r.title, image: r.image || "", link: r.url, meta: "Blog GialloZafferano" });
const mapMisya = (r) => ({ source: "misya", title: r.title, title_it: r.title, image: r.image || "", link: r.url, meta: "Misya" });
const mapCookist = (r) => ({ source: "cookist", title: r.title, title_it: r.title, image: r.image || "", link: r.url, meta: "Cookist" });
const mapRicettenonna = (r) => ({ source: "ricettenonna", title: r.title, title_it: r.title, image: r.image || "", link: r.url, meta: "Ricette della Nonna" });
const mapMoulinex = (r) => ({ source: "moulinex", title: r.title, title_it: r.title, image: r.image || (r.url && WORKER_URL ? `${WORKER_URL}/moulinex-img?u=${encodeURIComponent(r.url)}` : ""), link: r.url, meta: "Moulinex" });
const mapBimby = (r) => ({ source: "bimby", title: r.title, title_it: r.title, image: r.image || "", link: r.url, meta: "Bimby" });
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
  mealSourceCounts = [];
  if (mealSource === "gz") { const out = (await searchGz(q)).map(mapGz); return out; }
  if (mealSource === "blog") { const out = (await searchBlogGz(q)).map(mapBlog); return out; }
  if (mealSource === "misya") { const out = (await searchMisya(q)).map(mapMisya); return out; }
  if (mealSource === "cookist") { const out = (await searchCookist(q)).map(mapCookist); return out; }
  if (mealSource === "ricettenonna") { const out = (await searchRicettenonna(q)).map(mapRicettenonna); return out; }
  if (mealSource === "moulinex") { const d = await searchMoulinexFull(q, mealPage); mealTotal = d.total; return d.results.map(mapMoulinex); }
  if (mealSource === "bimby") { const d = await searchBimbyFull(q, mealPage); mealTotal = d.total; return d.results.map(mapBimby); }
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
    // Tutte le fonti: nessun limite per fonte (prima erano 5) → mostra TUTTI i
    // risultati, paginati. Teniamo il conteggio per fonte per il riepilogo.
    const defs = [
      ["GialloZafferano", searchGz(q).then((rs) => rs.map(mapGz)).catch(() => [])],
      ["Misya", searchMisya(q).then((rs) => rs.map(mapMisya)).catch(() => [])],
      ["Cookist", searchCookist(q).then((rs) => rs.map(mapCookist)).catch(() => [])],
      ["Ricette della Nonna", searchRicettenonna(q).then((rs) => rs.map(mapRicettenonna)).catch(() => [])],
      ["Moulinex", searchMoulinex(q).then((rs) => rs.map(mapMoulinex)).catch(() => [])],
      ["Bimby", searchBimby(q).then((rs) => rs.map(mapBimby)).catch(() => [])],
      ["TheMealDB", mealdb.searchMeals(en).then((rs) => rs.map(mapMealdb)).catch(() => [])]
    ];
    if (SPOONACULAR_ENABLED) defs.push(["Spoonacular", searchSpoon(en).then((rs) => rs.map(mapSpoon)).catch(() => [])]);
    if (EDAMAM_ENABLED) defs.push(["Edamam", searchEdamam(en).then((rs) => rs.map(mapEdamam)).catch(() => [])]);
    const arrays = await Promise.all(defs.map((d) => d[1]));
    mealSourceCounts = defs.map((d, i) => ({ label: d[0], count: arrays[i].length })).filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
    const merged = interleave(arrays);
    await translateMealTitles(merged);
    return merged;
  }
  const out = (await mealdb.searchMeals(await translateToEnglish(q))).map(mapMealdb);
  await translateMealTitles(out);
  return out;
}

// Illustrazione SVG (pentola con vapore) per le schermate vuote del Ricettario.
function emptyArt(kind = "pot") {
  const tint = "rgba(var(--primary-rgb,255,184,107),0.22)";
  const bg = `<circle cx="60" cy="62" r="52" fill="rgba(var(--primary-rgb,255,184,107),0.10)"/>`;
  const sw = `stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"`;
  let inner;
  if (kind === "cart") {
    inner = `<path d="M34 42h8l6 30h30l6-20H46" fill="none" ${sw}/>
      <path d="M52 72h26" ${sw}/>
      <circle cx="52" cy="84" r="4.5" fill="${tint}" ${sw}/>
      <circle cx="76" cy="84" r="4.5" fill="${tint}" ${sw}/>
      <path d="M58 56h12M58 64h12" ${sw} opacity="0.7"/>`;
  } else if (kind === "calendar") {
    inner = `<rect x="34" y="40" width="52" height="44" rx="6" fill="${tint}" ${sw}/>
      <path d="M34 52h52" ${sw}/>
      <path d="M46 36v8M74 36v8" ${sw}/>
      <path d="M44 64h8M58 64h8M44 74h8" ${sw} opacity="0.8"/>`;
  } else if (kind === "heart") {
    inner = `<path d="M60 84S38 70 38 55a12 12 0 0 1 22-7 12 12 0 0 1 22 7c0 15-22 29-22 29Z" fill="${tint}" ${sw}/>`;
  } else if (kind === "jar") {
    inner = `<rect x="42" y="44" width="36" height="42" rx="7" fill="${tint}" ${sw}/>
      <path d="M46 40h28a4 4 0 0 1 4 4H42a4 4 0 0 1 4-4Z" ${sw}/>
      <path d="M42 60h36" ${sw} opacity="0.7"/>`;
  } else { // pot (default)
    inner = `<path d="M36 66h48v14a9 9 0 0 1-9 9H45a9 9 0 0 1-9-9V66Z" fill="${tint}" ${sw}/>
      <path d="M30 66h60" ${sw}/>
      <path d="M28 74h-5M92 74h5" ${sw}/>
      <path d="M48 48c0-7 4-11 12-11s12 4 12 11" ${sw}/>
      <path class="empty__steam" d="M50 40v-7M60 38v-9M70 40v-7" ${sw} opacity="0.85"/>`;
  }
  return `<svg class="empty__art" viewBox="0 0 120 120" width="124" height="124" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${bg}${inner}</svg>`;
}

// Esegue una ricerca online e aggiorna lo stato (usata da pulsante, invio e
// dal "tira-per-aggiornare").
// Fonti "da sfogliare": non hanno la ricerca testuale, mostrano una lista curata.
const BROWSE_SOURCES = new Set(["moulinex"]);
// Fonti paginate dal server (la pagina si rifà sul worker a ogni cambio pagina).
const SERVER_PAGINATED = new Set(["moulinex", "bimby"]);
// Fonti senza ricerca per parola (solo sfoglia): nascondiamo il campo di ricerca.
const SEARCH_DISABLED = new Set([]);
const MEAL_PAGE_SIZE = 12;
// Riconosce nel testo il nome di una fonte/robot e ci instrada la ricerca
// (es. "pollo bimby" → cerca solo tra le ricette Bimby, togliendo la parola).
const SOURCE_CUES = [
  { re: /\b(moulinex|i[-\s]?companion|companion|cookeo)\b/gi, source: "moulinex" },
  { re: /\b(bimby|cookidoo|thermomix)\b/gi, source: "bimby" },
  { re: /\b(giallozafferano|giallo\s?zafferano|gz)\b/gi, source: "gz" },
  { re: /\bmisya\b/gi, source: "misya" },
  { re: /\bcookist\b/gi, source: "cookist" },
  { re: /\bricette?\s?(?:della\s)?nonna\b/gi, source: "ricettenonna" }
];
function detectSource(q) {
  for (const c of SOURCE_CUES) {
    c.re.lastIndex = 0;
    if (c.re.test(q)) {
      const cleaned = q.replace(c.re, " ").replace(/\s{2,}/g, " ").trim();
      return { source: c.source, query: cleaned };
    }
  }
  return null;
}
// Va al Ricettario online (scheda "Cerca online") e lancia subito la ricerca.
function searchOnline(term) {
  const q = (term || "").trim();
  if (!q) return;
  pendingVideoForImport = ""; // una ricerca normale non porta dietro alcun video
  mealTab = "online";
  if (BROWSE_SOURCES.has(mealSource)) mealSource = "all"; // una fonte con ricerca testuale
  // Avvia la ricerca DOPO che la pagina Ricettario è disegnata: la consuma
  // renderOnlineTab (altrimenti partirebbe prima del DOM e resterebbe bloccata).
  pendingMealQuery = q;
  navigate("ricettario");
}
async function performMealSearch(q, keepPage = false) {
  q = (q || "").trim();
  // Solo da "Tutte le fonti": se scrivi il nome di una fonte/robot, cerca solo lì.
  if (!keepPage && mealSource === "all") {
    const det = detectSource(q);
    if (det) { mealSource = det.source; q = det.query; }
  }
  if (!q && !BROWSE_SOURCES.has(mealSource)) return;
  if (!keepPage) mealPage = 0;
  mealQuery = q; mealLoading = true; mealError = ""; mealTotal = null; mealElapsedMs = 0; renderOnlineTab();
  const t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  try {
    mealResults = await runMealSearch(q);
  } catch (e) {
    mealError = e && e.code === "nokey" ? "Questa fonte non è configurata (vedi README)." : "Servizio non raggiungibile o troppo lento. Riprova.";
    mealResults = null;
  }
  const t1 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  mealElapsedMs = Math.max(0, Math.round(t1 - t0));
  mealLoading = false; renderOnlineTab();
}
// Cambia pagina dei risultati: rifà la ricerca (fonti server-paginate) o slice locale.
function changeMealPage(delta) {
  const next = mealPage + delta;
  if (next < 0) return;
  mealPage = next;
  if (SERVER_PAGINATED.has(mealSource)) performMealSearch(mealQuery, true);
  else { renderOnlineTab(); try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) {} }
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

// Salva/importa un risultato online (riusato da card e da "Da provare").
async function saveMealResult(data, onProgress = () => {}) {
  if (data.source === "gz" || data.source === "blog" || data.source === "misya" || data.source === "cookist" || data.source === "ricettenonna" || data.source === "moulinex" || data.source === "bimby") {
    onProgress(`${iconHtml("download-simple")} Importo...`);
    try {
      const r = await importFromUrl(data.link);
      openRecipeForm({ prefill: { title: r.title, url: data.link, image: r.image, servings: r.servings, time: r.time, ingredients: r.ingredients, steps: r.steps, tags: r.tags, video: r.video, source: data.source } });
    } catch (e) { toast(e.message || "Import non riuscito", "error"); }
    return;
  }
  let src = { title: data.title, link: data.link, image: data.image || "", servings: data.servings || null, time: data.time || null, ingredients: data.ingredients || [], steps: data.steps || [] };
  if (data.source === "spoon" && data.id) {
    onProgress(`${iconHtml("download-simple")} Recupero...`);
    try {
      const info = await spoonInfo(data.id);
      if (info) src = {
        title: info.title || src.title, link: info.link || src.link, image: info.image || src.image,
        servings: info.servings || src.servings, time: info.time || src.time,
        ingredients: (info.ingredients && info.ingredients.length) ? info.ingredients : src.ingredients,
        steps: (info.steps && info.steps.length) ? info.steps : src.steps
      };
    } catch (e) { /* uso i dati della ricerca */ }
  }
  src.ingredients = (src.ingredients || []).map(convertMeasures);
  src.steps = (src.steps || []).map(convertMeasures);
  onProgress(`${iconHtml("download-simple")} Traduco...`);
  let prefill = { title: src.title, url: src.link, image: src.image, servings: src.servings, time: src.time, ingredients: src.ingredients, steps: src.steps, source: data.source };
  try {
    const tr = await translateRecipe({ title: src.title, ingredients: prefill.ingredients, steps: prefill.steps });
    prefill = { ...prefill, title: tr.title, ingredients: tr.ingredients, steps: tr.steps };
  } catch (e) { /* tengo l'inglese */ }
  openRecipeForm({ prefill });
}

// Spesa del mese: registro locale di quanto speso (stima) quando fai la spesa.
const SPEND_KEY = "ricettario.spend";
function getSpend() { try { return JSON.parse(localStorage.getItem(SPEND_KEY) || "{}"); } catch (e) { return {}; } }
function addSpend(amount) {
  if (!amount || amount <= 0) return;
  const ym = new Date().toISOString().slice(0, 7);
  const s = getSpend();
  s[ym] = Math.round(((s[ym] || 0) + amount) * 100) / 100;
  try { localStorage.setItem(SPEND_KEY, JSON.stringify(s)); } catch (e) {}
}
function currentMonthSpend() { return getSpend()[new Date().toISOString().slice(0, 7)] || 0; }
// Budget di spesa mensile (facoltativo, locale).
const BUDGET_KEY = "ricettario.budget";
function getBudget() { const v = parseFloat(localStorage.getItem(BUDGET_KEY)); return isNaN(v) || v <= 0 ? 0 : v; }
function setBudget(v) { try { if (v > 0) localStorage.setItem(BUDGET_KEY, String(v)); else localStorage.removeItem(BUDGET_KEY); } catch (e) {} }
function openSpendHistory() {
  const s = getSpend();
  const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  const M3 = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
  // Grafico andamento: ultimi 6 mesi (anche quelli a zero, per continuità).
  const nowD = new Date();
  const months6 = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(nowD.getFullYear(), nowD.getMonth() - i, 1); const ym = d.toISOString().slice(0, 7); months6.push({ label: M3[d.getMonth()], val: s[ym] || 0 }); }
  const maxV = Math.max(1, ...months6.map((x) => x.val));
  const budget = getBudget();
  const chart = months6.some((x) => x.val > 0)
    ? `<div class="stat-block"><div class="stat-block__t">${iconHtml("basket")} Andamento (ultimi 6 mesi)</div>
        <div class="bar-chart">${months6.map((x) => `<div class="bar-col"><span class="bar-n">${x.val ? "€" + Math.round(x.val) : ""}</span><div class="bar${budget && x.val > budget ? " bar--over" : ""}" style="height:${Math.round(x.val / maxV * 64) + 3}px"></div><span class="bar-lbl">${x.label}</span></div>`).join("")}</div>
        ${(() => { const vals = months6.filter((x) => x.val > 0).map((x) => x.val); if (!vals.length) return ""; const avg = vals.reduce((a, b) => a + b, 0) / vals.length; return `<div class="hint" style="margin-top:6px">Media: <b>€ ${avg.toFixed(0)}</b> al mese${budget ? ` · budget € ${budget.toFixed(0)}` : ""}</div>`; })()}
      </div>`
    : "";
  const rows = Object.keys(s).sort().reverse().slice(0, 12).map((ym) => {
    const [y, mo] = ym.split("-");
    return `<div class="stat-row"><span>${MESI[+mo - 1]} ${y}</span><b>€ ${(s[ym] || 0).toFixed(2)}</b></div>`;
  }).join("") || `<div class="hint">Ancora nessuna spesa registrata.</div>`;
  const m = openModal(`<h3 class="modal__title">${iconHtml("basket")} Spesa per mese</h3>
    <div class="field" style="margin-bottom:12px">
      <label>Budget mensile (€) — facoltativo</label>
      <input type="number" id="budgetIn" inputmode="decimal" min="0" step="10" placeholder="es. 400" value="${getBudget() || ""}" />
      <div class="hint" style="margin-top:4px">Lascia vuoto per non usare il budget.</div>
    </div>
    ${chart}
    <div class="cl-scroll">${rows}</div><div class="hint" style="margin-top:8px">Stima indicativa, calcolata quando tocchi "Spesa fatta".</div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Salva</button></div>`);
  m.el.querySelector('[data-act="ok"]').addEventListener("click", () => {
    const v = parseFloat((m.el.querySelector("#budgetIn").value || "").replace(",", ".")) || 0;
    setBudget(v);
    m.close();
    if (shopTab === "lista") renderShoppingList();
  });
}

// Lista "Da provare": ricette online segnate per importarle più avanti (locale).
const TOTRY_KEY = "ricettario.totry";
function getToTry() { try { return JSON.parse(localStorage.getItem(TOTRY_KEY) || "[]"); } catch (e) { return []; } }
function setToTry(list) { try { localStorage.setItem(TOTRY_KEY, JSON.stringify(list.slice(0, 100))); } catch (e) {} }
function isToTry(link) { return getToTry().some((x) => x.link === link); }
function toggleToTry(meal) {
  const list = getToTry();
  const i = list.findIndex((x) => x.link === meal.link);
  if (i >= 0) { list.splice(i, 1); setToTry(list); return false; }
  list.unshift(meal); setToTry(list); return true;
}

function openToTry() {
  const list = getToTry();
  const body = list.length
    ? list.map((m) => `<div class="totry-row" data-link="${escapeHtml(m.link)}">
        ${m.image ? `<img src="${escapeHtml(proxiedImg(m.image))}" alt="" referrerpolicy="no-referrer" />` : `<span class="totry-row__ph">${iconHtml("fork-knife")}</span>`}
        <span class="totry-row__t">${escapeHtml(m.title_it || m.title)}<span class="meal-src meal-src--${m.source}" style="margin-left:6px">${SOURCE_LABEL[m.source] || ""}</span></span>
        <button class="chip" data-act="imp">${iconHtml("plus")} Importa</button>
        <button class="icon-btn icon-btn--danger" data-act="rm">${iconHtml("trash")}</button>
      </div>`).join("")
    : `<div class="hint">Nessuna ricetta da provare. Tocca il segnalibro 🔖 su un risultato online per aggiungerla qui.</div>`;
  const m = openModal(`<h3 class="modal__title">🔖 Da provare</h3><div class="cl-scroll">${body}</div><div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>`);
  m.el.querySelector('[data-act="ok"]').addEventListener("click", m.close);
  m.el.querySelectorAll(".totry-row").forEach((row) => {
    const link = row.dataset.link;
    const data = getToTry().find((x) => x.link === link);
    row.querySelector('[data-act="rm"]').addEventListener("click", () => { toggleToTry({ link }); row.remove(); });
    row.querySelector('[data-act="imp"]').addEventListener("click", async () => {
      if (data) { m.close(); await saveMealResult(data, () => {}); }
    });
  });
}

// "Riconosci un piatto da foto": l'AI di visione dice che piatto è, poi cerca online.
async function recognizeDishPhoto(file) {
  let dataUrl;
  try { dataUrl = await fileToDataUrl(file, 672, 0.6); } catch (e) { toast("Foto non valida", "error"); return; }
  const m = openModal(`
    <h3 class="modal__title">📸 Che piatto è?</h3>
    <div id="dpBody" style="text-align:center;padding:8px 0"><div class="ai-load"><div class="sk sk--line"></div><div class="sk sk--line sk--short"></div><div class="sk sk--line"></div></div><div class="hint">Guardo la foto…</div></div>
    <div class="modal__actions"><button class="btn" data-act="c">Chiudi</button></div>
  `);
  m.el.querySelector('[data-act="c"]').onclick = m.close;
  try {
    const name = await dishNameFromPhoto(dataUrl);
    if (!m.el.isConnected) return;
    m.el.querySelector("#dpBody").innerHTML = `<p style="margin:4px 0">Sembra: <b>${escapeHtml(name)}</b></p><button class="btn btn--primary btn--block" id="dpSearch" style="margin-top:10px">${iconHtml("magnifying-glass")} Cerca "${escapeHtml(name)}" online</button>`;
    m.el.querySelector("#dpSearch").onclick = () => { m.close(); searchOnline(name); };
  } catch (e) {
    if (!m.el.isConnected) return;
    m.el.querySelector("#dpBody").innerHTML = `<div class="hint" style="color:var(--danger)">${escapeHtml(e.message || "Non riconosciuto.")}</div>`;
  }
}

// Svuota frigo: cerca online ricette che usano gli ingredienti che hai.
function openFridgeSearch() {
  const m = openModal(`
    <h3 class="modal__title">🧊 Svuota frigo</h3>
    <p class="hint" style="margin-top:-8px;margin-bottom:12px">Scrivi gli ingredienti che hai (separati da virgola): cerco ricette che li usano. Funziona meglio con la fonte <b>Moulinex</b>.</p>
    <div class="field"><input type="text" id="fridgeIn" placeholder="es. zucchine, pollo, limone" /></div>
    <div class="modal__actions"><button class="btn" data-act="cancel">Annulla</button><button class="btn btn--primary" data-act="ok">Cerca</button></div>
  `);
  const input = m.el.querySelector("#fridgeIn");
  input.focus();
  const go = () => { const v = input.value.trim(); if (!v) return; m.close(); performMealSearch(v); };
  m.el.querySelector('[data-act="cancel"]').addEventListener("click", m.close);
  m.el.querySelector('[data-act="ok"]').addEventListener("click", go);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
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
      else if (BROWSE_SOURCES.has(mealSource)) performMealSearch("");
      else if (mealSource === "mealdb") performMealRandom();
    }
  };
  body.addEventListener("touchend", end);
  body.addEventListener("touchcancel", end);
}

function renderOnlineTab() {
  const body = root.querySelector("#ricettarioBody");
  if (!body) return; // la pagina non è ancora pronta: evita errori e blocchi
  // Ricerca "in sospeso" (es. da un ingrediente di stagione): avviala da sola.
  if (pendingMealQuery) {
    const q = pendingMealQuery; pendingMealQuery = "";
    mealQuery = q;
    setTimeout(() => performMealSearch(q), 0);
  }
  let resultsHtml = "";
  if (mealLoading) {
    resultsHtml = Array.from({ length: 6 }, () =>
      `<div class="meal-card meal-card--skeleton"><div class="sk sk--img"></div><div class="meal-card__body"><div class="sk sk--line"></div><div class="sk sk--line sk--short"></div></div></div>`
    ).join("");
  } else if (mealError) {
    resultsHtml = `<div class="empty"><span class="empty__emoji">${iconHtml("cloud-check")}</span>${escapeHtml(mealError)}</div>`;
  } else if (mealResults && mealResults.length === 0) {
    resultsHtml = `<div class="empty"><span class="empty__emoji">${iconHtml("magnifying-glass")}</span>Nessun risultato. Prova un altro termine (es. "pasta", "torta", "zuppa").</div>`;
  } else if (mealResults) {
    const serverPaged = SERVER_PAGINATED.has(mealSource);
    const totalItems = serverPaged ? (mealTotal != null ? mealTotal : mealResults.length) : mealResults.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / MEAL_PAGE_SIZE));
    const pageItems = serverPaged ? mealResults : mealResults.slice(mealPage * MEAL_PAGE_SIZE, mealPage * MEAL_PAGE_SIZE + MEAL_PAGE_SIZE);
    const timeStr = mealElapsedMs > 0 ? ` · ${(mealElapsedMs / 1000).toFixed(1)} s` : "";
    const countLine = mealSource === "all"
      ? `<div class="result-count">${iconHtml("magnifying-glass")} Trovate <b data-countup="${totalItems}">${totalItems}</b> ricette da ${mealSourceCounts.length} ${mealSourceCounts.length === 1 ? "fonte" : "fonti"}${totalPages > 1 ? ` · pagina ${mealPage + 1} di ${totalPages}` : ""}${timeStr}</div>`
        + (mealSourceCounts.length ? `<div class="src-summary">${mealSourceCounts.map((s) => `<span class="src-chip">${escapeHtml(s.label)} <b>${s.count}</b></span>`).join("")}</div>` : "")
      : `<div class="result-count">${iconHtml("magnifying-glass")} Trovate <b data-countup="${totalItems}">${totalItems}</b> ${totalItems === 1 ? "ricetta" : "ricette"}${totalPages > 1 ? ` · pagina ${mealPage + 1} di ${totalPages}` : ""}${timeStr}</div>`;
    const pager = totalPages > 1 ? `<div class="pager">
        <button class="btn btn--ghost" id="pagePrev" ${mealPage === 0 ? "disabled" : ""}>${iconHtml("caret-left")} Prec.</button>
        <span class="pager__info">${mealPage + 1} / ${totalPages}</span>
        <button class="btn btn--ghost" id="pageNext" ${mealPage >= totalPages - 1 ? "disabled" : ""}>Succ. ${iconHtml("caret-right")}</button>
      </div>` : "";
    resultsHtml = countLine + pageItems.map(mealCardHtml).join("") + pager;
  } else {
    resultsHtml = `<div class="empty">${emptyArt()}<div style="margin-top:6px">Cerca una ricetta in italiano.<br><small>Scegli la fonte qui sopra, o lasciati sorprendere.</small></div></div>`;
  }
  const srcOpts = onlineSources().map((s) => `<option value="${s.k}" ${mealSource === s.k ? "selected" : ""}>${s.label}</option>`).join("");
  const browse = BROWSE_SOURCES.has(mealSource);
  const searchable = !SEARCH_DISABLED.has(mealSource);
  if (browse && !mealResults && !mealLoading && !mealError) {
    resultsHtml = `<div class="empty">${emptyArt()}<div style="margin-top:6px">Carico le ricette…</div></div>`;
  }
  let bannerHtml = "";
  if (mealSource === "moulinex") bannerHtml = `<div class="banner" style="margin-bottom:12px">🤖 <div>Cerca tra le <b>oltre 4800 ricette Moulinex</b> (scrivi un piatto, es. "pollo"), o sfoglia la selezione qui sotto. Tocca <b>Importa</b>: arriva con foto, ingredienti e passaggi.</div></div>`;
  else if (mealSource === "bimby") bannerHtml = `<div class="banner" style="margin-bottom:12px">🥣 <div>Cerca tra le ricette <b>Bimby (Cookidoo)</b> ufficiali. L'import porta titolo, ingredienti e foto; i <b>passaggi guidati</b> si seguono nell'app Cookidoo (col tuo abbonamento) — tocca <b>Apri</b>.</div></div>`;

  body.innerHTML = `
    <div class="meal-controls">
      ${searchable ? `<div class="meal-search">
        <label class="meal-search__lbl">${iconHtml("magnifying-glass")} Cerca una ricetta</label>
        <div class="search-bar search-bar--hero">
          <input type="search" id="mealSearch" placeholder="Es. pollo, torta, zuppa…" value="${escapeHtml(mealQuery)}" />
          ${(("webkitSpeechRecognition" in window) || ("SpeechRecognition" in window)) ? `<button class="btn mic-btn" id="mealMic" title="Cerca a voce" aria-label="Cerca a voce">🎤</button>` : ""}
          <button class="btn btn--primary" id="mealSearchBtn">Cerca</button>
        </div>
      </div>` : ""}
      <div class="field" style="margin-bottom:10px"><label class="mini-lbl">Fonte</label><select id="mealSource">${srcOpts}</select></div>
      ${searchable ? `<button class="btn btn--ghost btn--block" id="fridgeBtn" style="margin-bottom:12px">🧊 Svuota frigo (cerca per ingredienti)</button>` : ""}
      ${searchable && isImportConfigured() ? `<button class="btn btn--ghost btn--block" id="dishPhotoBtn" style="margin-bottom:12px">📸 Riconosci un piatto da una foto</button><input type="file" id="dishPhotoFile" accept="image/*" capture="environment" hidden />` : ""}
      ${(() => { const n = getToTry().length; return n ? `<button class="btn btn--ghost btn--block" id="toTryBtn" style="margin-bottom:12px">🔖 Da provare (${n})</button>` : ""; })()}
      ${mealSource === "moulinex" ? `<button class="btn btn--ghost btn--block" id="companionRandom" style="margin-bottom:12px">🎲 Sorprendimi col Companion</button>` : ""}
      ${bannerHtml}
      ${mealSource === "mealdb" ? `<div style="margin-top:10px"><button class="btn btn--ghost" id="mealRandom">${iconHtml("shuffle")} Ispirami</button></div>` : ""}
    </div>
    <div id="mealResults">${resultsHtml}</div>
  `;

  body.querySelector("#mealSource").addEventListener("change", (e) => {
    mealSource = e.target.value; mealResults = null; mealError = ""; mealPage = 0; mealTotal = null;
    renderOnlineTab();
    // Mantiene il testo cercato: se c'è, rifà subito la ricerca sulla nuova fonte.
    const q = (mealQuery || "").trim();
    if (q && !BROWSE_SOURCES.has(mealSource)) performMealSearch(q);
    else if (BROWSE_SOURCES.has(mealSource)) performMealSearch(q); // Moulinex/Bimby: lista o ricerca
  });

  const input = body.querySelector("#mealSearch");
  if (input) {
    const doSearch = () => performMealSearch(input.value);
    body.querySelector("#mealSearchBtn").addEventListener("click", doSearch);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
    const mmic = body.querySelector("#mealMic");
    if (mmic) mmic.addEventListener("click", () => startMealVoiceSearch());
  }
  const randomBtn = body.querySelector("#mealRandom");
  if (randomBtn) randomBtn.addEventListener("click", () => performMealRandom());

  const pagePrev = body.querySelector("#pagePrev");
  if (pagePrev) pagePrev.addEventListener("click", () => changeMealPage(-1));
  const pageNext = body.querySelector("#pageNext");
  if (pageNext) pageNext.addEventListener("click", () => changeMealPage(1));

  const toTryBtn = body.querySelector("#toTryBtn");
  if (toTryBtn) toTryBtn.addEventListener("click", () => openToTry());

  const fridgeBtn = body.querySelector("#fridgeBtn");
  if (fridgeBtn) fridgeBtn.addEventListener("click", () => openFridgeSearch());
  const dishPhotoBtn = root.querySelector("#dishPhotoBtn");
  const dishPhotoFile = root.querySelector("#dishPhotoFile");
  if (dishPhotoBtn) dishPhotoBtn.addEventListener("click", () => dishPhotoFile.click());
  if (dishPhotoFile) dishPhotoFile.addEventListener("change", async () => { const f = dishPhotoFile.files[0]; dishPhotoFile.value = ""; if (f) recognizeDishPhoto(f); });

  const companionRandom = body.querySelector("#companionRandom");
  if (companionRandom) companionRandom.addEventListener("click", async () => {
    const old = companionRandom.innerHTML;
    companionRandom.disabled = true;
    companionRandom.innerHTML = "🎲 Cerco…";
    try {
      const list = await searchMoulinex();
      if (!list.length) { toast("Nessuna ricetta Companion disponibile", "error"); }
      else {
        const pick = list[Math.floor(Math.random() * list.length)];
        companionRandom.innerHTML = `${iconHtml("download-simple")} Importo…`;
        const r = await importFromUrl(pick.url);
        openRecipeForm({ prefill: { title: r.title, url: pick.url, image: r.image, servings: r.servings, time: r.time, ingredients: r.ingredients, steps: r.steps, tags: r.tags } });
      }
    } catch (e) { toast(e.message || "Import non riuscito", "error"); }
    companionRandom.disabled = false; companionRandom.innerHTML = old;
  });

  // Tira-per-aggiornare: trascina in basso (in cima alla pagina) per rilanciare
  // l'ultima ricerca, o pescare nuove ricette casuali su TheMealDB.
  setupPullToRefresh(body);
  animateCountUps(body); // conteggio "Trovate N ricette" che sale da zero

  body.querySelectorAll(".meal-card[data-meal]").forEach((card) => {
    let data;
    try { data = JSON.parse(card.dataset.meal); } catch (e) { return; }
    // Se la foto non si carica (referer/host), mostra il segnaposto invece di un'icona rotta.
    const imgEl = card.querySelector("img");
    if (imgEl) imgEl.addEventListener("error", () => {
      const ph = document.createElement("div");
      ph.className = "meal-card__noimg";
      ph.innerHTML = iconHtml("fork-knife");
      imgEl.replaceWith(ph);
    });
    const saveBtn = card.querySelector('[data-act="save"]');
    saveBtn.addEventListener("click", async () => {
      const old = saveBtn.innerHTML;
      saveBtn.disabled = true;
      await saveMealResult(data, (msg) => { saveBtn.innerHTML = msg; });
      saveBtn.disabled = false; saveBtn.innerHTML = old;
    });
    const tryBtn = card.querySelector('[data-act="totry"]');
    if (tryBtn) tryBtn.addEventListener("click", () => {
      const on = toggleToTry(data);
      tryBtn.classList.toggle("is-on", on);
      toast(on ? "Aggiunta a \"Da provare\" 🔖" : "Rimossa da \"Da provare\"", on ? "success" : "");
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
      ${m.image ? `<img src="${escapeHtml(proxiedImg(m.image))}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : `<div class="meal-card__noimg">${iconHtml("fork-knife")}</div>`}
      <div class="meal-card__body">
        <h3 class="meal-card__title">${escapeHtml(m.title_it || m.title)}</h3>
        <div class="meal-card__meta"><span class="meal-src meal-src--${m.source}">${SOURCE_LABEL[m.source] || ""}</span>${m.meta ? " · " + escapeHtml(m.meta) : ""}</div>
        <div class="meal-card__actions">
          ${m.link ? `<a class="chip" href="${escapeHtml(safeUrl(m.link))}" target="_blank" rel="noopener">${iconHtml("arrow-square-out")} Apri</a>` : ""}
          <button class="chip" data-act="save">${iconHtml("plus")} ${(m.source === "gz" || m.source === "blog" || m.source === "misya" || m.source === "cookist" || m.source === "ricettenonna" || m.source === "moulinex" || m.source === "bimby") ? "Importa" : "Salva"}</button>
          <button class="chip chip--bookmark ${isToTry(m.link) ? "is-on" : ""}" data-act="totry" title="Da provare">🔖</button>
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
  { icon: "image", title: "Aggiungi senza fatica", text: "Nel form ricetta: incolla un link e tocca \"Importa\", \"Scansiona da una foto\" per leggere da un libro o quaderno, \"Importa da video social\" per TikTok/Instagram/YouTube, oppure \"Inventa una ricetta (AI)\" dagli ingredienti che hai. O salva dal Ricettario online." },
  { icon: "sparkle", title: "Aiuto AI", text: "Aiuti intelligenti (gratis): \"Inventa una ricetta\" dagli ingredienti, \"Chiedi allo chef\" per dubbi e sostituzioni, \"Com'è venuto?\" che giudica la foto del piatto, \"Adatta la ricetta\" (vegano/leggero…), \"Modalità robot\" per Companion/Bimby, \"Fotografa il frigo\" e il \"Menù AI\" della settimana. Sono un aiuto, non infallibili." },
  { icon: "book-open", title: "Ricettario", text: "Cerca idee online o tra i siti italiani; tocca \"Salva\" per aggiungerle a uno dei tuoi strumenti. Le ricette online sono in inglese: al salvataggio vengono tradotte in italiano in automatico." },
  { icon: "fork-knife", title: "Porzioni su misura", text: "Apri una ricetta e cambia il numero di persone con + e −: le quantità degli ingredienti si ricalcolano da sole." },
  { icon: "carrot", title: "Valori nutrizionali", text: "In una ricetta tocca \"Calcola\" sotto gli ingredienti: l'app stima calorie e macronutrienti (proteine, carboidrati, grassi) per porzione e totali. Per ciò che non conosce cerca online su Open Food Facts e ti mostra anche cosa non ha conteggiato. È una stima: cambia con il numero di porzioni." },
  { icon: "heart", title: "Trova al volo", text: "Dalla schermata Strumenti cerca per nome o ingrediente e usa i filtri: Preferiti, Più cucinate, Di recente, per tempo (≤15 e ≤30 min) e le categorie. Indica il tempo di preparazione nella ricetta (modifica) per usare i filtri rapidi. Dai un voto a stelle e \"Segna come cucinata\" per il conto." },
  { icon: "shopping-cart-simple", title: "Spesa & Dispensa", text: "Aggiungi gli ingredienti alla lista della spesa (uniti e per reparto). Tocca il nome per spuntare un articolo e la quantità per modificarla. Con \"Spesa fatta\" passa tutto in dispensa. In Dispensa tieni ciò che hai già — con la scadenza, e l'app ti avvisa quando qualcosa sta per scadere — e \"Cosa posso cucinare\" suggerisce le ricette con quello che hai." },
  { icon: "fire", title: "Modalità cucina", text: "Nelle ricette con i passi, tocca \"Modalità cucina\": istruzioni passo-passo, più timer con nome (pasta, forno…), lettura vocale (🔊) e schermo sempre acceso. Tocca un ingrediente nel passo per vedere la quantità. Col microfono 🎤 vai avanti/indietro a voce, avvii timer e puoi anche fare domande (\"posso sostituire il burro?\") con risposta a voce." },
  { icon: "calendar-blank", title: "Pianificazione", text: "Nel calendario (vista Mese o Settimana) assegna le ricette ai giorni in pranzo o cena, usa \"Riempi le cene\" per riempire la settimana e genera la spesa del mese o della settimana." },
  { icon: "book-bookmark", title: "Menu", text: "Dalla schermata Strumenti, filtro \"Menu\": raggruppa più ricette (es. \"Cena con amici\") e genera un'unica lista della spesa." },
  { icon: "arrow-square-out", title: "Condividi", text: "Da una ricetta tocca \"Condividi\" per inviarla a qualcuno (WhatsApp, email…) con ingredienti e preparazione." },
  { icon: "calendar-dots", title: "Promemoria", text: "In Opzioni attiva i \"Promemoria\": ricevi una notifica delle scadenze in dispensa e del pasto di oggi. Puoi scegliere l'ora dell'avviso e aggiungere un secondo avviso serale con l'anteprima dei pasti di domani. Su iPhone aggiungi prima l'app alla schermata Home." },
  { icon: "sparkle", title: "Personalizza", text: "In Opzioni scegli il tema chiaro o scuro. Con l'accesso le ricette sono salvate nel cloud e sincronizzate su tutti i dispositivi; puoi anche esportare un backup." }
];

// Mini-motore di "tour guidato": evidenzia elementi e apre le pagine giuste,
// passo dopo passo. Self-contained (niente librerie esterne, funziona offline).
function runTour(steps) {
  if (!Array.isArray(steps) || !steps.length) return;
  document.querySelectorAll(".tour").forEach((t) => t.remove());
  const overlay = document.createElement("div");
  overlay.className = "tour";
  document.body.appendChild(overlay);
  const cleanup = () => { window.removeEventListener("resize", onResize); overlay.remove(); };
  const onResize = () => render(true);
  let i = 0;
  async function render(repositionOnly) {
    const step = steps[i];
    if (!step) { cleanup(); return; }
    if (!repositionOnly && typeof step.action === "function") { try { step.action(); } catch (e) {} }
    let el = null;
    if (step.selector) {
      for (let t = 0; t < 24 && !el; t++) { el = document.querySelector(step.selector); if (!el) await new Promise((r) => setTimeout(r, 150)); }
      if (el) { try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {} await new Promise((r) => setTimeout(r, 280)); }
    }
    if (!overlay.isConnected) return;
    const r = el ? el.getBoundingClientRect() : null;
    const hole = r ? `<div class="tour__hole" style="top:${r.top - 6}px;left:${r.left - 6}px;width:${r.width + 12}px;height:${r.height + 12}px"></div>` : `<div class="tour__hole tour__hole--full"></div>`;
    overlay.innerHTML = hole + `<div class="tour__pop">
        <div class="tour__step">Passo ${i + 1} di ${steps.length}</div>
        <div class="tour__title">${escapeHtml(step.title)}</div>
        <div class="tour__text">${escapeHtml(step.text)}</div>
        <div class="tour__btns"><button class="btn" data-t="skip">Esci</button><button class="btn btn--primary" data-t="next">${i === steps.length - 1 ? "Ho capito" : "Avanti"}</button></div>
      </div>`;
    const pop = overlay.querySelector(".tour__pop");
    if (r && pop) {
      const below = (r.bottom + 16 + pop.offsetHeight) < window.innerHeight;
      pop.style.transform = "translateX(-50%)";
      pop.style.top = (below ? r.bottom + 12 : Math.max(10, r.top - 12 - pop.offsetHeight)) + "px";
    }
    overlay.querySelector('[data-t="skip"]').onclick = cleanup;
    overlay.querySelector('[data-t="next"]').onclick = () => { i++; render(false); };
  }
  window.addEventListener("resize", onResize);
  render(false);
}
// Tour disponibili: ogni passo apre la pagina giusta (action) ed evidenzia un elemento.
const TOURS = {
  casa: [
    { title: "Casa condivisa", text: "Ti mostro come condividere la lista della spesa con un'altra persona. Tocca Avanti.", action: () => navigate("impostazioni") },
    { selector: "#householdBtn", title: "Attiva qui", text: "Tocca \"Attiva\", poi \"Crea una casa\": otterrai un codice da dare all'altra persona (che lo inserisce sul suo telefono).", action: () => navigate("impostazioni") }
  ],
  menusett: [
    { title: "Menù della settimana", text: "Ti porto nel Piano, vista Settimana.", action: () => { planView = "week"; navigate("piano"); } },
    { selector: "#aiWeek", title: "Menù AI", text: "Tocca \"✨ Menù AI\": l'app propone le cene della settimana dalle tue ricette, con anteprima.", action: () => { planView = "week"; navigate("piano"); } }
  ],
  frigo: [
    { title: "Fotografa il frigo", text: "Ti porto nella Dispensa.", action: () => { shopTab = "dispensa"; navigate("spesa"); } },
    { selector: "#fridgePhoto", title: "Da qui", text: "Tocca \"Fotografa il frigo\", scatta una foto e l'app riconosce gli alimenti.", action: () => { shopTab = "dispensa"; navigate("spesa"); } }
  ]
};

// Esegue l'azione di una voce di aiuto (whitelist: pagina/finestra). Sicura.
function executeHelpAction(topic, closeFn) {
  if (!topic || !topic.action) { if (closeFn) closeFn(); return; }
  const a = topic.action;
  if (closeFn) closeFn();
  if (a.type === "page") {
    if (a.target === "spesa-dispensa") { shopTab = "dispensa"; navigate("spesa"); }
    else if (a.target === "ricettario") { mealTab = "online"; navigate("ricettario"); }
    else navigate(a.target); // strumenti | spesa | piano | impostazioni
  } else if (a.type === "open") {
    if (a.target === "timer") openTimersTool();
    else if (a.target === "household") openHouseholdSheet();
    else if (a.target === "nuova-ricetta") openRecipeForm({});
  }
}

// "Chiedi a Fornelli": l'assistente dell'app. Risponde basandosi sul manuale
// (niente invenzioni) e offre "Aprilo per me" verso la funzione giusta.
function openHelpAssistant() {
  const m = openModal(`
    <h3 class="modal__title">❓ Chiedi a Fornelli</h3>
    <p class="hint" style="margin-top:-8px;margin-bottom:10px">Chiedi cosa vuoi fare (es. "come condivido la spesa?") e ti rispondo aprendoti la pagina giusta.</p>
    <div class="search-bar search-bar--hero"><input type="text" id="haQ" placeholder="Scrivi la tua domanda…" /><button class="btn btn--primary" id="haSend">Chiedi</button></div>
    <div class="help-chips">${["Come condivido la spesa?", "Come importo da un video?", "Come uso il Bimby?", "Come pianifico la settimana?"].map((q) => `<button class="chip help-ex" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join("")}</div>
    <div id="haBody"></div>
    <div class="modal__actions"><button class="btn" id="haGuide">📖 Guida completa</button><button class="btn btn--primary" data-act="ok">Chiudi</button></div>
  `);
  m.el.querySelector('[data-act="ok"]').onclick = m.close;
  m.el.querySelector("#haGuide").onclick = () => { m.close(); openGuide(); };
  const input = m.el.querySelector("#haQ");
  const body = m.el.querySelector("#haBody");
  setTimeout(() => input.focus(), 50);
  const showAnswer = (reply, topic) => {
    const hasTour = topic && topic.tour && TOURS[topic.tour];
    body.innerHTML = `<div class="dish-feedback">${escapeHtml(reply).replace(/\n+/g, "<br>")}</div>`
      + (topic && topic.action ? `<button class="btn btn--primary btn--block" id="haDo" style="margin-top:10px">${iconHtml("arrow-square-out")} Aprilo per me</button>` : "")
      + (hasTour ? `<button class="btn btn--block" id="haTour" style="margin-top:8px">🧭 Mostrami passo-passo</button>` : "");
    const doBtn = body.querySelector("#haDo");
    if (doBtn) doBtn.onclick = () => executeHelpAction(topic, m.close);
    const tourBtn = body.querySelector("#haTour");
    if (tourBtn) tourBtn.onclick = () => { m.close(); runTour(TOURS[topic.tour]); };
  };
  const ask = async (q) => {
    q = (q || "").trim(); if (!q) return;
    input.value = q;
    body.innerHTML = `<div style="text-align:center;padding:8px 0"><div class="ai-load"><div class="sk sk--line"></div><div class="sk sk--line sk--short"></div><div class="sk sk--line"></div></div><div class="hint">Cerco…</div></div>`;
    const cands = findHelpTopics(q, 5);
    if (isImportConfigured() && cands.length) {
      try {
        const d = await appHelp(q, cands);
        if (!body.isConnected) return;
        const topic = HELP_TOPICS.find((t) => t.id === d.id) || cands[0];
        showAnswer(d.reply || topic.answer, topic);
        return;
      } catch (e) { /* fallback locale */ }
    }
    if (!body.isConnected) return;
    if (cands.length) showAnswer(cands[0].answer, cands[0]);
    else body.innerHTML = `<div class="hint">Non ho trovato una risposta a questa domanda. Prova con altre parole, oppure apri la <b>Guida completa</b> qui sotto.</div>`;
  };
  m.el.querySelector("#haSend").onclick = () => ask(input.value);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") ask(input.value); });
  m.el.querySelectorAll(".help-ex").forEach((b) => b.onclick = () => ask(b.dataset.q));
}

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

// "Modalità supermercato": vista a tutto schermo della spesa, ordinata per
// reparto come giri tra le corsie, con articoli grandi e barra di avanzamento.
function openSupermarketMode() {
  const host = document.getElementById("modalRoot");
  const el = document.createElement("div");
  el.className = "super";
  host.appendChild(el);
  let wake = null, unsub = null;
  (async () => { try { if (navigator.wakeLock) wake = await navigator.wakeLock.request("screen"); } catch (e) {} })();
  const close = () => { try { if (wake) wake.release(); } catch (e) {} wake = null; if (unsub) { try { unsub(); } catch (e) {} unsub = null; } el.remove(); };
  const superRow = (it) => {
    const qty = it.qty != null ? formatQty(it.qty) : "";
    const amount = [qty, it.unit && it.unit !== "q.b." ? it.unit : (it.unit === "q.b." ? "q.b." : "")].filter(Boolean).join(" ");
    return `<button class="super__item ${it.checked ? "is-checked" : ""}" data-id="${it.id}"><span class="super__check">${it.checked ? "✓" : ""}</span><span class="super__name">${escapeHtml(it.name)}</span>${amount ? `<span class="super__amt">${escapeHtml(amount)}</span>` : ""}</button>`;
  };
  function paint() {
    const items = store.getShopping();
    const total = items.length, checked = items.filter((i) => i.checked).length;
    const active = items.filter((i) => !i.checked), done = items.filter((i) => i.checked);
    const groups = {};
    active.forEach((it) => { const c = it.category || "Altro"; (groups[c] = groups[c] || []).push(it); });
    const orderedCats = getAisleOrder().filter((c) => groups[c]);
    const groupHtml = orderedCats.map((cat) => `<div class="super__group"><div class="super__cat">${escapeHtml(cat)}</div>${groups[cat].map(superRow).join("")}</div>`).join("");
    const doneHtml = done.length ? `<div class="super__group super__group--done"><div class="super__cat">Presi (${done.length})</div>${done.map(superRow).join("")}</div>` : "";
    const pct = total ? Math.round(checked / total * 100) : 0;
    el.innerHTML = `
      <div class="super__bar">
        <button class="super__close" id="suClose">${iconHtml("x")}</button>
        <div class="super__title">🛒 Spesa · ${checked}/${total}</div>
      </div>
      <div class="super__track"><div class="super__fill" style="width:${pct}%"></div></div>
      <div class="super__body">${total ? (groupHtml || `<div class="super__alldone">🎉 Tutto preso!</div>`) + doneHtml : `<div class="super__alldone">La lista è vuota.</div>`}</div>`;
    el.querySelector("#suClose").onclick = close;
    el.querySelectorAll(".super__item").forEach((row) => {
      row.onclick = () => {
        const it = store.getShopping().find((s) => s.id === row.dataset.id);
        if (!it) return;
        const willCheck = !it.checked;
        if (willCheck) haptic(12);
        store.toggleShoppingItem(it.id, willCheck); // il repaint avviene via subscribe (gestisce anche il cloud)
      };
    });
  }
  unsub = store.subscribe(() => paint()); // ridisegna quando i dati cambiano (anche da altri dispositivi)
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

let shopGroupBy = "aisle"; // "aisle" (reparto) | "recipe" (ricetta di origine)
let shopManual = false; // modalità "ordina a mano" (lista piatta riordinabile)
// Riga "spesa del mese" con barra del budget se impostato.
function budgetLineHtml() {
  const spent = currentMonthSpend();
  const budget = getBudget();
  if (spent <= 0 && !budget) return "";
  if (!budget) {
    return `<button class="shop-cost" id="spendLine" style="width:100%;text-align:left;cursor:pointer">${iconHtml("calendar-dots")} Spesa di questo mese (stima): <b>€ ${spent.toFixed(2)}</b><span class="shop-cost__note"> · tocca per budget e storico</span></button>`;
  }
  const pct = Math.min(100, Math.round((spent / budget) * 100));
  const over = spent > budget;
  const left = budget - spent;
  return `<button class="shop-cost budget-box ${over ? "is-over" : ""}" id="spendLine" style="width:100%;text-align:left;cursor:pointer">
      <div class="budget-box__top">${iconHtml("calendar-dots")} Budget del mese: <b>€ ${spent.toFixed(2)}</b> / € ${budget.toFixed(2)}</div>
      <div class="budget-bar"><span class="budget-bar__fill" style="width:${pct}%"></span></div>
      <div class="shop-cost__note">${over ? `Superato di € ${(-left).toFixed(2)}` : `Restano € ${left.toFixed(2)}`} · tocca per modificare</div>
    </button>`;
}

// Aggiungi spesa da testo incollato: una riga (o voce separata da virgola) = un articolo.
function openPasteShopping() {
  const m = openModal(`
    <h3 class="modal__title">📋 Incolla una lista</h3>
    <p class="hint" style="margin-top:-8px;margin-bottom:12px">Incolla o scrivi qui gli articoli: uno per riga (oppure separati da virgola). Es. <i>2 uova, latte, 500 g farina</i>.</p>
    <div class="field"><textarea id="pasteIn" rows="7" placeholder="2 uova&#10;latte&#10;500 g farina&#10;pane"></textarea></div>
    <div class="modal__actions"><button class="btn" data-act="cancel">Annulla</button><button class="btn btn--primary" data-act="ok">Aggiungi</button></div>
  `);
  setTimeout(() => m.el.querySelector("#pasteIn").focus(), 50);
  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  m.el.querySelector('[data-act="ok"]').onclick = async () => {
    const raw = (m.el.querySelector("#pasteIn").value || "").replace(/,/g, "\n");
    const parsed = parseList(raw).map((p) => ({ ...p, category: categorize(p.name) }));
    if (!parsed.length) { toast("Niente da aggiungere", "error"); return; }
    m.close();
    const res = await store.addShoppingItems(parsed);
    toast(res.added ? shoppingToast(res) : "Erano già tutti in dispensa", res.added ? "success" : "error");
  };
}

function renderShoppingList() {
  const wrap = root.querySelector("#spesaBody");
  const items = store.getShopping();
  const active = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  let body;
  if (!items.length) {
    body = `<div class="empty">${emptyArt("cart")}<div style="margin-top:6px">La lista è vuota.<br>Aggiungi gli ingredienti da una ricetta o scrivili qui sotto.</div></div>`;
  } else if (shopManual) {
    // Ordina a mano: lista piatta nell'ordine personalizzato, con frecce su/giù.
    const ord = store.shoppingActiveOrdered();
    const rows = ord.map((it, i) => {
      const qty = it.qty != null ? formatQty(it.qty) : "";
      const amount = [qty, it.unit && it.unit !== "q.b." ? it.unit : (it.unit === "q.b." ? "q.b." : "")].filter(Boolean).join(" ");
      return `<div class="shop-row shop-row--reorder" data-id="${it.id}">
        <span class="shop-row__name">${escapeHtml(it.name)}${amount ? ` <span class="shop-row__amt-txt">${escapeHtml(amount)}</span>` : ""}</span>
        <div class="tool-reorder">
          <button class="stepper__btn" data-up="${it.id}" ${i === 0 ? "disabled" : ""}>↑</button>
          <button class="stepper__btn" data-down="${it.id}" ${i === ord.length - 1 ? "disabled" : ""}>↓</button>
        </div>
      </div>`;
    }).join("");
    body = rows || `<div class="hint">Tutto preso! 🎉</div>`;
  } else {
    let groupsHtml;
    if (shopGroupBy === "recipe") {
      // Per ricetta: ogni articolo compare sotto le ricette che lo richiedono.
      const byRecipe = {};
      active.forEach((it) => {
        const froms = (it.from || "").split(",").map((x) => x.trim()).filter(Boolean);
        (froms.length ? froms : ["Aggiunti a mano"]).forEach((k) => { (byRecipe[k] = byRecipe[k] || []).push(it); });
      });
      const names = Object.keys(byRecipe).sort((a, b) => (a === "Aggiunti a mano" ? 1 : b === "Aggiunti a mano" ? -1 : a.localeCompare(b)));
      groupsHtml = names
        .map((name) => `
        <div class="shop-group">
          <div class="shop-group__title">${iconHtml("fork-knife")} ${escapeHtml(name)}</div>
          ${byRecipe[name].map(shopRow).join("")}
        </div>`)
        .join("");
    } else {
      const groups = {};
      active.forEach((it) => { const c = it.category || "Altro"; (groups[c] = groups[c] || []).push(it); });
      const orderedCats = getAisleOrder().filter((c) => groups[c]);
      groupsHtml = orderedCats
        .map((cat) => `
        <div class="shop-group">
          <div class="shop-group__title">${escapeHtml(cat)}</div>
          ${groups[cat].map(shopRow).join("")}
        </div>`)
        .join("");
    }
    const doneHtml = done.length
      ? `<div class="shop-group shop-group--done">
          <div class="shop-group__title">Presi (${done.length})</div>
          ${done.map(shopRow).join("")}
        </div>`
      : "";
    body = (groupsHtml || `<div class="hint">Tutto preso! 🎉</div>`) + doneHtml;
  }

  wrap.innerHTML = `
    ${getHousehold() ? `<button class="house-banner" id="houseBanner">👥 <span>Lista condivisa · <b>${escapeHtml(getHousehold())}</b></span></button>` : ""}
    <div class="search-bar">
      <input type="text" id="shopAdd" placeholder="Aggiungi un articolo..." />
      <button class="btn" id="shopPasteBtn" title="Incolla una lista">📋</button>
      <button class="btn btn--primary" id="shopAddBtn">${iconHtml("plus")}</button>
    </div>
    ${shopManual ? `<div class="hint" style="margin-bottom:8px">Usa le frecce per ordinare. Tocca "Fine" per tornare alla lista.</div>` : ""}
    ${active.length && !shopManual ? `<button class="btn btn--primary btn--block" id="superMode" style="margin:10px 0">🛒 Modalità supermercato</button>` : ""}
    <div id="shopBody">${body}</div>
    ${(() => { const c = estimateCost(active); return c.counted ? `<div class="shop-cost">${iconHtml("basket")} Costo stimato del carrello: <b>€ ${c.total.toFixed(2)}</b><span class="shop-cost__note"> · stima su ${c.counted} articoli</span></div>` : ""; })()}
    ${budgetLineHtml()}
    ${done.length ? `<button class="btn btn--primary btn--block" id="toPantry" style="margin-top:18px">${iconHtml("basket")} Spesa fatta: presi in dispensa</button>` : ""}
    ${items.length ? `<div style="display:flex;gap:8px;margin-top:${done.length ? "8px" : "18px"};flex-wrap:wrap">
      <button class="btn btn--ghost" id="shopShare">${iconHtml("arrow-square-out")} Invia lista</button>
      <button class="btn btn--ghost" id="groupByBtn">${iconHtml("book-open")} ${shopGroupBy === "recipe" ? "Per reparto" : "Per ricetta"}</button>
      <button class="btn btn--ghost" id="reorderBtn">⇅ ${shopManual ? "Fine ordina" : "Ordina a mano"}</button>
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

  wrap.querySelectorAll(".shop-row:not(.shop-row--reorder)").forEach((rowEl) => {
    const id = rowEl.dataset.id;
    const toggle = () => {
      const it = store.getShopping().find((s) => s.id === id);
      const willCheck = !(it && it.checked);
      lastShopToggled = willCheck ? id : null; // anima solo quando si spunta
      if (willCheck) haptic(10);
      store.toggleShoppingItem(id, willCheck);
    };
    const chk = rowEl.querySelector('[data-act="check"]');
    if (chk) chk.addEventListener("click", toggle);
    const nameEl = rowEl.querySelector('[data-act="toggle"]');
    if (nameEl) nameEl.addEventListener("click", toggle); // tap sul nome = spunta rapida
    const qtyEl = rowEl.querySelector('[data-act="qty"]');
    if (qtyEl) qtyEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const it = store.getShopping().find((s) => s.id === id);
      if (it) editShoppingQty(it);
    });
    const delEl = rowEl.querySelector('[data-act="del"]');
    if (delEl) delEl.addEventListener("click", (e) => { e.stopPropagation(); store.deleteShoppingItem(id); });
  });
  // Frecce di riordino (modalità "ordina a mano").
  wrap.querySelectorAll("[data-up]").forEach((b) => b.addEventListener("click", () => store.moveShoppingItem(b.dataset.up, -1)));
  wrap.querySelectorAll("[data-down]").forEach((b) => b.addEventListener("click", () => store.moveShoppingItem(b.dataset.down, 1)));
  const rb = wrap.querySelector("#reorderBtn");
  if (rb) rb.addEventListener("click", () => { shopManual = !shopManual; renderShoppingList(); });
  const sm = wrap.querySelector("#superMode");
  if (sm) sm.addEventListener("click", () => openSupermarketMode());
  const pasteBtn = wrap.querySelector("#shopPasteBtn");
  if (pasteBtn) pasteBtn.addEventListener("click", openPasteShopping);
  const houseBanner = wrap.querySelector("#houseBanner");
  if (houseBanner) houseBanner.addEventListener("click", openHouseholdSheet);

  const tp = wrap.querySelector("#toPantry");
  if (tp) tp.addEventListener("click", () => {
    const done = store.getShopping().filter((s) => s.checked);
    const c = estimateCost(done); if (c.counted) addSpend(c.total);
    openPutInPantry(done);
  });
  const sp = wrap.querySelector("#spendLine");
  if (sp) sp.addEventListener("click", openSpendHistory);
  const cd = wrap.querySelector("#clearDone");
  if (cd) cd.addEventListener("click", () => store.clearCheckedShopping());
  const ca = wrap.querySelector("#clearAll");
  if (ca) ca.addEventListener("click", async () => {
    const ok = await confirmDialog({ title: "Svuotare la lista?", message: "Tutti gli articoli verranno rimossi.", confirmText: "Svuota", danger: true });
    if (ok) store.clearAllShopping();
  });
  const ab = wrap.querySelector("#aisleBtn");
  if (ab) ab.addEventListener("click", openAisleOrder);
  const gb = wrap.querySelector("#groupByBtn");
  if (gb) gb.addEventListener("click", () => { shopGroupBy = shopGroupBy === "recipe" ? "aisle" : "recipe"; renderShoppingList(); });

  const shareBtn = wrap.querySelector("#shopShare");
  if (shareBtn) shareBtn.addEventListener("click", async () => {
    const list = store.getShopping().filter((i) => !i.checked);
    if (!list.length) { toast("La lista è vuota", "error"); return; }
    const lines = ["🛒 Lista della spesa"];
    const groups = {};
    list.forEach((it) => { const c = it.category || "Altro"; (groups[c] = groups[c] || []).push(it); });
    for (const cat of getAisleOrder().filter((c) => groups[c])) {
      lines.push("", cat + ":");
      for (const it of groups[cat]) {
        const qty = it.qty != null ? formatQty(it.qty) : "";
        const amt = [qty, it.unit && it.unit !== "q.b." ? it.unit : (it.unit === "q.b." ? "q.b." : "")].filter(Boolean).join(" ");
        lines.push("- " + it.name + (amt ? ` (${amt})` : ""));
      }
    }
    lines.push("", "— da Fornelli");
    const text = lines.join("\n");
    try {
      if (navigator.share) await navigator.share({ title: "Lista della spesa", text });
      else { await navigator.clipboard.writeText(text); toast("Lista copiata negli appunti", "success"); }
    } catch (e) { /* condivisione annullata */ }
  });
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
    <button class="pan-star ${p.base ? "is-on" : ""}" data-act="base" title="${p.base ? "Scorta di base (avvisa quando finisce)" : "Segna come scorta sempre in casa"}">${p.base ? "⭐" : "☆"}</button>
    <span class="shop-row__name">${escapeHtml(p.name)}</span>
    <button class="shop-row__amt" data-act="qty" title="Quantità">${p.qty ? escapeHtml(p.qty) : iconHtml("pencil-simple")}</button>
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
    : `<div class="empty">${emptyArt("jar")}<div style="margin-top:6px">Dispensa vuota.<br>Aggiungi ciò che hai già in casa: non verrà inserito nella spesa.</div></div>`;

  wrap.innerHTML = `
    <div class="hint" style="margin-bottom:10px">Quello che metti qui non verrà aggiunto alla lista della spesa. La data di scadenza è facoltativa. Tocca la ⭐ per segnare una <b>scorta di base</b>: quando la elimini (finita) torna subito nella spesa.</div>
    <button class="btn btn--primary btn--block" id="cookSuggest" style="margin-bottom:10px">${iconHtml("fork-knife")} Cosa posso cucinare con questi?</button>
    <button class="btn btn--block" id="useItUp" style="margin-bottom:10px">♻️ Svuota il frigo (scegli gli avanzi)</button>
    <button class="btn btn--block" id="freezerBtn" style="margin-bottom:10px">🧊 Congelatore${(() => { const n = store.getFreezer().length; return n ? ` · ${n}` : ""; })()}</button>
    ${isImportConfigured() ? `<button class="btn btn--block" id="fridgePhoto" style="margin-bottom:10px">🧊 Fotografa il frigo (l'AI riconosce gli alimenti)</button><input type="file" id="fridgeFile" accept="image/*" capture="environment" hidden />` : ""}
    ${isImportConfigured() ? `<button class="btn btn--block" id="receiptScan" style="margin-bottom:14px">🧾 Scansiona lo scontrino</button><input type="file" id="receiptFile" accept="image/*" capture="environment" hidden />` : ""}
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
  wrap.querySelector("#useItUp").addEventListener("click", openUseItUp);
  wrap.querySelector("#freezerBtn").addEventListener("click", openFreezerList);
  const fridgePhoto = wrap.querySelector("#fridgePhoto");
  const fridgeFile = wrap.querySelector("#fridgeFile");
  if (fridgePhoto) fridgePhoto.addEventListener("click", () => fridgeFile.click());
  if (fridgeFile) fridgeFile.addEventListener("change", () => { const f = fridgeFile.files[0]; fridgeFile.value = ""; if (f) openFridgePhoto(f); });
  const receiptScan = wrap.querySelector("#receiptScan");
  const receiptFile = wrap.querySelector("#receiptFile");
  if (receiptScan) receiptScan.addEventListener("click", () => receiptFile.click());
  if (receiptFile) receiptFile.addEventListener("change", () => { const f = receiptFile.files[0]; receiptFile.value = ""; if (f) openReceiptScan(f); });
  const scanBtn = wrap.querySelector("#panScan");
  if (scanBtn) scanBtn.addEventListener("click", openBarcodeScanner);
  wrap.querySelectorAll(".shop-row").forEach((rowEl) => {
    const id = rowEl.dataset.id;
    rowEl.querySelector('[data-act="del"]').addEventListener("click", async () => {
      const p = store.getPantry().find((x) => x.id === id);
      await store.deletePantryItem(id);
      // Scorta di base finita: la rimetto subito in lista della spesa.
      if (p && p.base) {
        await store.addShoppingItems([{ name: p.name, category: categorize(p.name), from: "Scorte" }]);
        toast(`"${p.name}" è finita: aggiunta alla spesa`, "success");
      }
    });
    const star = rowEl.querySelector('[data-act="base"]');
    if (star) star.addEventListener("click", () => {
      const p = store.getPantry().find((x) => x.id === id);
      store.setPantryBase(id, !(p && p.base));
    });
    const qb = rowEl.querySelector('[data-act="qty"]');
    if (qb) qb.addEventListener("click", () => {
      const p = store.getPantry().find((x) => x.id === id);
      openPrompt("Quantità", "Es. 2 kg, 1 confezione…", (val) => store.setPantryQty(id, val), p && p.qty ? p.qty : "");
    });
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
  const fmtMiss = (miss) => {
    if (!miss.length) return `<span class="miss-line miss-line--ok">✓ hai tutto</span>`;
    const clean = [...new Set(miss.map(cleanIngName).filter(Boolean))];
    const show = clean.slice(0, 3).map(escapeHtml).join(", ");
    const more = clean.length > 3 ? ` +${clean.length - 3}` : "";
    return `<span class="miss-line">ti manca${clean.length === 1 ? "" : "no"}: ${show}${more}</span>`;
  };
  const rows = list.map(({ recipe, have, total, missing }) => {
    const tool = store.getTool(recipe.toolId);
    const addBtn = missing.length
      ? `<button class="btn btn--ghost cks-add" data-id="${recipe.id}" title="Aggiungi alla spesa ciò che manca">${iconHtml("shopping-cart-simple")}</button>`
      : "";
    return `<div class="cks-row">
      <button class="pick-row cks-pick" data-id="${recipe.id}">
        <span class="day-row__icon">${tool ? iconHtml(tool.icon) : iconHtml("fork-knife")}</span>
        <span class="day-row__name">${escapeHtml(recipe.title)}
          <span class="have-badge">${have}/${total} ingredienti</span>
          ${fmtMiss(missing)}
        </span>
      </button>
      ${addBtn}
    </div>`;
  }).join("");
  const body = list.length
    ? `<p class="hint" style="margin-top:-6px">Le ricette più vicine ad essere pronte, in cima. ${iconHtml("shopping-cart-simple")} aggiunge alla spesa ciò che manca.</p><div class="cks-list">${rows}</div>`
    : `<div class="empty"><span class="empty__emoji">${iconHtml("fork-knife")}</span>Nessun suggerimento.<br>Aggiungi alimenti in dispensa e ricette con ingredienti, poi riprova.</div>`;
  const leftover = `<div class="cks-leftover">
    <div class="cks-leftover__t">♻️ Hai un avanzo da smaltire?</div>
    <div class="search-bar" style="margin-top:6px">
      <input type="text" id="ckLeft" placeholder="Es. pollo cotto, riso avanzato..." />
      <button class="btn btn--primary" id="ckLeftGo">${iconHtml("magnifying-glass")}</button>
    </div>
    <div class="hint" style="margin-top:6px">Cerca tra le tue ricette quelle che lo usano.</div>
  </div>`;
  const m = openModal(`<h3 class="modal__title">🧹 Svuota la dispensa</h3>${body}${leftover}`);
  m.el.querySelectorAll(".cks-pick").forEach((b) => b.addEventListener("click", () => { m.close(); openRecipe(b.dataset.id); }));
  m.el.querySelectorAll(".cks-add").forEach((b) => b.addEventListener("click", async (e) => {
    e.stopPropagation();
    const rec = store.getRecipe(b.dataset.id);
    if (!rec) return;
    const miss = (rec.ingredients || []).filter((it) => it.name && !store.inPantry(it.name));
    if (!miss.length) { toast("Hai già tutto in dispensa", "success"); return; }
    const items = miss.map((it) => ({ name: it.name, category: categorize(it.name), from: rec.title }));
    const res = await store.addShoppingItems(items);
    toast(shoppingToast(res), "success");
  }));
  const goLeft = () => {
    const v = m.el.querySelector("#ckLeft").value.trim();
    if (!v) return;
    m.close();
    // navigate() azzererebbe la ricerca: cambio route a mano e imposto homeQuery.
    currentRoute = "strumenti"; currentToolId = null; currentRecipeId = null;
    homeQuery = v; homeFilter = "";
    document.querySelectorAll(".bottom-nav__btn").forEach((b) => b.classList.toggle("is-active", b.dataset.route === "strumenti"));
    renderStrumenti();
    const sb = root.querySelector("#homeSearch");
    if (sb) { try { sb.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {} }
  };
  m.el.querySelector("#ckLeftGo").addEventListener("click", goLeft);
  m.el.querySelector("#ckLeft").addEventListener("keydown", (e) => { if (e.key === "Enter") goLeft(); });
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

// Dagli ingredienti di una ricetta ricava le preparazioni da fare in anticipo
// (scongelare, ammollo, tirare fuori dal frigo). Lista di {type, item}.
function detectPrepAhead(recipe) {
  const out = [];
  const seen = new Set();
  const dolci = (recipe.tags || []).some((t) => /dolc/i.test(t)) || /dolc|torta|crostata|tiramis/i.test(recipe.title || "");
  for (const it of (recipe.ingredients || [])) {
    const n = (it.name || "").toLowerCase();
    if (!n) continue;
    let type = null;
    if (/surgelat|congelat/.test(n)) type = "scongela";
    else if (/\b(gamber|scampi|pesce|merluzz|salmon|calamar|sepp|vongol|cozze|baccal|polpo|pollo|tacchin|carne|manzo|maiale|vitello|spezzatin|hamburger|macinat|coniglio|agnello)\b/.test(n)) type = "scongela";
    else if (/\b(ceci|fagioli|cannellini|borlotti|cicerchie)\b/.test(n) || (/secch/.test(n) && /(ceci|fagioli|legumi|cannellini|borlotti|lenticch)/.test(n))) type = "ammollo";
    else if (dolci && /\b(burro|uova|uovo)\b/.test(n)) type = "frigo";
    if (type) {
      const item = cleanIngName(it.name) || it.name;
      const key = type + "|" + item;
      if (item && !seen.has(key)) { seen.add(key); out.push({ type, item }); }
    }
  }
  return out;
}
const PREP_AHEAD_LBL = { scongela: "❄️ Scongela (se surgelato)", ammollo: "💧 Metti in ammollo", frigo: "🧈 Tira fuori dal frigo" };

// "Promemoria intelligenti": guarda i prossimi giorni del Piano e propone le
// preparazioni da fare in anticipo, con promemoria la sera prima.
function openPrepAheadPlan() {
  const today = new Date();
  let html = "", any = false;
  for (let i = 1; i <= 3; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const ds = ymd(d.getFullYear(), d.getMonth(), d.getDate());
    const tips = [];
    for (const e of store.getPlanByDate(ds)) {
      const r = store.getRecipe(e.recipeId); if (!r) continue;
      for (const t of detectPrepAhead(r)) tips.push({ ...t, dish: r.title });
    }
    if (!tips.length) continue;
    any = true;
    html += `<div class="ev-phase"><div class="ev-phase__t">📅 ${WEEKDAYS_IT[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS_IT[d.getMonth()].slice(0, 3).toLowerCase()}</div>
      ${tips.map((t) => `<div class="ev-task"><span>${PREP_AHEAD_LBL[t.type]}: <b>${escapeHtml(t.item)}</b> <span class="ev-task__d">(per ${escapeHtml(t.dish)})</span></span></div>`).join("")}
      <button class="btn btn--ghost btn--block" data-remind="${ds}" style="margin-top:6px">🔔 Ricordamelo la sera prima</button></div>`;
  }
  const m = openModal(`<h3 class="modal__title">🧠 Da preparare in anticipo</h3>${any ? `<p class="hint" style="margin-top:-6px">In base a cosa hai pianificato nei prossimi giorni.</p>${html}` : `<div class="hint">Niente da preparare in anticipo per i prossimi 3 giorni. Pianifica delle ricette nel Piano e ricontrolla.</div>`}<div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>`);
  m.el.querySelector('[data-act="ok"]').onclick = m.close;
  m.el.querySelectorAll("[data-remind]").forEach((b) => b.addEventListener("click", () => {
    const ds = b.dataset.remind;
    const [y, mo, da] = ds.split("-").map(Number);
    const due = new Date(y, mo - 1, da - 1, 19, 0, 0, 0).getTime();
    const items = [];
    for (const e of store.getPlanByDate(ds)) { const r = store.getRecipe(e.recipeId); if (r) for (const t of detectPrepAhead(r)) items.push(t.item); }
    if (due <= Date.now() || !items.length) { toast("Niente da ricordare (è già passata la sera prima?)", "error"); return; }
    const list = getPrepReminders().filter((x) => !((x.recipeId || "") + "").startsWith("prep:" + ds));
    list.push({ recipeId: "prep:" + ds, title: `Prepara per domani: ${[...new Set(items)].slice(0, 5).join(", ")}`, due });
    setPrepReminders(list);
    try { if (window.Notification && Notification.permission === "default") Notification.requestPermission(); } catch (e) {}
    toast("Promemoria impostato per la sera prima (19:00)", "success");
  }));
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
    const fest = eventsOnDate(ds).length;
    cells += `<button class="cal-cell ${ds === tStr ? "is-today" : ""} ${count ? "has-plan" : ""} ${fest ? "has-fest" : ""}" data-date="${ds}">
      <span class="cal-day">${day}</span>
      ${fest ? `<span class="cal-fest">🎉</span>` : (count ? `<span class="cal-dot">${count > 1 ? count : ""}</span>` : "")}
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
    ${upcomingEventsHtml()}
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
  wireUpcomingEvents();
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
          const slot = e.slot ? `<b>${SLOT_SHORT[e.slot] || ""}</b> ` : "";
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
    ${upcomingEventsHtml()}
    ${(() => {
      const weekEntries = days.flatMap((d) => store.getPlanByDate(ymd(d.getFullYear(), d.getMonth(), d.getDate())));
      const wn = dayNutrition(weekEntries);
      if (!wn.counted) return "";
      return `<button class="nutri-box nutri-box--tap" id="weekNutriBox" style="margin-top:16px">
        <div class="nutri-row"><span class="nutri-lbl">${iconHtml("carrot")} Settimana (stima)</span><span class="nutri-val"><b>${wn.kcal}</b> kcal · P ${wn.p} · C ${wn.c} · G ${wn.f}</span></div>
        <div class="nutri-row"><span class="nutri-lbl">Media al giorno · tocca per il bilancio</span><span class="nutri-val">${Math.round(wn.kcal / 7)} kcal ${iconHtml("caret-right")}</span></div>
      </button>${wn.counted < wn.total ? `<div class="hint" style="margin-top:4px">${wn.total - wn.counted} pasti senza valori (calcolali nelle ricette).</div>` : ""}`;
    })()}
    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
      <button class="btn btn--ghost" id="weekToday">Oggi</button>
      ${isImportConfigured() ? `<button class="btn btn--primary" id="aiWeek">✨ Menù AI</button>` : ""}
      <button class="btn btn--ghost" id="genWeek">${iconHtml("sparkle")} Menù settimana</button>
      <button class="btn btn--ghost" id="fillWeek">${iconHtml("sparkle")} Riempi le cene</button>
      <button class="btn btn--ghost" id="weekShop">${iconHtml("shopping-cart-simple")} Spesa settimana</button>
      <button class="btn btn--ghost" id="prepAhead">🧠 Prepara in anticipo</button>
      <button class="btn btn--ghost" id="coordDishes">🕐 Coordina i piatti</button>
      <button class="btn btn--ghost" id="weekShare">${iconHtml("image")} Condividi il menù</button>
    </div>
  `;

  root.querySelectorAll("[data-pv]").forEach((b) => b.addEventListener("click", () => { planView = b.dataset.pv; render(); }));
  root.querySelector("#prevW").addEventListener("click", () => { const a = new Date(start); a.setDate(a.getDate() - 7); weekAnchor = a; render(); });
  root.querySelector("#nextW").addEventListener("click", () => { const a = new Date(start); a.setDate(a.getDate() + 7); weekAnchor = a; render(); });
  root.querySelector("#weekToday").addEventListener("click", () => { weekAnchor = startOfWeek(new Date()); render(); });
  const wnBox = root.querySelector("#weekNutriBox");
  if (wnBox) wnBox.addEventListener("click", () => openWeekNutrition(days));
  root.querySelector("#prepAhead").addEventListener("click", () => openPrepAheadPlan());
  root.querySelector("#coordDishes").addEventListener("click", () => openCookTimeline([]));
  root.querySelectorAll(".week-day__h").forEach((b) => b.addEventListener("click", () => openDaySheet(b.dataset.date)));
  root.querySelectorAll(".week-meal").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); if (b.dataset.recipe) openRecipe(b.dataset.recipe); }));
  wireUpcomingEvents();

  const aiWeek = root.querySelector("#aiWeek");
  if (aiWeek) aiWeek.addEventListener("click", () => openWeekPlanner(days));
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

  root.querySelector("#weekShare").addEventListener("click", async () => {
    const data = days.map((d, i) => {
      const ds = ymd(d.getFullYear(), d.getMonth(), d.getDate());
      const meals = store.getPlanByDate(ds)
        .map((e) => { const rr = store.getRecipe(e.recipeId); return rr ? rr.title : null; })
        .filter(Boolean);
      return { day: `${WEEKDAYS_IT[i]} ${d.getDate()}`, meals };
    });
    if (!data.some((d) => d.meals.length)) { toast("Pianifica qualche pasto prima di condividere", "error"); return; }
    try { const res = await shareMenuImage(range, data); if (res === "downloaded") toast("Immagine del menù salvata", "success"); }
    catch (e) { toast("Impossibile creare l'immagine", "error"); }
  });

  // Menù settimana smart: riempie le cene vuote pescando dai preferiti (poi da
  // tutte), senza ripetere, dando priorità alle ricette che usano gli alimenti
  // in scadenza (anti-spreco) e variando strumento/categoria di giorno in giorno.
  // Poi genera la spesa della settimana.
  root.querySelector("#genWeek").addEventListener("click", async () => {
    const recipes = allRecipes();
    if (!recipes.length) { toast("Aggiungi prima qualche ricetta", "error"); return; }
    const favs = recipes.filter((r) => r.favorite);
    const base = favs.length >= 3 ? favs : recipes;
    let expSet = new Set();
    try { expSet = new Set(store.recipesForExpiring(3).map((r) => r.id)); } catch (e) { /* niente dispensa */ }
    const used = new Set();
    let added = 0, antiWaste = 0;
    let prevTool = null, prevTag = null;
    for (const d of days) {
      const ds = ymd(d.getFullYear(), d.getMonth(), d.getDate());
      if (store.getPlanByDate(ds).some((e) => e.slot === "cena")) continue;
      let cand = base.filter((r) => !used.has(r.id));
      if (!cand.length) { used.clear(); cand = base.slice(); }
      // Anti-spreco: se ci sono candidati che usano alimenti in scadenza, scegli tra quelli.
      const expCand = cand.filter((r) => expSet.has(r.id));
      let pool = expCand.length ? expCand : cand;
      // Varietà: evita stesso strumento/categoria del giorno precedente, se possibile.
      const varied = pool.filter((r) => r.toolId !== prevTool && !((r.tags || []).includes(prevTag)));
      if (varied.length) pool = varied;
      const r = pool[Math.floor(Math.random() * pool.length)];
      used.add(r.id);
      if (expSet.has(r.id)) antiWaste++;
      prevTool = r.toolId; prevTag = (r.tags || [])[0] || null;
      await store.addPlan(ds, r.id, "cena");
      added++;
    }
    if (!added) { toast("Le cene sono già pianificate", ""); return; }
    const set = new Set(days.map((d) => ymd(d.getFullYear(), d.getMonth(), d.getDate())));
    const entries = store.getPlan().filter((p) => set.has(p.date));
    const res = await store.addShoppingItems(collectIngredients(entries));
    toast(`Menù creato: ${added} cene${antiWaste ? ` · ${antiWaste} anti-spreco` : ""} · ${shoppingToast(res)}`, "success");
  });
}

function collectIngredients(entries) {
  const items = [];
  for (const e of entries) {
    const r = store.getRecipe(e.recipeId);
    if (r && Array.isArray(r.ingredients)) {
      for (const it of r.ingredients) {
        items.push({ name: it.name, unit: it.unit || "", qty: it.qty != null ? it.qty : null, category: categorize(it.name), from: r.title });
      }
    }
  }
  return items;
}

const SLOTS = [{ key: "colazione", label: "Colazione", icon: "coffee" }, { key: "pranzo", label: "Pranzo", icon: "sparkle" }, { key: "spuntino", label: "Spuntino", icon: "cookie" }, { key: "cena", label: "Cena", icon: "sparkle" }, { key: null, label: "Altro", icon: "fork-knife" }];
const SLOT_LABEL = { colazione: "Colazione", pranzo: "Pranzo", spuntino: "Spuntino", cena: "Cena" };
const SLOT_SHORT = { colazione: "Col", pranzo: "Pr", spuntino: "Sp", cena: "Ce" };

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

// Bilancio nutrizionale della settimana: barre per giorno, ripartizione dei
// macronutrienti e un giudizio sull'equilibrio (stima per porzione, dai pasti
// pianificati che hanno i valori nutrizionali calcolati).
function openWeekNutrition(days) {
  const perDay = days.map((d, i) => {
    const ds = ymd(d.getFullYear(), d.getMonth(), d.getDate());
    return { wd: WEEKDAYS_IT[i], day: d.getDate(), n: dayNutrition(store.getPlanByDate(ds)) };
  });
  const wk = perDay.reduce((s, x) => { s.kcal += x.n.kcal; s.p += x.n.p; s.c += x.n.c; s.f += x.n.f; s.counted += x.n.counted; s.total += x.n.total; return s; }, { kcal: 0, p: 0, c: 0, f: 0, counted: 0, total: 0 });
  if (!wk.counted) { toast("Nessun pasto con valori nutrizionali: apri le ricette per calcolarli", "error"); return; }
  const pK = wk.p * 4, cK = wk.c * 4, fK = wk.f * 9, mt = Math.max(1, pK + cK + fK);
  const pPct = Math.round(pK / mt * 100), cPct = Math.round(cK / mt * 100), fPct = Math.max(0, 100 - pPct - cPct);
  const ok = pPct >= 15 && pPct <= 28 && cPct >= 42 && cPct <= 62 && fPct >= 20 && fPct <= 38;
  const verdict = ok ? "Settimana equilibrata 🟢" : "Settimana un po' sbilanciata 🟡";
  const tip = ok ? "Bel mix di proteine, carboidrati e grassi." : (pPct < 15 ? "Poche proteine: aggiungi carne, pesce, uova o legumi." : (fPct > 38 ? "Grassi un po' alti: alleggerisci i condimenti." : (cPct > 62 ? "Tanti carboidrati: bilancia con proteine e verdure." : "Prova a variare un po' i piatti.")));
  const maxK = Math.max(1, ...perDay.map((x) => x.n.kcal));
  const bars = perDay.map((x) => `<div class="bar-col"><span class="bar-n">${x.n.kcal || ""}</span><div class="bar" style="height:${Math.round((x.n.kcal / maxK) * 66) + 3}px"></div><span class="bar-lbl">${x.wd.slice(0, 1)}</span></div>`).join("");
  const { el } = openModal(`
    <h3 class="modal__title">🥗 Bilancio della settimana</h3>
    <p class="hint" style="margin-top:-6px">Stima per porzione, sui pasti pianificati</p>
    <div class="wn-scroll">
      <div class="wn-top">
        <div class="wn-big"><b data-countup="${wk.kcal}">0</b><span>kcal in 7 giorni</span></div>
        <div class="wn-avg"><b data-countup="${Math.round(wk.kcal / 7)}">0</b><span>media al giorno</span></div>
      </div>
      <div class="stat-block"><div class="stat-block__t">Calorie per giorno</div><div class="bar-chart">${bars}</div></div>
      <div class="stat-block"><div class="stat-block__t">Ripartizione dei macronutrienti</div>
        <div class="macrobar"><span class="macroseg macroseg--p" style="width:${pPct}%"></span><span class="macroseg macroseg--c" style="width:${cPct}%"></span><span class="macroseg macroseg--f" style="width:${fPct}%"></span></div>
        <div class="macrolegend">
          <span><i class="mdot mdot--p"></i> Proteine ${pPct}% · ${wk.p} g</span>
          <span><i class="mdot mdot--c"></i> Carboidrati ${cPct}% · ${wk.c} g</span>
          <span><i class="mdot mdot--f"></i> Grassi ${fPct}% · ${wk.f} g</span>
        </div>
      </div>
      <div class="wn-verdict ${ok ? "is-ok" : "is-warn"}"><div class="wn-verdict__t">${verdict}</div><div class="wn-verdict__d">${tip}</div></div>
      ${wk.counted < wk.total ? `<div class="hint" style="margin-top:8px">${wk.total - wk.counted} pasti senza valori: apri quelle ricette per calcolarli e affinare la stima.</div>` : ""}
    </div>
    <button class="btn btn--block" id="wnClose">Chiudi</button>`);
  el.querySelector("#wnClose").onclick = closeAllModals;
  animateCountUps(el);
  requestAnimationFrame(() => el.querySelectorAll(".macroseg").forEach((s) => { s.style.transform = "scaleX(1)"; }));
}

// "Tutto pronto alle…": calcola a ritroso quando iniziare ogni piatto perché
// siano pronti tutti alla stessa ora. `initial` = array di ricette (o {title,time}).
// "Che voglia hai?": filtri per umore/occasione sulle proprie ricette.
const moodText = (r) => ((r.title || "") + " " + (r.ingredients || []).map((i) => i.name || "").join(" ") + " " + (r.tags || []).join(" ")).toLowerCase();
const MOODS = [
  { key: "comfort", emoji: "🤗", label: "Comfort food", match: (r, t) => /lasagn|al forno|polpett|risott|zuppa|gratin|parmigian|gnocch|pur[eè]|brasat|stufat|carbonara|amatrician|cannellon|tortellin|fonduta|raclette/.test(t) },
  { key: "leggero", emoji: "🥗", label: "Leggero", match: (r, t) => /insalat|verdur|vapore|light|zucchin|finocch|minestr|petto di pollo|legumi|orata|branzin|merluzz|cetriol|misticanz/.test(t) },
  { key: "veloce", emoji: "⚡", label: "Veloce", match: (r) => r.time && r.time <= 20 },
  { key: "ospiti", emoji: "🍷", label: "Per ospiti", match: (r) => r.favorite || (r.difficulty || 0) >= 2 },
  { key: "bambini", emoji: "🧒", label: "Per bambini", match: (r, t) => /pizza|polpett|patat|crocchett|nugget|al pomodoro|frittat|cotolett|hamburger|gnocch|pancake|crepe|nutella|wurstel|bastoncini|sofficini/.test(t) },
  { key: "dolce", emoji: "🍰", label: "Voglia di dolce", match: (r, t) => eventCourseOf(r) === "Dolci" || /dolc|torta|crostat|biscott|tiramis|budino|gelato|muffin|cheesecake|semifreddo|crema pasticc|panna cott|cioccolat|crepe alla nutella/.test(t) }
];
function openMoodPicker(initial) {
  const all = allRecipes();
  const m = openModal(`<h3 class="modal__title">😋 Che voglia hai?</h3>
    <div class="diet-chips" id="moodChips" style="margin-bottom:12px">${MOODS.map((x) => `<button type="button" class="diet-chip" data-mood="${x.key}">${x.emoji} ${x.label}</button>`).join("")}</div>
    <div id="moodBody"></div>`);
  const month = currentMonth();
  function draw(key) {
    const mo = MOODS.find((x) => x.key === key) || MOODS[0];
    const list = all.filter((r) => { try { return mo.match(r, moodText(r)); } catch (e) { return false; } });
    list.sort((a, b) => ((b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)) || ((recipeSeasonalMatches(b, month).length ? 1 : 0) - (recipeSeasonalMatches(a, month).length ? 1 : 0)) || (b.cookCount || 0) - (a.cookCount || 0));
    const body = list.length
      ? list.slice(0, 15).map((r) => { const tool = store.getTool(r.toolId); return `<button class="pick-row mood-pick" data-id="${r.id}"><span class="day-row__icon">${tool ? iconHtml(tool.icon) : iconHtml("fork-knife")}</span><span class="day-row__name">${escapeHtml(r.title)}${r.favorite ? ` <span class="meta-fav">${iconHtml("heart")}</span>` : ""}</span></button>`; }).join("")
      : `<div class="hint">Nessuna ricetta per questa voglia. Aggiungine qualcuna o prova un'altra categoria.</div>`;
    m.el.querySelector("#moodBody").innerHTML = body;
    m.el.querySelectorAll(".mood-pick").forEach((b) => b.addEventListener("click", () => { m.close(); openRecipe(b.dataset.id); }));
    m.el.querySelectorAll(".diet-chip[data-mood]").forEach((b) => b.classList.toggle("is-on", b.dataset.mood === key));
  }
  m.el.querySelectorAll(".diet-chip[data-mood]").forEach((b) => b.addEventListener("click", () => draw(b.dataset.mood)));
  draw(initial || MOODS[0].key);
}

// "Completa il pasto": dalla ricetta aperta propone abbinamenti dal ricettario
// per le altre portate (di stagione e preferiti in cima).
function openCompleteMeal(r) {
  const month = currentMonth();
  const ownCourse = eventCourseOf(r);
  const order = ["Antipasti", "Primi", "Secondi", "Contorni", "Dolci"].filter((c) => c !== ownCourse);
  const all = allRecipes();
  let html = "";
  for (const course of order) {
    const cands = all.filter((x) => x.id !== r.id && eventCourseOf(x) === course)
      .map((x) => { let s = 0; if (recipeSeasonalMatches(x, month).length) s += 30; if (x.favorite) s += 20; s += (x.cookCount || 0); s += Math.random() * 8; return { x, s }; })
      .sort((a, b) => b.s - a.s).slice(0, 2).map((o) => o.x);
    if (!cands.length) continue;
    html += `<div class="cm-course"><div class="cm-course__t">${course}</div>${cands.map((x) => {
      const tool = store.getTool(x.toolId);
      const seas = recipeSeasonalMatches(x, month).length ? ` <span class="ev-chip ev-chip--season">di stagione</span>` : "";
      return `<button class="pick-row cm-pick" data-id="${x.id}"><span class="day-row__icon">${tool ? iconHtml(tool.icon) : iconHtml("fork-knife")}</span><span class="day-row__name">${escapeHtml(x.title)}${seas}</span></button>`;
    }).join("")}</div>`;
  }
  const body = html || `<div class="hint">Aggiungi altre ricette (primi, contorni, dolci…) al tuo ricettario per comporre un menu completo.</div>`;
  const m = openModal(`<h3 class="modal__title">🍽️ Completa il pasto</h3><p class="hint" style="margin-top:-6px">Per <b>${escapeHtml(r.title)}</b>${ownCourse ? ` (${escapeHtml(ownCourse.toLowerCase())})` : ""}, ecco cosa abbinare dal tuo ricettario:</p>${body}<div class="modal__actions">${html ? `<button class="btn" data-act="shuffle">↻ Altre idee</button>` : ""}<button class="btn btn--primary" data-act="ok">Chiudi</button></div>`);
  m.el.querySelector('[data-act="ok"]').onclick = m.close;
  const sh = m.el.querySelector('[data-act="shuffle"]'); if (sh) sh.onclick = () => { m.close(); openCompleteMeal(r); };
  m.el.querySelectorAll(".cm-pick").forEach((b) => b.addEventListener("click", () => { m.close(); openRecipe(b.dataset.id); }));
}

function openCookTimeline(initial, presetTarget) {
  const parseMin = (t) => { const mm = String(t == null ? "" : t).match(/\d+/); return mm ? parseInt(mm[0], 10) : null; };
  let dishes = (initial || []).filter(Boolean).map((r) => ({ id: r.id || null, title: r.title || "Piatto", time: parseMin(r.time) }));
  const now = new Date();
  let target = presetTarget || (now.getHours() < 15 ? "13:00" : "20:00"); // pranzo o cena
  const fmt = (mins) => { mins = ((mins % 1440) + 1440) % 1440; return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`; };

  const m = openModal(`<h3 class="modal__title">🕐 Tutto pronto alle…</h3>
    <p class="hint" style="margin-top:-6px">Dimmi a che ora vuoi servire: calcolo io quando iniziare ogni piatto.</p>
    <div class="field"><label>Ora in tavola</label><input type="time" id="ctTarget" value="${escapeHtml(target)}" /></div>
    <div class="ct-dishes" id="ctDishes"></div>
    <button class="btn btn--ghost btn--block" id="ctAdd" style="margin:8px 0">${iconHtml("plus")} Aggiungi un piatto</button>
    <div id="ctTimeline"></div>`);
  const dishesEl = m.el.querySelector("#ctDishes");
  const lineEl = m.el.querySelector("#ctTimeline");

  function paintDishes() {
    dishesEl.innerHTML = dishes.length
      ? dishes.map((d, i) => `<div class="ct-dish">
          <span class="ct-dish__name">${escapeHtml(d.title)}</span>
          <input type="number" class="ct-dish__time" data-i="${i}" min="0" inputmode="numeric" value="${d.time != null ? d.time : ""}" placeholder="min" />
          <span class="ct-dish__u">min</span>
          <button class="ct-dish__del" data-del="${i}" title="Togli">✕</button>
        </div>`).join("")
      : `<div class="hint">Nessun piatto. Aggiungine uno qui sotto.</div>`;
    dishesEl.querySelectorAll(".ct-dish__time").forEach((inp) => inp.addEventListener("input", () => {
      const i = parseInt(inp.dataset.i, 10); const v = inp.value.trim();
      dishes[i].time = v === "" ? null : Math.max(0, parseInt(v, 10) || 0);
      paintLine();
    }));
    dishesEl.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
      dishes.splice(parseInt(b.dataset.del, 10), 1); paintDishes(); paintLine();
    }));
  }
  function paintLine() {
    const [h, mm] = target.split(":").map(Number); const tMin = h * 60 + mm;
    const timed = dishes.map((d) => ({ title: d.title, time: d.time, start: d.time != null ? tMin - d.time : null }))
      .filter((d) => d.start != null).sort((a, b) => a.start - b.start);
    const noTime = dishes.filter((d) => d.time == null).length;
    lineEl.innerHTML = `${timed.length ? `<div class="ct-line">
      ${timed.map((d) => `<div class="ct-step"><span class="ct-step__time">${fmt(d.start)}</span><span class="ct-step__txt">inizia <b>${escapeHtml(d.title)}</b> <span class="ct-step__d">(${d.time} min)</span></span></div>`).join("")}
      <div class="ct-step ct-step--end"><span class="ct-step__time">${escapeHtml(target)}</span><span class="ct-step__txt">🍽️ <b>In tavola!</b></span></div>
    </div>` : `<div class="hint">Indica i minuti di ogni piatto per vedere quando iniziare.</div>`}
    ${noTime ? `<div class="hint" style="margin-top:8px">${noTime} ${noTime === 1 ? "piatto senza tempo" : "piatti senza tempo"}: scrivi i minuti per includerlo.</div>` : ""}`;
  }
  m.el.querySelector("#ctTarget").addEventListener("input", (e) => { if (e.target.value) target = e.target.value; paintLine(); });
  m.el.querySelector("#ctAdd").addEventListener("click", () => {
    m.close();
    openRecipePicker((rid) => { const r = store.getRecipe(rid); dishes.push({ id: rid, title: r ? r.title : "Piatto", time: parseMin(r && r.time) }); openCookTimeline(dishes, target); });
  });
  paintDishes(); paintLine();
}

// Genera e condivide un file .ics standard (aggiunge pasti/eventi al calendario
// del telefono). Usa orari "locali" (senza fuso) e un promemoria 2 ore prima.
function icsEscape(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
function icsStamp(d) { const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`; }
function buildICS(events) {
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fornelli//IT", "CALSCALE:GREGORIAN"];
  events.forEach((e, i) => {
    const end = new Date(e.start.getTime() + (e.durMin || 60) * 60000);
    L.push("BEGIN:VEVENT", `UID:fornelli-${e.start.getTime()}-${i}@fornelli.app`, `DTSTAMP:${icsStamp(new Date())}`, `DTSTART:${icsStamp(e.start)}`, `DTEND:${icsStamp(end)}`, `SUMMARY:${icsEscape(e.title)}`);
    if (e.desc) L.push(`DESCRIPTION:${icsEscape(e.desc)}`);
    L.push("BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT2H", `DESCRIPTION:${icsEscape(e.title)}`, "END:VALARM", "END:VEVENT");
  });
  L.push("END:VCALENDAR");
  return L.join("\r\n");
}
async function shareICS(filename, ics) {
  try {
    const file = new File([ics], filename, { type: "text/calendar" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "Aggiungi al calendario" }); return; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  const blob = new Blob([ics], { type: "text/calendar" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  toast("Calendario scaricato: aprilo per aggiungerlo", "success");
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
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">
      <button class="btn btn--ghost" data-slot="colazione">${iconHtml("coffee")} Colazione</button>
      <button class="btn btn--primary" data-slot="pranzo">${iconHtml("plus")} Pranzo</button>
      <button class="btn btn--ghost" data-slot="spuntino">${iconHtml("cookie")} Spuntino</button>
      <button class="btn btn--primary" data-slot="cena">${iconHtml("plus")} Cena</button>
    </div>
    ${entries.length ? `<button class="btn btn--block" data-act="timeline" style="margin-top:8px">🕐 A che ora inizio? (tutto pronto in orario)</button>` : ""}
    ${entries.length ? `<button class="btn btn--block" data-act="toshop" style="margin-top:8px">${iconHtml("shopping-cart-simple")} Aggiungi ingredienti alla spesa</button>` : ""}
    ${entries.length ? `<button class="btn btn--block" data-act="ics" style="margin-top:8px">${iconHtml("calendar-dots")} Aggiungi al calendario</button>` : ""}
  `);
  const icsBtn = m.el.querySelector('[data-act="ics"]');
  if (icsBtn) icsBtn.addEventListener("click", () => {
    const [Y, Mo, Da] = date.split("-").map(Number);
    const SLOT_TIME = { colazione: [8, 0], pranzo: [13, 0], spuntino: [16, 30], cena: [20, 0] };
    const evs = entries.map((e) => {
      const r = store.getRecipe(e.recipeId);
      const [hh, mm] = SLOT_TIME[e.slot] || [12, 0];
      return { title: `${SLOT_LABEL[e.slot] ? SLOT_LABEL[e.slot] + ": " : ""}${r ? r.title : "Pasto"}`, start: new Date(Y, Mo - 1, Da, hh, mm), durMin: 60, desc: "Pianificato con Fornelli" };
    });
    if (!evs.length) { toast("Niente da aggiungere", "error"); return; }
    shareICS(`pasti-${date}.ics`, buildICS(evs));
  });

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
  const tl = m.el.querySelector('[data-act="timeline"]');
  if (tl) tl.addEventListener("click", () => {
    const recs = entries.map((e) => store.getRecipe(e.recipeId)).filter(Boolean);
    m.close();
    openCookTimeline(recs);
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

// Copertina a collage di una raccolta: fino a 4 foto delle sue ricette.
function menuCoverHtml(mn) {
  const photos = store.getMenuRecipes(mn.id).filter((r) => r.photo).slice(0, 4).map((r) => proxiedImg(r.photo));
  if (!photos.length) return `<span class="mcard__cover mcard__cover--empty">${iconHtml("book-bookmark")}</span>`;
  return `<span class="mcard__cover mcard__cover--n${photos.length}">${photos.map((p) => `<img src="${escapeHtml(p)}" alt="" loading="lazy" referrerpolicy="no-referrer"/>`).join("")}</span>`;
}
function renderMenusBody(body) {
  const events = store.getEvents();
  const evList = events.length
    ? events.map((e) => {
        const n = (e.dishes || []).length;
        const when = e.servingAt ? fmtEventWhen(e.servingAt) : "data da scegliere";
        return `<button class="pick-row" data-event="${e.id}"><span class="day-row__icon">🎉</span><span class="day-row__name">${escapeHtml(e.name)}<span class="have-badge">${n} ${n === 1 ? "piatto" : "piatti"}</span><span class="ev-when">${escapeHtml(when)}</span></span></button>`;
      }).join("")
    : `<div class="hint">Organizza un grande menù (Natale, Pasqua…) con i tempi: spesa, preparazioni anticipate, piatti portati dagli ospiti e timeline del giorno. Si salva per rifarlo.</div>`;
  const menus = store.getMenus();
  const list = menus.length
    ? `<div class="mcards">${menus.map((mn) => {
        const n = (mn.recipeIds || []).length;
        return `<button class="mcard" data-menu="${mn.id}">${menuCoverHtml(mn)}<span class="mcard__body"><span class="mcard__name">${escapeHtml(mn.name)}</span><span class="mcard__n">${n} ${n === 1 ? "ricetta" : "ricette"}</span></span></button>`;
      }).join("")}</div>`
    : `<div class="hint">Nessuna raccolta. Crea una raccolta per raggruppare più ricette (es. "Cena con amici") e generare un'unica lista della spesa.</div>`;
  body.innerHTML = `
    <div class="menus-sec__title">🎉 Menù delle feste</div>
    ${evList}
    <button class="btn btn--primary btn--block" id="newEvent" style="margin:10px 0 22px">${iconHtml("plus")} Nuovo menù delle feste</button>
    <div class="menus-sec__title">${iconHtml("book-bookmark")} Raccolte</div>
    ${list}
    <button class="btn btn--block" id="newMenu" style="margin-top:12px">${iconHtml("plus")} Nuova raccolta</button>`;
  body.querySelectorAll("[data-event]").forEach((b) => b.addEventListener("click", () => openEventSheet(b.dataset.event)));
  body.querySelectorAll("[data-menu]").forEach((b) => b.addEventListener("click", () => openMenuSheet(b.dataset.menu)));
  body.querySelector("#newEvent").addEventListener("click", () => openPrompt("Nuovo menù delle feste", "Es. Natale 2026", async (name) => { const id = await store.addEvent({ name }); openEventSheet(id); }));
  body.querySelector("#newMenu").addEventListener("click", () => openPrompt("Nuova raccolta", "Es. Cena con amici", async (name) => { await store.addMenu(name); renderHomeBody(); }));
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
      ${recipes.length ? `<button class="btn btn--block" data-act="pdf">${iconHtml("download-simple")} Esporta in PDF</button>` : ""}
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
    for (const r of store.getMenuRecipes(menuId)) for (const it of (r.ingredients || [])) items.push({ name: it.name, unit: it.unit || "", qty: it.qty != null ? it.qty : null, category: categorize(it.name), from: r.title });
    const res = await store.addShoppingItems(items);
    m.close();
    toast(shoppingToast(res), "success");
  });
  const pdfBtn = m.el.querySelector('[data-act="pdf"]');
  if (pdfBtn) pdfBtn.addEventListener("click", () => exportCollectionPdf(mn.name, store.getMenuRecipes(menuId)));
  m.el.querySelector('[data-act="rename"]').addEventListener("click", () => { m.close(); openPrompt("Rinomina menu", "Nome", async (name) => { await store.renameMenu(menuId, name); openMenuSheet(menuId); }, mn.name); });
  m.el.querySelector('[data-act="del"]').addEventListener("click", async () => {
    const ok = await confirmDialog({ title: "Eliminare il menu?", message: `"${mn.name}" verrà eliminato (le ricette restano).`, confirmText: "Elimina", danger: true });
    if (ok) { await store.deleteMenu(menuId); m.close(); renderHomeBody(); }
  });
}

// ================= Menù delle feste (eventi) =================
const EVENT_COURSES = ["Antipasti", "Primi", "Secondi", "Contorni", "Dolci"];
const PREP_DAY_LABELS = { 1: "Il giorno prima", 2: "Due giorni prima", 3: "Tre giorni prima" };
const PREP_DAY_SHORT = { 1: "il giorno prima", 2: "2 giorni prima", 3: "3 giorni prima" };

function fmtEventWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const mon = MONTHS_IT[d.getMonth()].slice(0, 3).toLowerCase();
  return `${d.getDate()} ${mon} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Eventi (menù delle feste) che cadono in una certa data "YYYY-MM-DD".
function eventsOnDate(ds) {
  return store.getEvents().filter((e) => e.servingAt && e.servingAt.slice(0, 10) === ds);
}
// Box "Prossime feste" per il Piano: eventi da oggi in poi, toccabili.
function upcomingEventsHtml() {
  const today = todayStr();
  const evs = store.getEvents().filter((e) => e.servingAt && e.servingAt.slice(0, 10) >= today)
    .sort((a, b) => a.servingAt.localeCompare(b.servingAt));
  if (!evs.length) return "";
  return `<div class="fest-up">
    <div class="fest-up__t">🎉 Prossime feste</div>
    ${evs.map((e) => `<button class="fest-up__row" data-event="${e.id}"><span class="fest-up__name">${escapeHtml(e.name)}</span><span class="fest-up__when">${escapeHtml(fmtEventWhen(e.servingAt))}</span></button>`).join("")}
  </div>`;
}
function wireUpcomingEvents() {
  root.querySelectorAll(".fest-up__row[data-event]").forEach((b) => b.addEventListener("click", () => openEventSheet(b.dataset.event)));
}

// Default sensati per un piatto aggiunto da una ricetta (portata, quando
// prepararlo, come si serve, forno) — l'utente può sempre correggere.
function guessDishDefaults(recipe) {
  const title = (recipe.title || "").toLowerCase();
  const tags = recipe.tags || [];
  let course = EVENT_COURSES.find((c) => tags.includes(c)) || guessCategory(recipe.title);
  if (!EVENT_COURSES.includes(course)) course = "Secondi";
  const aheadRe = /(tiramis|semifreddo|cheesecake|panna cotta|budino|gelato|brasat|stufat|rag[uù]|arrosto|spezzatin|sugo|brodo|marinat|gelatina|aspic|insalata di riso)/;
  const ovenRe = /(forno|arrost|gratin|sformat|lasagn|torta|crostata|teglia|gratinat|al forno|parmigiana|timball)/;
  return {
    course,
    time: recipe.time || null,
    prepDay: (course === "Dolci" || aheadRe.test(title)) ? 1 : 0,
    servedTemp: course === "Dolci" ? "freddo" : (course === "Antipasti" ? "ambiente" : "caldo"),
    usesOven: ovenRe.test(title),
    ovenTemp: null
  };
}

function dishSafetyChip(d, guests) {
  if (!guests || !guests.length || !d.recipeId) return "";
  const r = store.getRecipe(d.recipeId);
  if (!r) return "";
  const res = checkRecipeForGuests(r, guests);
  if (!res.safe) return `<span class="ev-chip ev-chip--bad">⚠️ no: ${escapeHtml([...new Set(res.hard.map((h) => h.name))].join(", "))}</span>`;
  if (res.soft.length) return `<span class="ev-chip ev-chip--warn">ok tranne: ${escapeHtml([...new Set(res.soft.map((s) => s.name))].join(", "))}</span>`;
  return `<span class="ev-chip ev-chip--ok">✓ per tutti</span>`;
}
function eventDishRow(d, guests) {
  const chips = [];
  if (d.broughtByGuest) chips.push(`<span class="ev-chip ev-chip--guest">👤 ${escapeHtml(d.guestName || "ospite")}</span>`);
  if (d.reheatOnly) chips.push(`<span class="ev-chip">🔥 da scaldare</span>`);
  else if ((+d.prepDay || 0) > 0) chips.push(`<span class="ev-chip ev-chip--ahead">${PREP_DAY_SHORT[+d.prepDay] || "prima"}</span>`);
  if (d.time) chips.push(`<span class="ev-chip">${d.time}′</span>`);
  if (d.usesOven && d.ovenTemp) chips.push(`<span class="ev-chip">🔥 ${d.ovenTemp}°</span>`);
  if (d.assignedTo) chips.push(`<span class="ev-chip ev-chip--who">👩‍🍳 ${escapeHtml(d.assignedTo)}</span>`);
  const safety = dishSafetyChip(d, guests);
  if (safety) chips.push(safety);
  return `<button class="ev-dish" data-dish="${d.id}"><span class="ev-dish__name">${escapeHtml(d.title || "Piatto")}</span><span class="ev-dish__chips">${chips.join("")}</span></button>`;
}
// Portata di una ricetta salvata (dal tag o dal titolo).
function eventCourseOf(r) {
  return EVENT_COURSES.find((c) => (r.tags || []).includes(c)) || guessCategory(r.title) || null;
}

function openEventSheet(eventId) {
  const ev = store.getEvent(eventId);
  if (!ev) { renderHomeBody(); return; }
  const dishes = ev.dishes || [];
  const guests = ev.guestProfiles || [];
  let groups = "";
  for (const course of EVENT_COURSES) {
    const list = dishes.filter((d) => d.course === course);
    if (list.length) groups += `<div class="ev-course"><div class="ev-course__t">${course}</div>${list.map((d) => eventDishRow(d, guests)).join("")}</div>`;
  }
  const other = dishes.filter((d) => !EVENT_COURSES.includes(d.course));
  if (other.length) groups += `<div class="ev-course"><div class="ev-course__t">Altro</div>${other.map((d) => eventDishRow(d, guests)).join("")}</div>`;
  const hasGuests = dishes.some((d) => d.broughtByGuest);
  const gSummary = guests.length ? guestsSummary(guests) : "";

  const m = openModal(`
    <h3 class="modal__title">🎉 ${escapeHtml(ev.name)}</h3>
    <div class="ev-meta">
      <label class="ev-field"><span>Quando (in tavola)</span><input type="datetime-local" id="evWhen" value="${ev.servingAt ? escapeHtml(ev.servingAt) : ""}" /></label>
      <label class="ev-field"><span>Ospiti a tavola</span><input type="number" id="evGuests" min="1" inputmode="numeric" value="${ev.guests || ""}" placeholder="es. 8" /></label>
    </div>
    <button class="btn btn--block" id="evDiets" style="margin-bottom:14px">👥 Invitati e diete${guests.length ? ` · ${guests.length}` : ""}${gSummary ? `<span class="ev-gsum">${escapeHtml(gSummary)}</span>` : ""}</button>
    <div id="evDishes">${groups || `<div class="hint">Nessun piatto ancora. Aggiungi i tuoi piatti, per portata.</div>`}</div>
    <button class="btn btn--primary btn--block" id="evAdd" style="margin:10px 0 8px">${iconHtml("plus")} Aggiungi un piatto</button>
    <button class="btn btn--block" id="evSuggest" style="margin-bottom:16px">✨ Completa il menù (di stagione, sicuro per tutti)</button>
    <button class="btn btn--block" id="evPlan" style="margin-bottom:8px">📋 Piano di battaglia</button>
    <button class="btn btn--block" id="evShop" style="margin-bottom:8px">${iconHtml("shopping-cart-simple")} Lista della spesa</button>
    <button class="btn btn--block" id="evRemind" style="margin-bottom:8px">🔔 Imposta i promemoria</button>
    ${hasGuests ? `<button class="btn btn--block" id="evMsg" style="margin-bottom:8px">💬 Messaggio per gli ospiti</button>` : ""}
    <div style="display:flex;gap:8px;margin-top:6px">
      <button class="btn btn--ghost" id="evDup">🗂️ Duplica</button>
      <button class="btn btn--ghost" id="evRename">${iconHtml("pencil-simple")} Rinomina</button>
      <button class="btn btn--ghost" id="evDel" style="color:var(--danger)">${iconHtml("trash")} Elimina</button>
    </div>
  `);
  m.el.querySelector("#evWhen").addEventListener("change", (e) => store.updateEvent(eventId, { servingAt: e.target.value || null }));
  m.el.querySelector("#evGuests").addEventListener("change", (e) => store.updateEvent(eventId, { guests: parseInt(e.target.value, 10) || null }));
  m.el.querySelectorAll("[data-dish]").forEach((row) => row.addEventListener("click", () => { m.close(); openEventDishEditor(eventId, dishes.find((d) => d.id === row.dataset.dish)); }));
  m.el.querySelector("#evDiets").addEventListener("click", () => { m.close(); openEventGuests(eventId); });
  m.el.querySelector("#evAdd").addEventListener("click", () => { m.close(); openEventAddChooser(eventId); });
  m.el.querySelector("#evSuggest").addEventListener("click", () => { m.close(); openEventSuggest(eventId); });
  m.el.querySelector("#evPlan").addEventListener("click", () => { m.close(); openEventPlan(eventId); });
  m.el.querySelector("#evShop").addEventListener("click", () => eventAddToShopping(eventId));
  m.el.querySelector("#evRemind").addEventListener("click", () => eventSetReminders(eventId));
  const msgBtn = m.el.querySelector("#evMsg");
  if (msgBtn) msgBtn.addEventListener("click", () => { m.close(); openEventGuestMessage(eventId); });
  m.el.querySelector("#evDup").addEventListener("click", async () => { const id = await store.duplicateEvent(eventId); m.close(); toast("Menù duplicato", "success"); if (id) openEventSheet(id); });
  m.el.querySelector("#evRename").addEventListener("click", () => { m.close(); openPrompt("Rinomina menù", "Nome", async (name) => { await store.updateEvent(eventId, { name }); openEventSheet(eventId); }, ev.name); });
  m.el.querySelector("#evDel").addEventListener("click", async () => {
    const ok = await confirmDialog({ title: "Eliminare il menù?", message: `"${ev.name}" verrà eliminato.`, confirmText: "Elimina", danger: true });
    if (ok) { await store.deleteEvent(eventId); m.close(); renderHomeBody(); }
  });
}

function openEventAddChooser(eventId) {
  const m = openModal(`
    <h3 class="modal__title">Aggiungi un piatto</h3>
    <button class="btn btn--primary btn--block" id="evFromRecipe" style="margin-bottom:10px">${iconHtml("fork-knife")} Da una mia ricetta</button>
    <button class="btn btn--block" id="evGuestDish">👤 Portato da un ospite (da scaldare)</button>
    <div class="modal__actions"><button class="btn" data-act="c">Annulla</button></div>
  `);
  m.el.querySelector('[data-act="c"]').onclick = () => { m.close(); openEventSheet(eventId); };
  m.el.querySelector("#evFromRecipe").onclick = () => {
    m.close();
    openRecipePicker((rid) => { const r = store.getRecipe(rid); openEventDishEditor(eventId, { id: null, recipeId: rid, title: r ? r.title : "Piatto", reheatOnly: false, broughtByGuest: false, ...guessDishDefaults(r || {}) }); });
  };
  m.el.querySelector("#evGuestDish").onclick = () => {
    m.close();
    openEventDishEditor(eventId, { id: null, recipeId: null, title: "", course: "Antipasti", time: null, prepDay: 0, servedTemp: "caldo", usesOven: false, ovenTemp: null, reheatOnly: true, broughtByGuest: true, guestName: "" });
  };
}

function openEventDishEditor(eventId, dish) {
  if (!dish) { openEventSheet(eventId); return; }
  const isGuest = !!dish.broughtByGuest;
  const courseOpts = EVENT_COURSES.map((c) => `<option value="${c}" ${dish.course === c ? "selected" : ""}>${c}</option>`).join("");
  const tempOpts = [["caldo", "Caldo (forno/fornelli)"], ["ambiente", "Temperatura ambiente"], ["freddo", "Freddo (dal frigo)"]].map(([v, l]) => `<option value="${v}" ${dish.servedTemp === v ? "selected" : ""}>${l}</option>`).join("");
  const prepOpts = [[0, "Il giorno stesso"], [1, "Il giorno prima"], [2, "Due giorni prima"], [3, "Tre giorni prima"]].map(([v, l]) => `<option value="${v}" ${(+dish.prepDay || 0) === v ? "selected" : ""}>${l}</option>`).join("");
  const m = openModal(`
    <h3 class="modal__title">${dish.id ? "Modifica piatto" : "Nuovo piatto"}</h3>
    <label class="ev-field"><span>Nome</span><input type="text" id="dName" value="${escapeHtml(dish.title || "")}" ${dish.recipeId ? "readonly" : ""} placeholder="Es. Lasagne" /></label>
    <label class="ev-field"><span>Portata</span><select id="dCourse">${courseOpts}</select></label>
    ${isGuest ? `<label class="ev-field"><span>Portato da</span><input type="text" id="dGuest" value="${escapeHtml(dish.guestName || "")}" placeholder="Nome ospite" /></label>` : ""}
    <label class="ev-row-chk"><span>Va solo scaldato (arriva/è già pronto)</span><input type="checkbox" id="dReheat" class="mini-check" ${dish.reheatOnly ? "checked" : ""} /></label>
    <label class="ev-field"><span>Tempo (minuti)</span><input type="number" id="dTime" min="0" inputmode="numeric" value="${dish.time != null ? dish.time : ""}" placeholder="${isGuest ? "minuti per scaldarlo" : "minuti di cottura"}" /></label>
    <label class="ev-field" id="dPrepWrap"><span>Quando prepararlo</span><select id="dPrep">${prepOpts}</select></label>
    <label class="ev-field"><span>Come si serve</span><select id="dTemp">${tempOpts}</select></label>
    <label class="ev-field"><span>Chi lo prepara (facoltativo)</span><input type="text" id="dWho" value="${escapeHtml(dish.assignedTo || "")}" placeholder="Es. Io, Federica…" /></label>
    <label class="ev-row-chk"><span>Usa il forno</span><input type="checkbox" id="dOven" class="mini-check" ${dish.usesOven ? "checked" : ""} /></label>
    <label class="ev-field" id="dOvenTempWrap" style="${dish.usesOven ? "" : "display:none"}"><span>Temperatura forno (°C)</span><input type="number" id="dOvenTemp" min="0" inputmode="numeric" value="${dish.ovenTemp != null ? dish.ovenTemp : ""}" placeholder="es. 180" /></label>
    <div class="modal__actions">
      ${dish.id ? `<button class="btn" data-act="del" style="color:var(--danger)">Elimina</button>` : `<button class="btn" data-act="c">Annulla</button>`}
      <button class="btn btn--primary" data-act="ok">Salva</button>
    </div>
  `);
  const ovenChk = m.el.querySelector("#dOven");
  ovenChk.addEventListener("change", () => { m.el.querySelector("#dOvenTempWrap").style.display = ovenChk.checked ? "" : "none"; });
  const reheatChk = m.el.querySelector("#dReheat");
  const syncReheat = () => { m.el.querySelector("#dPrepWrap").style.display = reheatChk.checked ? "none" : ""; };
  reheatChk.addEventListener("change", syncReheat); syncReheat();
  const back = () => { m.close(); openEventSheet(eventId); };
  const cancel = m.el.querySelector('[data-act="c"]'); if (cancel) cancel.onclick = back;
  const del = m.el.querySelector('[data-act="del"]'); if (del) del.onclick = async () => {
    const ev = store.getEvent(eventId); if (!ev) { back(); return; }
    await store.updateEvent(eventId, { dishes: (ev.dishes || []).filter((d) => d.id !== dish.id) });
    back();
  };
  m.el.querySelector('[data-act="ok"]').onclick = async () => {
    const ev = store.getEvent(eventId); if (!ev) { back(); return; }
    const reheat = reheatChk.checked;
    const ovenTempVal = m.el.querySelector("#dOvenTemp").value.trim();
    const timeVal = m.el.querySelector("#dTime").value.trim();
    const updated = {
      id: dish.id || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : "d-" + Date.now().toString(36) + Math.random().toString(16).slice(2, 6)),
      recipeId: dish.recipeId || null,
      title: (m.el.querySelector("#dName").value || "").trim() || (dish.title || "Piatto"),
      course: m.el.querySelector("#dCourse").value,
      time: timeVal === "" ? null : Math.max(0, parseInt(timeVal, 10) || 0),
      prepDay: reheat ? 0 : (parseInt(m.el.querySelector("#dPrep").value, 10) || 0),
      servedTemp: m.el.querySelector("#dTemp").value,
      usesOven: ovenChk.checked,
      ovenTemp: ovenChk.checked && ovenTempVal !== "" ? (parseInt(ovenTempVal, 10) || null) : null,
      reheatOnly: reheat,
      broughtByGuest: !!dish.broughtByGuest,
      guestName: isGuest && m.el.querySelector("#dGuest") ? m.el.querySelector("#dGuest").value.trim() : "",
      assignedTo: (m.el.querySelector("#dWho").value || "").trim()
    };
    const list = [...(ev.dishes || [])];
    const i = list.findIndex((d) => d.id === updated.id);
    if (i >= 0) list[i] = updated; else list.push(updated);
    await store.updateEvent(eventId, { dishes: list });
    back();
  };
}

function openEventPlan(eventId) {
  const ev = store.getEvent(eventId);
  if (!ev) return;
  if (!ev.servingAt) { toast("Imposta prima la data e l'ora 'in tavola'", "error"); openEventSheet(eventId); return; }
  const serving = new Date(ev.servingAt);
  const dishes = ev.dishes || [];
  const done = ev.done || {};
  const chk = (key) => `<input type="checkbox" class="ev-chk mini-check" data-k="${escapeHtml(key)}" ${done[key] ? "checked" : ""} />`;
  const dayName = (d) => `${WEEKDAYS_IT[(d.getDay() + 6) % 7].toLowerCase()} ${d.getDate()} ${MONTHS_IT[d.getMonth()].slice(0, 3).toLowerCase()}`;
  const clock = (dt) => `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;

  // "Chi fa cosa": raggruppa i piatti per cuoco assegnato (cuciniamo in due).
  const byCook = {};
  for (const d of dishes) { const w = (d.assignedTo || "").trim(); if (w) (byCook[w] = byCook[w] || []).push(d.title); }
  const cooks = Object.keys(byCook);
  let html = cooks.length ? `<div class="ev-phase"><div class="ev-phase__t">👥 Chi fa cosa</div>${cooks.map((w) => `<div class="ev-task"><span>👩‍🍳 <b>${escapeHtml(w)}</b>: ${byCook[w].map(escapeHtml).join(", ")}</span></div>`).join("")}</div>` : "";
  html += `<div class="ev-phase"><div class="ev-phase__t">🛒 Spesa</div>
    <label class="ev-task">${chk("shop-big")}<span>Spesa grossa (dispensa, surgelati, non deperibili) — qualche giorno prima</span></label>
    <label class="ev-task">${chk("shop-fresh")}<span>Spesa fresca (verdure, pesce, pane) — 1-2 giorni prima</span></label>
    <button class="btn btn--ghost btn--block" id="evpShop" style="margin-top:6px">${iconHtml("shopping-cart-simple")} Aggiungi tutto alla lista della spesa</button></div>`;

  const aheadDays = [...new Set(dishes.filter((d) => !d.reheatOnly && (+d.prepDay || 0) > 0).map((d) => +d.prepDay))].sort((a, b) => b - a);
  for (const pd of aheadDays) {
    const d0 = new Date(serving); d0.setDate(d0.getDate() - pd);
    const list = dishes.filter((d) => !d.reheatOnly && (+d.prepDay || 0) === pd);
    html += `<div class="ev-phase"><div class="ev-phase__t">📅 ${PREP_DAY_LABELS[pd] || pd + " giorni prima"} <span class="ev-phase__d">(${dayName(d0)})</span></div>
      ${list.map((d) => `<label class="ev-task">${chk("ah:" + d.id)}<span>Prepara <b>${escapeHtml(d.title)}</b>${d.time ? ` <span class="ev-task__d">(${d.time}′)</span>` : ""}${d.assignedTo ? ` <span class="ev-task__d">· 👩‍🍳 ${escapeHtml(d.assignedTo)}</span>` : ""}</span></label>`).join("")}</div>`;
  }

  const sched = dishes.filter((d) => (d.reheatOnly || (+d.prepDay || 0) === 0) && d.time != null)
    .map((d) => ({ d, start: new Date(serving.getTime() - d.time * 60000) }))
    .sort((a, b) => a.start - b.start);
  const noTime = dishes.filter((d) => (d.reheatOnly || (+d.prepDay || 0) === 0) && d.time == null);
  const warmAhead = dishes.filter((d) => !d.reheatOnly && (+d.prepDay || 0) > 0 && d.servedTemp === "caldo");
  let dayHtml = sched.map(({ d, start }) => `<div class="ct-step"><span class="ct-step__time">${clock(start)}</span><span class="ct-step__txt">${d.reheatOnly ? "scalda" : "inizia"} <b>${escapeHtml(d.title)}</b> <span class="ct-step__d">(${d.time}′${d.usesOven && d.ovenTemp ? `, forno ${d.ovenTemp}°` : ""})</span>${d.assignedTo ? ` <span class="ct-step__d">· 👩‍🍳 ${escapeHtml(d.assignedTo)}</span>` : ""}</span></div>`).join("");
  dayHtml += `<div class="ct-step ct-step--end"><span class="ct-step__time">${clock(serving)}</span><span class="ct-step__txt">🍽️ <b>In tavola!</b></span></div>`;
  html += `<div class="ev-phase"><div class="ev-phase__t">🔥 Il giorno della festa <span class="ev-phase__d">(${dayName(serving)})</span></div>
    ${warmAhead.length ? `<div class="hint" style="margin-bottom:8px">Da tirare fuori dal frigo / scaldare: ${warmAhead.map((d) => escapeHtml(d.title)).join(", ")}.</div>` : ""}
    <div class="ct-line">${dayHtml}</div>
    ${noTime.length ? `<div class="hint" style="margin-top:8px">Senza tempo (aggiungilo per metterli in orario): ${noTime.map((d) => escapeHtml(d.title)).join(", ")}.</div>` : ""}</div>`;

  // Conflitti forno: due piatti in forno nella stessa finestra a temperature diverse.
  const ovenItems = sched.filter(({ d }) => d.usesOven && d.ovenTemp).map(({ d, start }) => ({ title: d.title, temp: d.ovenTemp, start: start.getTime(), end: serving.getTime() }));
  let warns = "";
  for (let i = 0; i < ovenItems.length; i++) for (let j = i + 1; j < ovenItems.length; j++) {
    const a = ovenItems[i], b = ovenItems[j];
    if (a.start < b.end && b.start < a.end && a.temp !== b.temp) {
      const avg = Math.round((a.temp + b.temp) / 2 / 5) * 5;
      warns += `<div class="ev-warn">⚠️ <b>${escapeHtml(a.title)}</b> (${a.temp}°) e <b>${escapeHtml(b.title)}</b> (${b.temp}°) userebbero il forno insieme. Cuocili a ~${avg}° insieme (non per dolci/lievitati), oppure sfasa le cotture.</div>`;
    }
  }
  if (warns) html += `<div class="ev-phase"><div class="ev-phase__t">🔥 Attenzione al forno</div>${warns}</div>`;

  const m = openModal(`<h3 class="modal__title">📋 Piano · ${escapeHtml(ev.name)}</h3><p class="hint" style="margin-top:-6px">In tavola: ${escapeHtml(fmtEventWhen(ev.servingAt))}</p>${html}<div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>`);
  m.el.querySelector('[data-act="ok"]').onclick = () => { m.close(); openEventSheet(eventId); };
  const sb = m.el.querySelector("#evpShop"); if (sb) sb.addEventListener("click", () => eventAddToShopping(eventId));
  m.el.querySelectorAll(".ev-chk").forEach((c) => c.addEventListener("change", async () => {
    const cur = store.getEvent(eventId); if (!cur) return;
    const nd = { ...(cur.done || {}) };
    if (c.checked) nd[c.dataset.k] = true; else delete nd[c.dataset.k];
    await store.updateEvent(eventId, { done: nd });
  }));
}

async function eventAddToShopping(eventId) {
  const ev = store.getEvent(eventId); if (!ev) return;
  const items = [];
  for (const d of (ev.dishes || [])) {
    if (!d.recipeId) continue; // i piatti degli ospiti non hanno ingredienti
    const r = store.getRecipe(d.recipeId); if (!r) continue;
    let factor = 1;
    if (ev.guests && r.servings) factor = ev.guests / r.servings;
    for (const it of (r.ingredients || [])) {
      items.push({ name: it.name, unit: it.unit || "", qty: it.qty != null ? it.qty * factor : null, category: categorize(it.name), from: r.title });
    }
  }
  if (!items.length) { toast("Nessun ingrediente da aggiungere (i piatti degli ospiti non contano)", "error"); return; }
  const res = await store.addShoppingItems(items);
  toast(shoppingToast(res) + (ev.guests ? " · dosi per " + ev.guests : ""), "success");
}

function eventSetReminders(eventId) {
  const ev = store.getEvent(eventId); if (!ev) return;
  if (!ev.servingAt) { toast("Imposta prima la data 'in tavola'", "error"); return; }
  const serving = new Date(ev.servingAt);
  const prefix = "evt:" + eventId + ":";
  const nowMs = Date.now();
  let list = getPrepReminders().filter((x) => !((x.recipeId || "") + "").startsWith(prefix));
  let n = 0;
  for (const d of (ev.dishes || [])) {
    if (d.reheatOnly || !((+d.prepDay || 0) > 0)) continue;
    const dd = new Date(serving); dd.setDate(dd.getDate() - (+d.prepDay)); dd.setHours(10, 0, 0, 0);
    if (dd.getTime() > nowMs) { list.push({ recipeId: prefix + d.id, title: `Prepara per ${ev.name}: ${d.title}`, due: dd.getTime() }); n++; }
  }
  const starts = (ev.dishes || []).filter((d) => (d.reheatOnly || (+d.prepDay || 0) === 0) && d.time != null).map((d) => serving.getTime() - d.time * 60000);
  if (starts.length) { const first = Math.min(...starts); if (first > nowMs) { list.push({ recipeId: prefix + "start", title: `Inizia a cucinare per ${ev.name}!`, due: first }); n++; } }
  setPrepReminders(list);
  try { if (window.Notification && Notification.permission === "default") Notification.requestPermission(); } catch (e) {}
  toast(n ? `${n} promemoria impostati` : "Nessun promemoria (date già passate?)", n ? "success" : "");
}

function openEventGuestMessage(eventId) {
  const ev = store.getEvent(eventId); if (!ev) return;
  const guests = (ev.dishes || []).filter((d) => d.broughtByGuest);
  const when = ev.servingAt ? fmtEventWhen(ev.servingAt) : "(data da definire)";
  const lines = [`Ciao! Per "${ev.name}" (${when}) ecco cosa porti:`];
  for (const d of guests) {
    let l = `• ${d.guestName ? d.guestName + ": " : ""}${d.title || "piatto"}`;
    if (d.reheatOnly) l += ` — arriva pronto, lo scaldiamo noi${d.time ? ` (~${d.time}′${d.usesOven && d.ovenTemp ? ` a ${d.ovenTemp}°` : ""})` : ""}`;
    lines.push(l);
  }
  lines.push("Grazie! 🎉");
  const text = lines.join("\n");
  const m = openModal(`
    <h3 class="modal__title">💬 Messaggio per gli ospiti</h3>
    <textarea id="evMsgT" rows="${Math.min(12, lines.length + 2)}" class="ev-msg">${escapeHtml(text)}</textarea>
    <div class="modal__actions">
      <button class="btn" data-act="c">Chiudi</button>
      <button class="btn btn--primary" data-act="send">📤 Invia / Copia</button>
    </div>
  `);
  m.el.querySelector('[data-act="c"]').onclick = () => { m.close(); openEventSheet(eventId); };
  m.el.querySelector('[data-act="send"]').onclick = async () => {
    const t = m.el.querySelector("#evMsgT").value;
    try {
      if (navigator.share) await navigator.share({ text: t });
      else { await navigator.clipboard.writeText(t); toast("Messaggio copiato", "success"); }
    } catch (e) { try { await navigator.clipboard.writeText(t); toast("Messaggio copiato", "success"); } catch (e2) {} }
  };
}

// ---- Invitati e diete ----
function openEventGuests(eventId) {
  const ev = store.getEvent(eventId); if (!ev) return;
  const guests = ev.guestProfiles || [];
  const rows = guests.length
    ? guests.map((g, i) => {
        const bits = [...(g.tags || []), ...(g.dislikes || []).map((d) => "no " + d)];
        return `<button class="ev-dish" data-gi="${i}"><span class="ev-dish__name">${escapeHtml(g.name || "Invitato " + (i + 1))}</span><span class="ev-dish__chips">${bits.length ? bits.map((b) => `<span class="ev-chip">${escapeHtml(b)}</span>`).join("") : `<span class="ev-chip ev-chip--ok">nessun vincolo</span>`}</span></button>`;
      }).join("")
    : `<div class="hint">Aggiungi gli invitati con allergie, intolleranze o cibi non graditi. Poi "Completa il menù" proporrà piatti di stagione sicuri per tutti.</div>`;
  const m = openModal(`
    <h3 class="modal__title">👥 Invitati e diete</h3>
    ${guests.length ? `<p class="hint" style="margin-top:-6px">${escapeHtml(guestsSummary(guests) || "nessun vincolo")}</p>` : ""}
    <div id="evgList">${rows}</div>
    <button class="btn btn--primary btn--block" id="evgAdd" style="margin-top:10px">${iconHtml("plus")} Aggiungi un invitato</button>
    <button class="btn btn--ghost btn--block" id="evgTerms" style="margin-top:8px">🔧 Migliora il riconoscimento ingredienti</button>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Fatto</button></div>
  `);
  m.el.querySelector('[data-act="ok"]').onclick = () => { m.close(); openEventSheet(eventId); };
  m.el.querySelectorAll("[data-gi]").forEach((b) => b.addEventListener("click", () => { m.close(); openEventGuestEditor(eventId, parseInt(b.dataset.gi, 10)); }));
  m.el.querySelector("#evgAdd").addEventListener("click", () => { m.close(); openEventGuestEditor(eventId, -1); });
  m.el.querySelector("#evgTerms").addEventListener("click", () => { m.close(); openDietTerms(() => openEventGuests(eventId)); });
}

// Schermata "Migliora il riconoscimento": l'utente aggiunge parole (es. chorizo,
// seitan, kamut) alle categorie, usate nei controlli "sicuro per tutti".
function openDietTerms(onClose) {
  const catOpts = CUSTOM_CATS.map(([k, label]) => `<option value="${k}">${escapeHtml(label)}</option>`).join("");
  const m = openModal(`
    <h3 class="modal__title">🔧 Migliora il riconoscimento</h3>
    <p class="hint" style="margin-top:-6px">Se un ingrediente (carne, pesce, latticino, glutine…) non viene riconosciuto nei controlli "sicuro per tutti", aggiungilo qui. Vale per tutti i menù.</p>
    <div class="ev-field"><span>Categoria</span><select id="dtCat">${catOpts}</select></div>
    <div class="search-bar"><input type="text" id="dtTerm" placeholder="Es. chorizo, seitan, kamut..." /><button class="btn btn--primary" id="dtAdd">${iconHtml("plus")}</button></div>
    <div id="dtList" style="margin-top:12px"></div>
    <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Fatto</button></div>
  `);
  const labelOf = (k) => (CUSTOM_CATS.find(([key]) => key === k) || [k, k])[1];
  function drawList() {
    const c = getCustomTerms();
    const cats = CUSTOM_CATS.filter(([k]) => (c[k] || []).length);
    m.el.querySelector("#dtList").innerHTML = cats.length
      ? cats.map(([k]) => `<div class="ev-course"><div class="ev-course__t">${escapeHtml(labelOf(k))}</div><div class="ev-dish__chips">${(c[k] || []).map((t) => `<span class="ev-chip">${escapeHtml(t)} <button class="dt-rm" data-cat="${k}" data-term="${escapeHtml(t)}" title="Togli">✕</button></span>`).join("")}</div></div>`).join("")
      : `<div class="hint">Nessuna parola aggiunta. Le liste di base coprono già i casi più comuni.</div>`;
    m.el.querySelectorAll(".dt-rm").forEach((b) => b.addEventListener("click", () => { removeCustomTerm(b.dataset.cat, b.dataset.term); drawList(); }));
  }
  const add = () => {
    const cat = m.el.querySelector("#dtCat").value;
    const term = m.el.querySelector("#dtTerm").value;
    if (!term.trim()) return;
    addCustomTerm(cat, term);
    m.el.querySelector("#dtTerm").value = "";
    drawList();
    toast("Aggiunto", "success");
  };
  m.el.querySelector("#dtAdd").addEventListener("click", add);
  m.el.querySelector("#dtTerm").addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
  m.el.querySelector('[data-act="ok"]').onclick = () => { m.close(); if (onClose) onClose(); };
  drawList();
}

function openEventGuestEditor(eventId, index) {
  const ev = store.getEvent(eventId); if (!ev) return;
  const guests = [...(ev.guestProfiles || [])];
  const g = index >= 0 ? { ...guests[index] } : { name: "", tags: [], dislikes: [] };
  const tags = new Set(g.tags || []);
  const chip = (t) => `<button type="button" class="diet-chip ${tags.has(t) ? "is-on" : ""}" data-t="${escapeHtml(t)}">${escapeHtml(t)}</button>`;
  const m = openModal(`
    <h3 class="modal__title">${index >= 0 ? "Modifica invitato" : "Nuovo invitato"}</h3>
    <label class="ev-field"><span>Nome (facoltativo)</span><input type="text" id="gName" value="${escapeHtml(g.name || "")}" placeholder="Es. Marco" /></label>
    <div class="ev-field"><span>Allergie / intolleranze</span><div class="diet-chips">${GUEST_ALLERGENS.map(chip).join("")}</div></div>
    <div class="ev-field"><span>Dieta</span><div class="diet-chips">${GUEST_DIETS.map(chip).join("")}</div></div>
    <label class="ev-field"><span>Non graditi (separati da virgola)</span><input type="text" id="gDislikes" value="${escapeHtml((g.dislikes || []).join(", "))}" placeholder="Es. funghi, coriandolo" /></label>
    <div class="modal__actions">
      ${index >= 0 ? `<button class="btn" data-act="del" style="color:var(--danger)">Elimina</button>` : `<button class="btn" data-act="c">Annulla</button>`}
      <button class="btn btn--primary" data-act="ok">Salva</button>
    </div>
  `);
  m.el.querySelectorAll(".diet-chip").forEach((b) => b.addEventListener("click", () => { const t = b.dataset.t; if (tags.has(t)) tags.delete(t); else tags.add(t); b.classList.toggle("is-on"); }));
  const back = () => { m.close(); openEventGuests(eventId); };
  const c = m.el.querySelector('[data-act="c"]'); if (c) c.onclick = back;
  const del = m.el.querySelector('[data-act="del"]'); if (del) del.onclick = async () => { guests.splice(index, 1); await store.updateEvent(eventId, { guestProfiles: guests }); back(); };
  m.el.querySelector('[data-act="ok"]').onclick = async () => {
    const prof = {
      name: (m.el.querySelector("#gName").value || "").trim(),
      tags: [...tags],
      dislikes: (m.el.querySelector("#gDislikes").value || "").split(",").map((s) => s.trim()).filter(Boolean)
    };
    if (index >= 0) guests[index] = prof; else guests.push(prof);
    await store.updateEvent(eventId, { guestProfiles: guests });
    back();
  };
}

// ---- Completa il menù: suggerimenti di stagione, sicuri per tutti ----
function openEventSuggest(eventId) {
  const ev = store.getEvent(eventId); if (!ev) return;
  const guests = ev.guestProfiles || [];
  const month = ev.servingAt ? new Date(ev.servingAt).getMonth() + 1 : currentMonth();
  const usedIds = new Set((ev.dishes || []).map((d) => d.recipeId).filter(Boolean));
  const haveByCourse = {}; EVENT_COURSES.forEach((c) => { haveByCourse[c] = (ev.dishes || []).filter((d) => d.course === c).length; });
  let course = EVENT_COURSES.find((c) => !haveByCourse[c]) || "Primi";
  let showAll = false;

  const m = openModal(`<h3 class="modal__title">✨ Completa il menù</h3><div id="evsBody"></div>`);

  function candidates(c) {
    return allRecipes().filter((r) => eventCourseOf(r) === c && !usedIds.has(r.id)).map((r) => {
      const safety = checkRecipeForGuests(r, guests);
      const seasonal = recipeSeasonalMatches(r, month);
      let score = safety.safe ? 100 : -1000;
      if (seasonal.length) score += 30;
      score -= 10 * safety.soft.length;
      return { r, safety, seasonal, score };
    }).sort((a, b) => b.score - a.score);
  }

  function draw() {
    const safe = candidates(course).filter((x) => x.safety.safe);
    const shown = showAll ? safe : safe.slice(0, 3);
    const cards = shown.map(({ r, safety, seasonal }) => {
      const badges = [];
      if (!safety.soft.length) badges.push(`<span class="ev-chip ev-chip--ok">✓ per tutti</span>`);
      else badges.push(`<span class="ev-chip ev-chip--warn">tranne ${escapeHtml([...new Set(safety.soft.map((s) => s.name))].join(", "))}</span>`);
      if (seasonal.length) badges.push(`<span class="ev-chip ev-chip--season">di stagione · ${escapeHtml(seasonal.slice(0, 2).map((p) => p.name).join(", "))}</span>`);
      badges.push(`<span class="ev-chip">dal tuo ricettario</span>`);
      return `<button class="ev-dish" data-add="${r.id}"><span class="ev-dish__name">${escapeHtml(r.title)}</span><span class="ev-dish__chips">${badges.join("")}</span></button>`;
    }).join("");
    const empty = !safe.length ? `<div class="hint">Nessuna ricetta salvata di questa portata è sicura per tutti${guests.length ? "" : " (aggiungi prima gli invitati)"}. Prova un'idea nuova qui sotto.</div>` : "";
    const more = (!showAll && safe.length > 3) ? `<button class="btn btn--ghost btn--block" id="evsMore">Mostra altri (${safe.length - 3})</button>` : "";
    m.el.querySelector("#evsBody").innerHTML = `
      ${guests.length ? `<p class="hint" style="margin-top:-6px">Per ${guests.length} invitati: ${escapeHtml(guestsSummary(guests) || "nessun vincolo")}. Mese: ${escapeHtml(monthName(month))}.</p>` : `<p class="hint" style="margin-top:-6px">Suggerimenti di stagione (${escapeHtml(monthName(month))}). Aggiungi gli invitati (👥) per filtrare anche per allergie e diete.</p>`}
      <div class="diet-chips" style="margin-bottom:12px">${EVENT_COURSES.map((c) => `<button type="button" class="diet-chip ${c === course ? "is-on" : ""}" data-c="${c}">${c}${haveByCourse[c] ? ` ·${haveByCourse[c]}` : ""}</button>`).join("")}</div>
      <div>${cards}${empty}</div>
      ${more}
      ${isImportConfigured() ? `<button class="btn btn--block" id="evsAi" style="margin-top:10px">✨ Chiedi un'idea nuova all'AI</button>` : ""}
      <div class="modal__actions"><button class="btn btn--primary" data-act="ok">Chiudi</button></div>`;
    m.el.querySelector('[data-act="ok"]').onclick = () => { m.close(); openEventSheet(eventId); };
    m.el.querySelectorAll(".diet-chip[data-c]").forEach((b) => b.addEventListener("click", () => { course = b.dataset.c; showAll = false; draw(); }));
    m.el.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", async () => {
      const r = store.getRecipe(b.dataset.add); if (!r) return;
      const dish = { id: (window.crypto && crypto.randomUUID ? crypto.randomUUID() : "d-" + Date.now().toString(36)), recipeId: r.id, title: r.title, reheatOnly: false, broughtByGuest: false, ...guessDishDefaults(r) };
      dish.course = course;
      const cur = store.getEvent(eventId);
      await store.updateEvent(eventId, { dishes: [...(cur.dishes || []), dish] });
      usedIds.add(r.id); haveByCourse[course] = (haveByCourse[course] || 0) + 1;
      toast(`Aggiunto: ${r.title}`, "success");
      draw();
    }));
    const moreB = m.el.querySelector("#evsMore"); if (moreB) moreB.onclick = () => { showAll = true; draw(); };
    const aiB = m.el.querySelector("#evsAi"); if (aiB) aiB.onclick = () => eventSuggestAI(eventId, course, month, guests);
  }
  draw();
}

async function eventSuggestAI(eventId, course, month, guests) {
  const avoid = [];
  for (const g of guests) { (g.tags || []).forEach((t) => avoid.push(t)); (g.dislikes || []).forEach((d) => avoid.push(d)); }
  const avoidStr = [...new Set(avoid)].join(", ");
  const note = `${course} della tradizione italiana per le feste, di stagione nel mese di ${monthName(month)}.` + (avoidStr ? ` IMPORTANTISSIMO: senza ${avoidStr}.` : "");
  const ingHint = seasonalProduce(month).map((p) => p.name).slice(0, 8).join(", ");
  toast("Sto pensando a un'idea…", "");
  try {
    const r = await generateRecipe(ingHint, note);
    if (!r || !r.title) { toast("Nessuna idea trovata. Riprova.", "error"); return; }
    const pseudo = { title: r.title, ingredients: (r.ingredients || []).map((s) => ({ name: s })), allergens: [] };
    const res = checkRecipeForGuests(pseudo, guests);
    const m = openModal(`
      <h3 class="modal__title">✨ ${escapeHtml(r.title)}</h3>
      ${res.safe
        ? `<p class="hint" style="color:var(--primary-2)">✓ Sembra sicura per tutti — ma controlla sempre gli ingredienti.</p>`
        : `<p class="hint" style="color:var(--danger)">⚠️ Potrebbe non andare bene (${escapeHtml([...new Set(res.hard.map((h) => h.reason))].join(", "))}). Controlla gli ingredienti.</p>`}
      <div class="hint" style="margin-bottom:8px"><b>Ingredienti:</b> ${escapeHtml((r.ingredients || []).join(", "))}</div>
      <p class="hint">È un'idea generata dall'AI: va controllata. Salvala nel ricettario per poterla aggiungere al menù.</p>
      <div class="modal__actions">
        <button class="btn" data-act="c">Chiudi</button>
        <button class="btn" data-act="another">Un'altra idea</button>
        <button class="btn btn--primary" data-act="save">Salva nel ricettario</button>
      </div>
    `);
    m.el.querySelector('[data-act="c"]').onclick = () => m.close();
    m.el.querySelector('[data-act="another"]').onclick = () => { m.close(); eventSuggestAI(eventId, course, month, guests); };
    m.el.querySelector('[data-act="save"]').onclick = () => { m.close(); openRecipeForm({ prefill: { title: r.title, servings: r.servings, ingredients: r.ingredients, steps: r.steps, tags: [course] } }); };
  } catch (e) {
    toast("Non riesco a generare un'idea ora. Riprova.", "error");
  }
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
  // --- Sezione "Account": dati account + nickname + casa condivisa ---
  let accountRows = "";
  if (!info.configured) {
    accountRows = `
        <div class="setting-row">
          <div>
            <div class="setting-row__label">Backup nel cloud: non attivo</div>
            <div class="setting-row__desc">I dati sono salvati solo su questo telefono. Per attivare la sincronizzazione apri il file <b>README.md</b> e segui la guida (configurazione Firebase in <code>js/config.js</code>).</div>
          </div>
        </div>`;
  } else if (info.email) {
    accountRows = `
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
        </div>`;
  }
  const nickRow = `
        <div class="setting-row">
          <div>
            <div class="setting-row__label">Nickname</div>
            <div class="setting-row__desc">${getNickname() ? "Come ti salutiamo: " + escapeHtml(getNickname()) : "Scegli come farti salutare."}</div>
          </div>
          <button class="btn" id="nickBtn">Cambia</button>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-row__label">🖼️ Copertina personale</div>
            <div class="setting-row__desc">${getCover() ? "Una tua foto in cima alla Home." : "Metti una foto (un piatto, un ricordo) in cima alla Home."}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn" id="coverBtn">${getCover() ? "Cambia" : "Scegli"}</button>
            ${getCover() ? `<button class="btn btn--ghost" id="coverDel" title="Rimuovi">${iconHtml("trash")}</button>` : ""}
          </div>
          <input type="file" id="coverFile" accept="image/*" hidden />
        </div>`;
  const householdRow = info.cloud ? `
        <div class="setting-row">
          <div>
            <div class="setting-row__label">Casa condivisa ${getHousehold() ? "✓" : ""}</div>
            <div class="setting-row__desc">${getHousehold() ? "Lista spesa e menù delle feste condivisi (codice " + escapeHtml(getHousehold()) + ")." : "Condividi lista della spesa e menù delle feste con un'altra persona."}</div>
          </div>
          <button class="btn" id="householdBtn">${getHousehold() ? "Gestisci" : "Attiva"}</button>
        </div>` : "";
  const accountGroup = `
      <h2 class="setting-section"><span class="setting-section__ic">👤</span> Account</h2>
      <div class="setting-group">${accountRows}${nickRow}${householdRow}</div>`;
  // --- Sezione "Amministrazione" (solo admin) ---
  const adminGroup = info.email === ADMIN_EMAIL ? `
      <h2 class="setting-section"><span class="setting-section__ic">🛠️</span> Amministrazione</h2>
      <div class="setting-group">
        <div class="setting-row">
          <div>
            <div class="setting-row__label">Accessi utenti</div>
            <div class="setting-row__desc">Statistiche sugli accessi di tutti gli utenti.</div>
          </div>
          <button class="btn" id="accStatsBtn">Apri</button>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-row__label">Avvisa tutti</div>
            <div class="setting-row__desc">Invia una notifica push per annunciare una novità.</div>
          </div>
          <button class="btn" id="bcastBtn">Invia</button>
        </div>
      </div>` : "";

  root.innerHTML = `
    <h1 class="page-title">Impostazioni</h1>
    <p class="page-sub">Tutto a portata di mano, raggruppato per argomento.</p>
    ${accountGroup}

    <h2 class="setting-section"><span class="setting-section__ic">📊</span> I tuoi numeri</h2>
    <div class="setting-group">
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Le tue statistiche di cucina</div>
          <div class="setting-row__desc">Ricette, preferiti, cotture, portate e ingredienti del cuore — con anelli e barre animate.</div>
        </div>
        <button class="btn btn--primary" id="statsBtn">Apri</button>
      </div>
    </div>

    <h2 class="setting-section"><span class="setting-section__ic">🎨</span> Aspetto</h2>
    <div class="setting-group">
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
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Dimensione testo</div>
          <div class="setting-row__desc">Ingrandisci o rimpicciolisci il testo dell'app.</div>
        </div>
        <select id="textSizeSel" class="mini-select">
          <option value="14">Piccolo</option>
          <option value="16">Normale</option>
          <option value="18">Grande</option>
          <option value="20">Molto grande</option>
        </select>
      </div>
      <label class="setting-row" style="cursor:pointer">
        <div>
          <div class="setting-row__label">Alto contrasto</div>
          <div class="setting-row__desc">Testi e bordi più marcati, per leggere meglio.</div>
        </div>
        <input type="checkbox" id="contrastChk" class="mini-check" ${getContrast() ? "checked" : ""} />
      </label>
      <div class="setting-row">
        <div>
          <div class="setting-row__label">🎉 Tema festa</div>
          <div class="setting-row__desc">Coriandoli e palloncini animati. In "Automatico" si accende da solo nei giorni di festa e quando hai un Menù delle feste in programma.</div>
        </div>
        <select id="festaSel" class="mini-select">
          <option value="off">Spento</option>
          <option value="auto">Automatico</option>
          <option value="on">Sempre acceso</option>
        </select>
      </div>
      <label class="setting-row" style="cursor:pointer">
        <div>
          <div class="setting-row__label">${{ primavera: "🌸", estate: "✨", autunno: "🍂", inverno: "❄️" }[currentSeason()]} Atmosfera stagionale</div>
          <div class="setting-row__desc">Petali, foglie, neve o pulviscolo dorato che fluttuano leggeri sullo sfondo, a seconda della stagione.</div>
        </div>
        <input type="checkbox" id="seasonChk" class="mini-check" ${getSeasonMode() !== "off" ? "checked" : ""} />
      </label>
      <label class="setting-row" style="cursor:pointer">
        <div>
          <div class="setting-row__label">🔊 Micro-suoni soft</div>
          <div class="setting-row__desc">Suoni gentili e discreti: il "tin" del timer, un fruscio sfogliando i passi, uno sparkle quando salvi o completi un piatto. <a href="#" id="soundTest">Prova</a></div>
        </div>
        <input type="checkbox" id="soundChk" class="mini-check" ${getSoundOn() ? "checked" : ""} />
      </label>
      <label class="setting-row" style="cursor:pointer">
        <div>
          <div class="setting-row__label">🪟 Vetro liquido</div>
          <div class="setting-row__desc">Card e pannelli in "vetro smerigliato" con un riflesso di luce che scorre mentre navighi. Look premium e arioso.</div>
        </div>
        <input type="checkbox" id="glassChk" class="mini-check" ${getGlassOn() ? "checked" : ""} />
      </label>
      <div class="setting-row">
        <div>
          <div class="setting-row__label">🔋 Risparmio batteria</div>
          <div class="setting-row__desc">Spegne gli effetti continui più pesanti (sfondo aurora, atmosfera stagionale, vetro, Cucina viva, vapore). In "Automatico" si attiva da solo quando la batteria è scarica.</div>
        </div>
        <select id="powerSel" class="mini-select">
          <option value="off">Spento</option>
          <option value="auto">Automatico</option>
          <option value="on">Sempre acceso</option>
        </select>
      </div>
    </div>

    <h2 class="setting-section"><span class="setting-section__ic">🍽️</span> Preferenze di cucina</h2>
    <div class="setting-group">
      <div class="setting-row setting-row--intro" style="display:block">
        <div class="setting-row__desc">Aggiunge il filtro "Per me" in Home e nasconde le ricette non adatte.</div>
      </div>
      <label class="setting-row" style="cursor:pointer">
        <div class="setting-row__label">🥗 Vegetariano (niente carne/pesce)</div>
        <input type="checkbox" class="mini-check" data-pref="dietVeg" ${prefBool("dietVeg") ? "checked" : ""} />
      </label>
      <label class="setting-row" style="cursor:pointer">
        <div class="setting-row__label">🌾 Senza glutine</div>
        <input type="checkbox" class="mini-check" data-pref="dietNg" ${prefBool("dietNg") ? "checked" : ""} />
      </label>
      <label class="setting-row" style="cursor:pointer">
        <div class="setting-row__label">🥛 Senza lattosio</div>
        <input type="checkbox" class="mini-check" data-pref="dietNl" ${prefBool("dietNl") ? "checked" : ""} />
      </label>
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Porzioni predefinite</div>
          <div class="setting-row__desc">Apri le ricette già regolate sul numero di persone.</div>
        </div>
        <select id="defServSel" class="mini-select">
          ${[0, 1, 2, 3, 4, 5, 6, 8].map((n) => `<option value="${n}">${n === 0 ? "Come la ricetta" : n + (n === 1 ? " persona" : " persone")}</option>`).join("")}
        </select>
      </div>
    </div>

    <h2 class="setting-section"><span class="setting-section__ic">🏠</span> Schermata Home</h2>
    <div class="setting-group">
      <div class="setting-row setting-row--intro" style="display:block">
        <div class="setting-row__desc">Scegli cosa mostrare nella schermata iniziale.</div>
      </div>
      <label class="setting-row" style="cursor:pointer">
        <div class="setting-row__label">✨ Ricetta del giorno</div>
        <input type="checkbox" class="mini-check" data-pref="homeRotd" ${prefBool("homeRotd", true) ? "checked" : ""} />
      </label>
      <label class="setting-row" style="cursor:pointer">
        <div class="setting-row__label">📅 Oggi si mangia</div>
        <input type="checkbox" class="mini-check" data-pref="homeToday" ${prefBool("homeToday", true) ? "checked" : ""} />
      </label>
      <label class="setting-row" style="cursor:pointer">
        <div class="setting-row__label">🥕 Di stagione</div>
        <input type="checkbox" class="mini-check" data-pref="homeSeason" ${prefBool("homeSeason", true) ? "checked" : ""} />
      </label>
      <label class="setting-row" style="cursor:pointer">
        <div class="setting-row__label">⏳ Non lo cucini da un po'</div>
        <input type="checkbox" class="mini-check" data-pref="homeNeglect" ${prefBool("homeNeglect", true) ? "checked" : ""} />
      </label>
      <label class="setting-row" style="cursor:pointer">
        <div class="setting-row__label">✨ Suggeriti per te</div>
        <input type="checkbox" class="mini-check" data-pref="homeSuggest" ${prefBool("homeSuggest", true) ? "checked" : ""} />
      </label>
    </div>

    <h2 class="setting-section"><span class="setting-section__ic">🔔</span> Promemoria e notifiche</h2>
    ${notifyGroupHtml()}

    <h2 class="setting-section"><span class="setting-section__ic">🧰</span> Strumenti</h2>
    <div class="setting-group">
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Convertitore in cucina</div>
          <div class="setting-row__desc">Tazze, cucchiai, grammi, °C/°F.</div>
        </div>
        <button class="btn" id="convBtn">Apri</button>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Timer da cucina</div>
          <div class="setting-row__desc">Più timer con nome, sempre attivi mentre usi l'app.</div>
        </div>
        <button class="btn" id="timersBtn">Apri</button>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Ripristina strumenti predefiniti</div>
          <div class="setting-row__desc">Aggiunge gli strumenti di base mancanti (senza duplicare né cancellare i tuoi).</div>
        </div>
        <button class="btn" id="seedBtn">Aggiungi</button>
      </div>
    </div>

    <h2 class="setting-section"><span class="setting-section__ic">💾</span> Dati e backup</h2>
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

    <h2 class="setting-section"><span class="setting-section__ic">ℹ️</span> Informazioni</h2>
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
    </div>
    ${adminGroup}
    <p style="text-align:center;color:var(--text-soft);font-size:0.78rem;margin-top:24px">
      Fornelli · versione ${escapeHtml(APP_VERSION)}
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
  const timersBtn = root.querySelector("#timersBtn");
  if (timersBtn) timersBtn.addEventListener("click", () => openTimersTool());
  const householdBtn = root.querySelector("#householdBtn");
  if (householdBtn) householdBtn.addEventListener("click", () => openHouseholdSheet());
  root.querySelector("#nickBtn").addEventListener("click", () => openChangeNickname());
  const coverBtn = root.querySelector("#coverBtn");
  const coverFile = root.querySelector("#coverFile");
  if (coverBtn && coverFile) {
    coverBtn.addEventListener("click", () => coverFile.click());
    coverFile.addEventListener("change", async () => {
      const f = coverFile.files[0]; coverFile.value = "";
      if (!f) return;
      try {
        const url = await fileToDataUrl(f, 1100, 0.74);
        setCover(url);
        if (!getCover()) { toast("Foto troppo grande per la memoria del telefono", "error"); return; }
        toast("Copertina impostata", "success"); render();
      } catch (e) { toast("Immagine non valida", "error"); }
    });
  }
  const coverDel = root.querySelector("#coverDel");
  if (coverDel) coverDel.addEventListener("click", () => { setCover(""); toast("Copertina rimossa"); render(); });
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
  themeSel.addEventListener("change", () => switchThemeReveal(themeSel.value, themeSel));
  const textSizeSel = root.querySelector("#textSizeSel");
  if (textSizeSel) { textSizeSel.value = String(getTextScale()); textSizeSel.addEventListener("change", () => setTextScale(parseInt(textSizeSel.value, 10))); }
  const contrastChk = root.querySelector("#contrastChk");
  if (contrastChk) contrastChk.addEventListener("change", () => setContrast(contrastChk.checked));
  const festaSel = root.querySelector("#festaSel");
  if (festaSel) { festaSel.value = getFestaMode(); festaSel.addEventListener("change", () => setFesta(festaSel.value)); }
  const seasonChk = root.querySelector("#seasonChk");
  if (seasonChk) seasonChk.addEventListener("change", () => setSeason(seasonChk.checked ? "on" : "off"));
  const soundChk = root.querySelector("#soundChk");
  if (soundChk) soundChk.addEventListener("change", () => { setSoundOn(soundChk.checked); if (soundChk.checked) playSample(); });
  const soundTest = root.querySelector("#soundTest");
  if (soundTest) soundTest.addEventListener("click", (e) => { e.preventDefault(); playSample(); });
  const glassChk = root.querySelector("#glassChk");
  if (glassChk) glassChk.addEventListener("change", () => setGlass(glassChk.checked));
  const powerSel = root.querySelector("#powerSel");
  if (powerSel) { powerSel.value = getPowerMode(); powerSel.addEventListener("change", () => setPowerMode(powerSel.value)); }
  const statsBtn = root.querySelector("#statsBtn");
  if (statsBtn) statsBtn.addEventListener("click", () => openStatsDashboard());
  const defServSel = root.querySelector("#defServSel");
  if (defServSel) { defServSel.value = String(prefNum("defServings", 0)); defServSel.addEventListener("change", () => setPrefNum("defServings", parseInt(defServSel.value, 10))); }
  root.querySelectorAll("[data-pref]").forEach((cb) => cb.addEventListener("change", () => setPrefBool(cb.dataset.pref, cb.checked)));
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
    try { localStorage.setItem("ricettario.lastBackup", new Date().toISOString()); } catch (e) {}
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
