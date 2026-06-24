// Micro-suoni soft generati al volo con Web Audio (nessun file audio).
// Spenti di default: l'utente li accende da Opzioni. Pensati per essere
// discreti e gradevoli — un "tin" del timer, un fruscio sfogliando, uno
// "sparkle" quando salvi o completi un piatto.

const KEY = "ricettario.sound";

export function getSoundOn() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}
export function setSoundOn(on) {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch {}
}

let ctx = null;
// Restituisce l'AudioContext solo se il suono è acceso (e prova a riattivarlo:
// i browser lo sospendono finché non c'è un gesto dell'utente, ma i nostri
// suoni partono in risposta a tocchi, quindi si riattiva da solo).
function ac() {
  if (!getSoundOn()) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch { return null; }
}

// Una nota con inviluppo morbido (attacco rapido, coda esponenziale).
function tone(c, freq, start, dur, opts) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = (opts && opts.type) || "sine";
  o.frequency.setValueAtTime(freq, start);
  if (opts && opts.glideTo) o.frequency.exponentialRampToValueAtTime(opts.glideTo, start + dur);
  const peak = (opts && opts.gain) || 0.16;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g); g.connect(c.destination);
  o.start(start); o.stop(start + dur + 0.03);
}

function plingOn(c) {
  const t = c.currentTime;
  tone(c, 660, t, 0.18, { gain: 0.15 });
  tone(c, 990, t + 0.085, 0.26, { gain: 0.13 });
  tone(c, 1480, t + 0.17, 0.3, { type: "triangle", gain: 0.06 });
}
// "Sparkle": due note ascendenti + un luccichio acuto. Salvataggi, traguardi.
export function playPling() {
  const c = ac(); if (!c) return;
  plingOn(c);
}

// "Tin" cristallino del timer (campanella con armoniche).
export function playChime() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  tone(c, 880, t, 0.7, { type: "sine", gain: 0.18 });
  tone(c, 1320, t, 0.7, { type: "sine", gain: 0.08 });
  tone(c, 1760, t + 0.04, 0.5, { type: "sine", gain: 0.035 });
}

// Fruscio breve "sfoglio" (rumore bianco filtrato in alto, che svanisce).
export function playFlip() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  const dur = 0.16;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1100;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.11, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(c.destination);
  src.start(t); src.stop(t + dur + 0.02);
}

// Piccolo "tap" discreto (azioni minori, opzionale).
export function playTick() {
  const c = ac(); if (!c) return;
  tone(c, 520, c.currentTime, 0.05, { type: "triangle", gain: 0.05 });
}

// Suono di prova per il pulsante "Prova" in Opzioni: suona SEMPRE (anche a
// micro-suoni spenti), così l'utente può sentire l'esempio prima di accenderli.
export function playSample() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    plingOn(ctx);
  } catch {}
}
