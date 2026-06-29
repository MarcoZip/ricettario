// Nickname dell'utente (per personalizzare i saluti). Salvato su questo
// dispositivo; in modalità cloud viene anche sincronizzato sull'account
// (displayName) tramite auth.js.
const NICK = "ricettario.nickname";

export function getNickname() {
  try { return (localStorage.getItem(NICK) || "").trim(); } catch (e) { return ""; }
}

export function setNickname(n) {
  try { localStorage.setItem(NICK, (n || "").trim()); } catch (e) { /* ignora */ }
}

// Foto di copertina personale (data URL compatta). Solo su questo dispositivo.
const COVER = "ricettario.cover";
export function getCover() {
  try { return localStorage.getItem(COVER) || ""; } catch (e) { return ""; }
}
export function setCover(dataUrl) {
  try { if (dataUrl) localStorage.setItem(COVER, dataUrl); else localStorage.removeItem(COVER); } catch (e) { /* ignora (quota) */ }
}
