// Interfaccia utente: rendering delle schermate, modali e gestione eventi.
import * as store from "./store.js";
import * as mealdb from "./mealdb.js";
import { ITALIAN_SITES } from "./sites.js";
import { iconHtml, rawIcon, ICON_PICKER, resolveIcon } from "./icons.js";
import { parseList, ingredientText, formatQty, categorize, CATEGORY_ORDER } from "./ingredients.js";
import { estimateNutrition, enrichWithOFF } from "./nutrition.js";
import { notifySupported, notifyEnabled, getNotifyPrefs, setNotifyPref, enableNotify, disableNotify, sendTestNotification, isIosNotInstalled } from "./notify.js";
import { pushReady, isPushSubscribed, registerPush, refreshReminders, unregisterPush } from "./push.js";
import { importFromUrl } from "./import-recipe.js";
import { isImportConfigured } from "./config.js";
import { fileToDataUrl } from "./image.js";
import { getTheme, setTheme } from "./theme.js";

// Tag suggeriti nel form ricetta.
const TAG_SUGGESTIONS = ["Primi", "Secondi", "Contorni", "Antipasti", "Dolci", "Veloce", "Vegetariano", "Pesce", "Per ospiti"];

// Animazioni: rispetta la preferenza di sistema "riduci animazioni".
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Esegue una transizione animata tra schermate (stile iOS) quando supportata.
function withTransition(fn) {
  if (reduceMotion || !document.startViewTransition) return fn();
  document.startViewTransition(fn);
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
let planView = "month"; // "month" | "week"
let weekAnchor = null; // data di riferimento per la vista settimana

// Stato locale della sezione Ricettario (per non perdere i risultati ad ogni render).
let mealTab = "online";
let mealQuery = "";
let mealResults = null;
let mealLoading = false;
let mealError = "";

// Callback impostate da app.js
export const handlers = {
  onLogin: async () => {},
  onSignup: async () => {},
  onLogout: async () => {},
  getAccountInfo: () => ({ cloud: false, configured: false, email: null })
};

// Colori di "bagliore" assegnati a rotazione agli strumenti.
const ACCENTS = ["#ff5e7e", "#ff9a3d", "#5ea8ff", "#36d1b7", "#b06cff", "#ffd166", "#ff7a3d", "#4dd0a0"];

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
    if (!localStorage.getItem("ricettario.guide.v5")) {
      localStorage.setItem("ricettario.guide.v5", "1");
      setTimeout(() => openGuide(true), 500);
    }
  } catch {}
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
function recipeResultRow(r) {
  const tool = store.getTool(r.toolId);
  const fav = r.favorite ? ` <span class="meta-fav">${iconHtml("heart")}</span>` : "";
  const rate = r.rating ? ` <span class="meta-star">${iconHtml("star")} ${r.rating}</span>` : "";
  const cooked = r.cookCount ? ` <span class="meta-cooked">${iconHtml("fire")} ${r.cookCount}</span>` : "";
  const thumb = r.photo ? `<img class="pick-thumb" src="${escapeHtml(r.photo)}" alt="" />` : `<span class="day-row__icon">${tool ? iconHtml(tool.icon) : iconHtml("fork-knife")}</span>`;
  return `<button class="pick-row" data-id="${r.id}">${thumb}<span class="day-row__name">${escapeHtml(r.title)}${fav}${rate}${cooked}</span></button>`;
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
    else results = store.getByTag(homeFilter);
    body.innerHTML = results.length
      ? results.map(recipeResultRow).join("")
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

  const specials = [
    { k: "fav", label: "Preferiti", icon: "heart" },
    { k: "cooked", label: "Più cucinate", icon: "fire" },
    { k: "recent", label: "Di recente", icon: "timer" },
    { k: "menu", label: "Menu", icon: "book-bookmark" }
  ];
  const chips = specials.map((s) => `<button class="filter-chip ${homeFilter === s.k ? "is-on" : ""}" data-filter="${s.k}">${iconHtml(s.icon)} ${s.label}</button>`).join("") +
    allTags.map((t) => `<button class="filter-chip ${homeFilter === t ? "is-on" : ""}" data-filter="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("");

  root.innerHTML = `
    <h1 class="page-title">Strumenti di cottura</h1>
    <div class="home-hero">
      <div>
        <div class="home-hero__num" id="heroNum">${total}</div>
        <div class="home-hero__lbl">${total === 1 ? "ricetta salvata" : "ricette salvate"}</div>
      </div>
      <button class="home-hero__btn" id="heroAdd">${iconHtml("plus")} Nuova ricetta</button>
    </div>
    ${expBanner}
    ${todayCard}
    ${banner}
    <div class="search-bar">
      <input type="search" id="homeSearch" placeholder="Cerca tra le tue ricette..." value="${escapeHtml(homeQuery)}" />
    </div>
    <div class="home-tags">${chips}</div>
    <div id="homeBody"></div>
  `;

  root.querySelector("#heroAdd").addEventListener("click", () => openRecipeForm({}));
  const ea = root.querySelector("#expAlert");
  if (ea) ea.addEventListener("click", () => { shopTab = "dispensa"; navigate("spesa"); });
  root.querySelectorAll(".today__item").forEach((b) => b.addEventListener("click", () => openRecipe(b.dataset.recipe)));

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
  renderHomeBody();
  countUp(root.querySelector("#heroNum"), total);
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

  const ingList = ingredients.length
    ? `<div class="ing-list">${ingredients
        .map((it, i) => `<div class="ing-row"><span class="ing-dot" style="--ac:${ACCENTS[i % ACCENTS.length]}"></span>${escapeHtml(ingredientText(it, factor))}</div>`)
        .join("")}</div>
       <button class="btn btn--primary btn--block" id="addToCart" style="margin-top:14px">${iconHtml("shopping-cart-simple")} Aggiungi alla lista della spesa</button>`
    : `<div class="hint">Nessun ingrediente salvato. Aggiungili con <b>Modifica</b>.</div>`;

  const ratingRow = `<div class="rating" id="rating">${[1, 2, 3, 4, 5]
    .map((v) => `<button class="star ${v <= (r.rating || 0) ? "is-on" : ""}" data-v="${v}">${iconHtml("star")}</button>`)
    .join("")}</div>`;

  root.innerHTML = `
    <div class="toolbar">
      <button class="back-btn" id="back">${iconHtml("arrow-left")}</button>
      <div class="toolbar__title" style="flex:1">${escapeHtml(r.title)}</div>
      <button class="back-btn fav-btn ${r.favorite ? "is-fav" : ""}" id="favBtn" title="Preferito">${iconHtml("heart")}</button>
    </div>
    ${r.photo ? `<img class="recipe-photo" src="${escapeHtml(r.photo)}" alt="" />` : ""}
    <div class="detail-top">
      ${tool ? `<span class="recipe-tool-chip" style="margin:0">${iconHtml(tool.icon)} ${escapeHtml(tool.name)}</span>` : "<span></span>"}
      ${ratingRow}
    </div>
    ${tagsArr.length ? `<div class="tag-row">${tagsArr.map((t) => `<span class="tagchip tagchip--ro">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
    ${url ? `<a class="btn btn--block" id="openLink" href="${escapeHtml(url)}" target="_blank" rel="noopener" style="margin-bottom:16px">${iconHtml("arrow-square-out")} Apri la ricetta</a>` : ""}

    <div class="section-card">
      <h3 class="section-title">${iconHtml("list-bullets")} Ingredienti</h3>
      ${stepper}
      ${ingList}
    </div>

    ${ingredients.length ? `<div class="section-card" id="nutriCard">${nutritionCardHtml(r, base, detailServings)}</div>` : ""}

    ${steps.length ? `<div class="section-card">
      <h3 class="section-title">${iconHtml("fork-knife")} Preparazione</h3>
      <ol class="steps-list">${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
      <button class="btn btn--primary btn--block" id="cookBtn" style="margin-top:6px">${iconHtml("fire")} Modalità cucina</button>
    </div>` : ""}

    ${r.notes ? `<div class="section-card"><h3 class="section-title">${iconHtml("note-pencil")} Note</h3><div class="recipe-item__notes" style="margin-top:0">${escapeHtml(r.notes)}</div></div>` : ""}

    <button class="btn btn--block" id="cookedBtn" style="margin-bottom:10px">${iconHtml("fire")} Segna come cucinata${r.cookCount ? ` · ${r.cookCount} ${r.cookCount === 1 ? "volta" : "volte"}` : ""}</button>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="btn btn--ghost" id="editRecipe">${iconHtml("pencil-simple")} Modifica</button>
      <button class="btn btn--ghost" id="shareRecipe">${iconHtml("arrow-square-out")} Condividi</button>
      <button class="btn btn--ghost" id="delRecipe" style="color:var(--danger)">${iconHtml("trash")} Elimina</button>
    </div>
  `;

  root.querySelector("#back").addEventListener("click", () => { currentRecipeId = null; detailServings = null; withTransition(() => render()); });
  const pMinus = root.querySelector("#pMinus");
  const pPlus = root.querySelector("#pPlus");
  if (pMinus) pMinus.addEventListener("click", () => { detailServings = Math.max(1, (detailServings || base || 1) - 1); render(); });
  if (pPlus) pPlus.addEventListener("click", () => { detailServings = (detailServings || base || 1) + 1; render(); });

  root.querySelector("#favBtn").addEventListener("click", () => store.updateRecipe(r.id, { favorite: !r.favorite }));
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

  const cookBtn = root.querySelector("#cookBtn");
  if (cookBtn) cookBtn.addEventListener("click", () => openCookingMode(r));

  root.querySelector("#cookedBtn").addEventListener("click", async () => { await store.markCooked(r.id); toast("Segnata come cucinata 🔥", "success"); });

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
  const note = nut.skipped ? `<div class="hint" style="margin-top:8px">Stima da ${nut.used} ingredienti${nut.skipped > 0 ? ` · ${nut.skipped} non conteggiati` : ""}.</div>` : "";
  return `${title}
    <div class="nutri-box">${rows.join("")}</div>
    ${note}
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
        result = { total: enriched.total, used: enriched.used, skipped: enriched.stillMissing.length };
      } catch (e) {
        result = { total: est.total, used: est.used, skipped: est.skipped.length };
      }
      btn.disabled = false;
    } else {
      result = { total: est.total, used: est.used, skipped: est.skipped.length };
    }
    const nutrition = { ...result.total, used: result.used, skipped: result.skipped };
    await store.updateRecipe(r.id, { nutrition });
    r.nutrition = nutrition;
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
function openCookingMode(recipe) {
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  if (!steps.length) return;
  let idx = 0;
  let wakeLock = null;
  let timers = []; // { id, label, remaining, running }
  let ticker = null;
  let tseq = 0;
  let speak = false; // lettura vocale

  const host = document.getElementById("modalRoot");
  const el = document.createElement("div");
  el.className = "cook";
  host.appendChild(el);

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
        <button class="cook__close ${speak ? "is-on" : ""}" id="ckSpeak" title="Leggi ad alta voce">🔊</button>
      </div>
      <div class="cook__track"><div class="cook__fill" style="width:${((idx + 1) / steps.length) * 100}%"></div></div>
      <div class="cook__body"><div class="cook__step">${escapeHtml(steps[idx])}</div></div>
      <div class="cook__timers" id="ckTimers"></div>
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
    el.querySelector("#ckClose").onclick = close;
    el.querySelector("#ckSpeak").onclick = () => { speak = !speak; if (speak) speakStep(); else stopSpeak(); el.querySelector("#ckSpeak").classList.toggle("is-on", speak); };
    el.querySelector("#ckPrev").onclick = () => { if (idx > 0) { idx--; draw(); speakStep(); } };
    el.querySelector("#ckNext").onclick = () => { if (idx < steps.length - 1) { idx++; draw(); speakStep(); } else { store.markCooked(recipe.id); close(); } };
    el.querySelector("#tAdd").onclick = () => { addTimer(el.querySelector("#tMin").value, el.querySelector("#tName").value); el.querySelector("#tName").value = ""; };
    paintTimers();
  }

  function close() {
    if (ticker) clearInterval(ticker);
    release();
    stopSpeak();
    document.removeEventListener("visibilitychange", onVis);
    el.remove();
  }

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
  const ingText = recipe
    ? (recipe.ingredients || []).map((i) => i.raw || ingredientText(i)).join("\n")
    : (prefill && prefill.ingredients ? prefill.ingredients.join("\n") : "");
  const stepsText = recipe
    ? (recipe.steps || []).join("\n")
    : (prefill && prefill.steps ? prefill.steps.join("\n") : "");
  let photo = recipe ? (recipe.photo || "") : (prefill && prefill.image ? prefill.image : "");
  let tags = recipe ? [...(recipe.tags || [])] : [];

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
      <label>Link della ricetta (facoltativo)</label>
      <input type="url" id="rUrl" inputmode="url" placeholder="https://..." value="${escapeHtml(url)}" />
      ${importBtn}
    </div>
    <div class="field">
      <label>Per quante persone? (facoltativo)</label>
      <input type="number" id="rServings" inputmode="numeric" min="1" placeholder="Es. 4" value="${escapeHtml(servings)}" />
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
      if (data.ingredients && data.ingredients.length) m.el.querySelector("#rIngredients").value = data.ingredients.join("\n");
      if (data.steps && data.steps.length) m.el.querySelector("#rSteps").value = data.steps.join("\n");
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
      steps: m.el.querySelector("#rSteps").value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
      photo: photo,
      tags: tags
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
    resultsHtml = `<div class="empty"><span class="empty__emoji">${iconHtml("magnifying-glass")}</span>Nessun risultato. Prova un altro termine (in inglese funziona meglio, es. "chicken").</div>`;
  } else if (mealResults) {
    resultsHtml = mealResults.map(mealCardHtml).join("");
  } else {
    resultsHtml = `<div class="empty"><span class="empty__emoji">${iconHtml("fork-knife")}</span>Cerca una ricetta oppure tocca <b>Ispirami</b>.<br><small>Fonte: TheMealDB (in inglese)</small></div>`;
  }

  body.innerHTML = `
    <div class="search-bar">
      <input type="search" id="mealSearch" placeholder="Cerca (es. pasta, chicken...)" value="${escapeHtml(mealQuery)}" />
      <button class="btn btn--primary" id="mealSearchBtn">Cerca</button>
    </div>
    <div style="margin-bottom:16px"><button class="btn btn--ghost" id="mealRandom">${iconHtml("shuffle")} Ispirami</button></div>
    <div id="mealResults">${resultsHtml}</div>
  `;

  const input = body.querySelector("#mealSearch");
  const doSearch = async () => {
    const q = input.value.trim();
    if (!q) return;
    mealQuery = q; mealLoading = true; mealError = ""; renderOnlineTab();
    try {
      mealResults = await mealdb.searchMeals(q);
    } catch (e) {
      mealError = "Connessione assente o servizio non raggiungibile.";
      mealResults = null;
    }
    mealLoading = false; renderOnlineTab();
  };
  body.querySelector("#mealSearchBtn").addEventListener("click", doSearch);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
  body.querySelector("#mealRandom").addEventListener("click", async () => {
    mealLoading = true; mealError = ""; mealQuery = ""; renderOnlineTab();
    try { mealResults = await mealdb.randomMeals(6); }
    catch (e) { mealError = "Connessione assente o servizio non raggiungibile."; mealResults = null; }
    mealLoading = false; renderOnlineTab();
  });

  body.querySelectorAll(".meal-card").forEach((card) => {
    const data = JSON.parse(card.dataset.meal);
    card.querySelector('[data-act="save"]').addEventListener("click", () =>
      openRecipeForm({ prefill: { title: data.title, url: data.link, ingredients: data.ingredients || [], steps: data.steps || [] } })
    );
  });
}

