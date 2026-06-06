// ============================================================
//  Cloudflare Worker: invio notifiche push di Fornelli
// ------------------------------------------------------------
//  Modello "relay": l'app deposita qui i promemoria (con l'iscrizione
//  push) tramite POST /register; un Cron Trigger li invia al momento
//  giusto. Niente Firestore: il Worker fa solo storage + invio.
//
//  CONFIGURAZIONE (vedi README.md):
//   1. Crea un KV namespace e collegalo con il binding  PUSH_KV
//   2. Aggiungi il secret  VAPID_PRIVATE  (te lo fornisce l'app/guida)
//   3. Imposta un Cron Trigger, es.  0 * * * *  (ogni ora)
//   4. (Facoltativo) cambia VAPID_SUBJECT con la tua email
// ============================================================

// Chiave pubblica VAPID (deve combaciare con VAPID_PUBLIC_KEY in js/config.js).
const VAPID_PUBLIC = "BG6AgCm8Ca2HT0xDX_hdBct0cQXRn-Yj8Rbs-3dbgyYDLgPfrKaktoDMg8ho0PMV99rrg5McH1QeBe1EiYzQJq8";
const VAPID_SUBJECT = "mailto:marcozeta73@gmail.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-key"
};

// ---------- utilità base64url / byte ----------
const enc = new TextEncoder();
function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  s += "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob(s);
  const o = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) o[i] = raw.charCodeAt(i);
  return o;
}
function bytesToB64url(buf) {
  const b = new Uint8Array(buf);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function concat(...arrs) {
  let n = 0; arrs.forEach((a) => (n += a.length));
  const o = new Uint8Array(n); let i = 0;
  arrs.forEach((a) => { o.set(a, i); i += a.length; });
  return o;
}

// ---------- crittografia ----------
async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const b = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, len * 8);
  return new Uint8Array(b);
}
async function ecdhBits(priv, pubRaw) {
  const pub = await crypto.subtle.importKey("raw", pubRaw, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const b = await crypto.subtle.deriveBits({ name: "ECDH", public: pub }, priv, 256);
  return new Uint8Array(b);
}

// Cifra il payload secondo RFC 8291 (aes128gcm). Ritorna il corpo della richiesta.
async function encryptPayload(p256dh, auth, plaintext) {
  const srvKp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const srvPub = new Uint8Array(await crypto.subtle.exportKey("raw", srvKp.publicKey));
  const shared = await ecdhBits(srvKp.privateKey, p256dh);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyInfo = concat(enc.encode("WebPush: info\0"), p256dh, srvPub);
  const ikm = await hkdf(auth, shared, keyInfo, 32);
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const cekKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const padded = concat(plaintext, new Uint8Array([2]));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, cekKey, padded));
  const rs = new Uint8Array([0, 0, 16, 0]); // record size 4096
  return concat(salt, rs, new Uint8Array([srvPub.length]), srvPub, ct);
}

