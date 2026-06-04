// Genera una "cartolina" della ricetta (immagine PNG) da condividere/scaricare.
// Disegna su canvas: intestazione arancione col cappello, titolo, foto (se
// caricabile senza problemi di CORS) e ingredienti. Niente dipendenze esterne.

const W = 880;
const M = 48; // margine

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// Carica un'immagine in modo "sicuro" per il canvas (CORS anonimo). Se non si può,
// restituisce null senza contaminare il canvas.
function loadImageSafe(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawHat(ctx, cx, cy, s) {
  // cappello bianco stilizzato (come il logo), scala s (1 = ~80px)
  ctx.save();
  ctx.fillStyle = "#fff";
  const P = (x, y, r) => { ctx.beginPath(); ctx.arc(cx + x * s, cy + y * s, r * s, 0, Math.PI * 2); ctx.fill(); };
  P(0, -10, 22);
  P(-22, -3, 17);
  P(22, -3, 17);
  ctx.fillRect(cx - 24 * s, cy - 12 * s, 48 * s, 26 * s);
  roundRect(ctx, cx - 21 * s, cy + 10 * s, 42 * s, 18 * s, 5 * s);
  ctx.fill();
  ctx.restore();
}

export async function buildRecipeCard(recipe, toolName, ingredientLines) {
  const img = await loadImageSafe(recipe.photo);
  const ingredients = (ingredientLines || []).slice(0, 14);

  // --- misura altezza dinamica ---
  const probe = document.createElement("canvas").getContext("2d");
  probe.font = "700 46px -apple-system, Segoe UI, Roboto, sans-serif";
  const titleLines = wrapText(probe, recipe.title, W - 2 * M).slice(0, 3);

  const headerH = 168;
  const titleH = titleLines.length * 56 + 18;
  const photoH = img ? 420 : 0;
  probe.font = "400 30px -apple-system, Segoe UI, Roboto, sans-serif";
  const ingH = ingredients.length ? (54 + ingredients.length * 44 + 20) : 0;
  const footerH = 96;
  const H = headerH + titleH + photoH + ingH + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // sfondo
  ctx.fillStyle = "#15161b";
  ctx.fillRect(0, 0, W, H);

  // header arancione
  const grad = ctx.createLinearGradient(0, 0, W, headerH);
  grad.addColorStop(0, "#ffa64d");
  grad.addColorStop(1, "#df5117");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, headerH);
  drawHat(ctx, M + 38, headerH / 2, 1.05);
  ctx.fillStyle = "#fff";
  ctx.font = "800 40px -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("Fornelli", M + 92, headerH / 2);
  if (toolName) {
    ctx.font = "600 26px -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(toolName, W - M, headerH / 2);
    ctx.textAlign = "left";
  }

  let y = headerH + 40;

  // titolo
  ctx.fillStyle = "#fff";
  ctx.font = "700 46px -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textBaseline = "alphabetic";
  for (const line of titleLines) { ctx.fillText(line, M, y); y += 56; }
  y += 6;

  // foto (cover dentro il riquadro arrotondato)
  if (img) {
    const pw = W - 2 * M, ph = 400;
    ctx.save();
    roundRect(ctx, M, y, pw, ph, 24);
    ctx.clip();
    const ratio = Math.max(pw / img.width, ph / img.height);
    const dw = img.width * ratio, dh = img.height * ratio;
    ctx.drawImage(img, M + (pw - dw) / 2, y + (ph - dh) / 2, dw, dh);
    ctx.restore();
    y += ph + 20;
  }

  // ingredienti
  if (ingredients.length) {
    ctx.fillStyle = "#ff9a52";
    ctx.font = "800 30px -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText("Ingredienti", M, y + 30);
    y += 54;
    ctx.font = "400 30px -apple-system, Segoe UI, Roboto, sans-serif";
    for (const ing of ingredients) {
      ctx.fillStyle = "#ff7a3d";
      ctx.beginPath(); ctx.arc(M + 6, y + 12, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e9e6e0";
      const line = wrapText(ctx, ing, W - 2 * M - 28)[0] || ing;
      ctx.fillText(line, M + 26, y + 22);
      y += 44;
    }
    y += 20;
  }

  // footer
  ctx.fillStyle = "#7a766e";
  ctx.font = "600 26px -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText("Creato con Fornelli", M, H - 40);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

// Condivide la cartolina (Web Share con file) o, se non supportato, la scarica.
export async function shareRecipeImage(recipe, toolName, ingredientLines) {
  const blob = await buildRecipeCard(recipe, toolName, ingredientLines);
  if (!blob) throw new Error("Impossibile creare l'immagine");
  const file = new File([blob], "ricetta.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: recipe.title }); return "shared"; }
    catch (e) { if (e && e.name === "AbortError") return "cancelled"; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (recipe.title || "ricetta").replace(/[^\w\-]+/g, "_") + ".png";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return "downloaded";
}