function mealCardHtml(m) {
  const meta = [m.category, m.area].filter(Boolean).join(" · ");
  return `
    <div class="meal-card" data-meal='${escapeHtml(JSON.stringify(m))}'>
      <img src="${escapeHtml(m.thumb)}" alt="" loading="lazy" />
      <div class="meal-card__body">
        <h3 class="meal-card__title">${escapeHtml(m.title)}</h3>
        <div class="meal-card__meta">${escapeHtml(meta)}</div>
        <div class="meal-card__actions">
          <a class="chip" href="${escapeHtml(safeUrl(m.link))}" target="_blank" rel="noopener">${iconHtml("arrow-square-out")} Apri</a>
          <button class="chip" data-act="save">${iconHtml("plus")} Salva</button>
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
  { icon: "book-open", title: "Ricettario", text: "Cerca idee online o tra i siti italiani; tocca \"Salva\" per aggiungerle a uno dei tuoi strumenti." },
  { icon: "fork-knife", title: "Porzioni su misura", text: "Apri una ricetta e cambia il numero di persone con + e −: le quantità degli ingredienti si ricalcolano da sole." },
  { icon: "carrot", title: "Valori nutrizionali", text: "In una ricetta tocca \"Calcola\" sotto gli ingredienti: l'app stima calorie e macronutrienti (proteine, carboidrati, grassi) per porzione e totali. Per ciò che non conosce cerca online su Open Food Facts. È una stima: cambia con il numero di porzioni." },
  { icon: "heart", title: "Trova al volo", text: "Dalla schermata Strumenti cerca per nome o ingrediente e usa i filtri: Preferiti (cuore), Più cucinate, Di recente e le categorie. Dai un voto a stelle e tocca \"Segna come cucinata\" per tenere il conto." },
  { icon: "shopping-cart-simple", title: "Spesa & Dispensa", text: "Aggiungi gli ingredienti alla lista della spesa (uniti e per reparto). Spunta ciò che prendi e con \"Spesa fatta\" passa tutto in dispensa. In Dispensa tieni ciò che hai già — con la scadenza, e l'app ti avvisa quando qualcosa sta per scadere — e \"Cosa posso cucinare\" suggerisce le ricette con quello che hai." },
  { icon: "fire", title: "Modalità cucina", text: "Nelle ricette con i passi, tocca \"Modalità cucina\": istruzioni passo-passo, più timer con nome (pasta, forno…), lettura vocale (🔊) e schermo sempre acceso mentre cucini." },
  { icon: "calendar-blank", title: "Pianificazione", text: "Nel calendario (vista Mese o Settimana) assegna le ricette ai giorni in pranzo o cena, usa \"Riempi le cene\" per riempire la settimana e genera la spesa del mese o della settimana." },
  { icon: "book-bookmark", title: "Menu", text: "Dalla schermata Strumenti, filtro \"Menu\": raggruppa più ricette (es. \"Cena con amici\") e genera un'unica lista della spesa." },
  { icon: "arrow-square-out", title: "Condividi", text: "Da una ricetta tocca \"Condividi\" per inviarla a qualcuno (WhatsApp, email…) con ingredienti e preparazione." },
  { icon: "calendar-dots", title: "Promemoria", text: "In Opzioni attiva i \"Promemoria\": l'app ti avvisa con una notifica delle scadenze in dispensa e del pasto pianificato di oggi quando la apri. Su iPhone aggiungi prima l'app alla schermata Home." },
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
      ${firstRun ? `<div class="guide__hero"><img class="brand-logo" src="icons/icon.svg" alt="" /><h2 style="margin:0 0 4px">Benvenuta! 👋</h2><p style="color:var(--text-soft);margin:0">Ecco tutto quello che puoi fare.</p></div>` : ""}
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
    <div class="shop-row ${it.checked ? "is-checked" : ""}" data-id="${it.id}">
      <button class="check" data-act="check">${it.checked ? iconHtml("check") : ""}</button>
      <span class="shop-row__name">${escapeHtml(it.name)}${amount ? ` <span class="shop-row__amt">${escapeHtml(amount)}</span>` : ""}</span>
      <button class="icon-btn icon-btn--danger shop-row__del" data-act="del">${iconHtml("trash")}</button>
    </div>`;
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
    const orderedCats = CATEGORY_ORDER.filter((c) => groups[c]);
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
    ${done.length ? `<button class="btn btn--primary btn--block" id="toPantry" style="margin-top:18px">${iconHtml("basket")} Spesa fatta: presi in dispensa</button>` : ""}
    ${items.length ? `<div style="display:flex;gap:8px;margin-top:${done.length ? "8px" : "18px"}">
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
    rowEl.querySelector('[data-act="check"]').addEventListener("click", () => {
      const it = store.getShopping().find((s) => s.id === id);
      store.toggleShoppingItem(id, !(it && it.checked));
    });
    rowEl.querySelector('[data-act="del"]').addEventListener("click", () => store.deleteShoppingItem(id));
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
  wrap.querySelectorAll(".shop-row").forEach((rowEl) => {
    rowEl.querySelector('[data-act="del"]').addEventListener("click", () => store.deletePantryItem(rowEl.dataset.id));
  });
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

  const m = openModal(`
    <h3 class="modal__title">${formatDateLong(date)}</h3>
    <div id="dayRows">${groupsHtml}</div>
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
    </div>` : ""}
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
          <div class="setting-row__label">Tema</div>
          <div class="setting-row__desc">Aspetto chiaro o scuro.</div>
        </div>
        <select id="themeSel" class="mini-select">
          <option value="dark">🌙 Scuro</option>
          <option value="light">☀️ Chiaro</option>
        </select>
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
    </div>
    <div class="setting-group">
      <div class="setting-row">
        <div>
          <div class="setting-row__label">Ripristina strumenti predefiniti</div>
          <div class="setting-row__desc">Aggiunge gli strumenti di base (non cancella i tuoi).</div>
        </div>
        <button class="btn" id="seedBtn">Aggiungi</button>
      </div>
    </div>
    <p style="text-align:center;color:var(--text-soft);font-size:0.78rem;margin-top:24px">
      Fornelli · Ricette online da TheMealDB
    </p>
    <input type="file" id="importFile" accept="application/json,.json" style="display:none" />
  `;

  const logoutBtn = root.querySelector("#logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    const ok = await confirmDialog({ title: "Uscire dall'account?", message: "Potrai rientrare con email e password.", confirmText: "Esci" });
    if (ok) await handlers.onLogout();
  });

  root.querySelector("#guideBtn").addEventListener("click", () => openGuide());

  const themeSel = root.querySelector("#themeSel");
  themeSel.value = getTheme();
  themeSel.addEventListener("change", () => setTheme(themeSel.value));

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

  root.querySelector("#seedBtn").addEventListener("click", async () => {
    await store.seedDefaults();
    toast("Strumenti predefiniti aggiunti", "success");
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
      </div>
    `;
    const submit = async () => {
      const email = root.querySelector("#loginEmail").value.trim();
      const pass = root.querySelector("#loginPass").value;
      if (!email || !pass) { toast("Inserisci email e password", "error"); return; }
      const btn = root.querySelector("#loginSubmit");
      btn.disabled = true; btn.textContent = "Attendere...";
      try {
        if (isRegister) await handlers.onSignup(email, pass);
        else await handlers.onLogin(email, pass);
      } catch (e) {
        toast(e.message || "Errore di accesso", "error");
        btn.disabled = false; btn.textContent = isRegister ? "Crea account" : "Accedi";
      }
    };
    root.querySelector("#loginSubmit").addEventListener("click", submit);
    root.querySelector("#loginPass").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    root.querySelector("#toggleMode").addEventListener("click", () => { isRegister = !isRegister; draw(); });
  };
  draw();
}