// JWT VAPID (ES256) per autenticare il Worker presso il servizio push.
async function vapidAuth(audience, vapidPrivate) {
  const pubRaw = b64urlToBytes(VAPID_PUBLIC); // 0x04 || x(32) || y(32)
  const jwk = {
    kty: "EC", crv: "P-256",
    d: vapidPrivate,
    x: bytesToB64url(pubRaw.slice(1, 33)),
    y: bytesToB64url(pubRaw.slice(33, 65)),
    ext: true
  };
  const priv = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const payload = bytesToB64url(enc.encode(JSON.stringify({ aud: audience, exp, sub: VAPID_SUBJECT })));
  const signingInput = header + "." + payload;
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, priv, enc.encode(signingInput));
  const jwt = signingInput + "." + bytesToB64url(sig);
  return { Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC}` };
}

// Invia una notifica. Ritorna lo status HTTP (404/410 = iscrizione scaduta).
async function sendPush(subscription, message, vapidPrivate) {
  const endpoint = subscription.endpoint;
  const audience = new URL(endpoint).origin;
  const p256dh = b64urlToBytes(subscription.keys.p256dh);
  const auth = b64urlToBytes(subscription.keys.auth);
  const body = await encryptPayload(p256dh, auth, enc.encode(JSON.stringify(message)));
  const headers = await vapidAuth(audience, vapidPrivate);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "TTL": "86400",
      "Urgency": "normal"
    },
    body
  });
  return res.status;
}

// ---------- HTTP ----------
async function handleRegister(request, env) {
  const data = await request.json();
  const sub = data.subscription;
  if (!sub || !sub.endpoint) return new Response("Bad subscription", { status: 400, headers: CORS });
  const reminders = Array.isArray(data.reminders) ? data.reminders : [];
  const key = "sub:" + bytesToB64url(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(sub.endpoint))));
  await env.PUSH_KV.put(key, JSON.stringify({ subscription: sub, reminders }));
  return new Response(JSON.stringify({ ok: true, count: reminders.length }), { headers: { ...CORS, "Content-Type": "application/json" } });
}

async function handleUnregister(request, env) {
  const data = await request.json();
  if (!data.endpoint) return new Response("Bad request", { status: 400, headers: CORS });
  const key = "sub:" + bytesToB64url(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(data.endpoint))));
  await env.PUSH_KV.delete(key);
  return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
}

// Invia una notifica a TUTTI gli iscritti (solo admin, via header x-admin-key).
async function handleBroadcast(request, env) {
  if (!env.ADMIN_KEY || request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return new Response("Non autorizzato", { status: 401, headers: CORS });
  }
  const data = await request.json();
  const msg = { title: data.title || "Fornelli", body: data.body || "", url: "./" };
  let sent = 0, removed = 0, cursor;
  do {
    const list = await env.PUSH_KV.list({ prefix: "sub:", cursor });
    cursor = list.list_complete ? null : list.cursor;
    for (const k of list.keys) {
      const raw = await env.PUSH_KV.get(k.name);
      if (!raw) continue;
      const entry = JSON.parse(raw);
      try {
        const status = await sendPush(entry.subscription, msg, env.VAPID_PRIVATE);
        if (status === 404 || status === 410) { await env.PUSH_KV.delete(k.name); removed++; }
        else sent++;
      } catch (e) { /* salta */ }
    }
  } while (cursor);
  return new Response(JSON.stringify({ ok: true, sent, removed }), { headers: { ...CORS, "Content-Type": "application/json" } });
}

// Cron: invia i promemoria scaduti e li rimuove; elimina le iscrizioni morte.
async function runScheduled(env) {
  const now = Date.now();
  let cursor;
  do {
    const list = await env.PUSH_KV.list({ prefix: "sub:", cursor });
    cursor = list.list_complete ? null : list.cursor;
    for (const k of list.keys) {
      const raw = await env.PUSH_KV.get(k.name);
      if (!raw) continue;
      const entry = JSON.parse(raw);
      const reminders = entry.reminders || [];
      const due = reminders.filter((r) => r.sendAt <= now);
      if (!due.length) {
        // pulizia di eventuali promemoria troppo vecchi (oltre 1 giorno)
        const kept = reminders.filter((r) => r.sendAt > now - 86400000);
        if (kept.length !== reminders.length) {
          entry.reminders = kept;
          await env.PUSH_KV.put(k.name, JSON.stringify(entry));
        }
        continue;
      }
      let dead = false;
      for (const r of due) {
        try {
          const status = await sendPush(entry.subscription, { title: r.title, body: r.body, url: "./" }, env.VAPID_PRIVATE);
          if (status === 404 || status === 410) { dead = true; break; }
        } catch (e) { /* riprova alla prossima esecuzione */ }
      }
      if (dead) {
        await env.PUSH_KV.delete(k.name);
      } else {
        entry.reminders = reminders.filter((r) => r.sendAt > now);
        await env.PUSH_KV.put(k.name, JSON.stringify(entry));
      }
    }
  } while (cursor);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    try {
      if (request.method === "POST" && url.pathname === "/register") return await handleRegister(request, env);
      if (request.method === "POST" && url.pathname === "/unregister") return await handleUnregister(request, env);
      if (request.method === "POST" && url.pathname === "/broadcast") return await handleBroadcast(request, env);
      if (url.pathname === "/" || url.pathname === "/health") {
        return new Response("Fornelli push worker attivo", { headers: CORS });
      }
    } catch (e) {
      return new Response("Errore: " + e.message, { status: 500, headers: CORS });
    }
    return new Response("Not found", { status: 404, headers: CORS });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduled(env));
  }
};
