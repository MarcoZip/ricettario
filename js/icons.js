// Helper per le icone Phosphor (duotone) incorporate in icons-data.js.
import { ICONS } from "./icons-data.js";

// Mappa di compatibilità: strumenti salvati in passato con un'emoji vengono
// mostrati con l'icona corrispondente, senza dover modificare i dati.
export const EMOJI_TO_PH = {
  "🍟": "fan", "🔥": "oven", "⚡": "lightning", "🍳": "fire", "♨️": "wind", "⏲️": "cooking-pot",
  "🥘": "cooking-pot", "🍲": "bowl-food", "🫕": "cooking-pot", "🍞": "bread", "🥖": "bread",
  "🧁": "cake", "🍰": "cake", "🥧": "pizza", "🍕": "pizza", "🍝": "fork-knife", "🥩": "knife",
  "🍗": "fork-knife", "🐟": "fish", "🥦": "carrot", "🥕": "carrot", "🧂": "jar", "☕": "coffee",
  "🍵": "coffee", "🧆": "bowl-food", "🥟": "cookie", "🌮": "hamburger", "🥗": "bowl-food",
  "🍮": "ice-cream", "🫓": "bread", "🥞": "cookie", "🍽️": "fork-knife"
};

// Icone proposte nel selettore quando si crea/modifica uno strumento.
export const ICON_PICKER = [
  "food-processor", "oven", "fan", "fire", "lightning", "wind", "cooking-pot", "bowl-food", "bowl-steam",
  "basket", "fork-knife", "knife", "thermometer", "timer", "pizza", "hamburger", "bread",
  "cake", "cookie", "ice-cream", "popcorn", "egg", "fish", "carrot", "pepper",
  "grains", "coffee", "wine", "beer-stein", "jar", "avocado", "orange-slice", "heart"
];

// Emoji extra selezionabili come icona dello strumento (oltre alle icone disegnate).
// Vengono mostrate così come sono (iconHtml fa da fallback), ampliando molto la scelta.
export const EMOJI_PICKER = [
  "🍳", "🥘", "🍲", "🫕", "🍜", "🍝", "🍛", "🍚", "🍱", "🥗", "🌮", "🌯", "🥙", "🥪", "🍔", "🌭",
  "🥟", "🍤", "🍣", "🍙", "🥡", "🍢", "🍗", "🍖", "🥩", "🥓", "🦐", "🐟", "🥚", "🧀", "🥦", "🥕",
  "🌽", "🌶️", "🍅", "🍆", "🥔", "🍄", "🧄", "🧅", "🥑", "🍋", "🍊", "🍎", "🍇", "🍓", "🍌", "🍍",
  "🍰", "🧁", "🎂", "🍮", "🍪", "🍩", "🍫", "🍯", "🥐", "🥨", "🥞", "🧇", "☕", "🍵", "🥤", "🍷",
  "🍺", "🍸", "🥂", "🍾", "🧊", "🔥", "♨️", "🧂", "🔪", "🥄", "🫙", "🥣", "🤖", "🍴", "🍽️", "🧑‍🍳", "👩‍🍳"
];

export function hasIcon(name) {
  return Boolean(name && ICONS[name]);
}

// Restituisce il nome Phosphor da usare, oppure null se è un'emoji sconosciuta.
export function resolveIcon(icon) {
  if (!icon) return "cooking-pot";
  if (ICONS[icon]) return icon;
  if (EMOJI_TO_PH[icon]) return EMOJI_TO_PH[icon];
  return null;
}

// SVG grezzo (per iniezioni dirette, es. barra di navigazione).
export function rawIcon(name) {
  return ICONS[name] || "";
}

// HTML pronto: <span class="ic">…svg…</span>, oppure l'emoji se sconosciuta.
export function iconHtml(icon, extraClass = "") {
  const name = resolveIcon(icon);
  const cls = "ic" + (extraClass ? " " + extraClass : "");
  if (name && ICONS[name]) return `<span class="${cls}">${ICONS[name]}</span>`;
  // Fallback: mostra comunque l'emoji originale.
  return `<span class="${cls} ic--emoji">${icon}</span>`;
}
