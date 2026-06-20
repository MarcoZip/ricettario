// "Manuale" dell'app per l'assistente "Chiedi a Fornelli". Ogni voce ha parole
// chiave, una risposta scritta (così niente invenzioni) e un'azione facoltativa
// (apri la pagina/funzione giusta). L'AI sceglie SOLO tra questi id: non inventa.
//
// action.type: "page" (vai a una scheda) | "open" (apri una finestra/strumento) | "tour" (passi guidati)
export const HELP_TOPICS = [
  { id: "casa-condivisa", title: "Condividere la lista della spesa", kw: "condividere condivisa casa insieme stessa lista federica marito moglie altro telefono sincronizzata coppia", answer: "Sì! In Opzioni → \"Casa condivisa\" crei una casa e ottieni un codice; l'altra persona entra con lo stesso codice (col suo accesso). Da quel momento avete la STESSA lista della spesa, aggiornata in tempo reale, con avviso quando l'altro aggiunge qualcosa.", action: { type: "open", target: "household" }, tour: "casa" },
  { id: "modalita-cucina", title: "Cucinare passo-passo (Modalità cucina)", kw: "cucinare passo passi modalita cucina guidata timer voce mani libere leggi ad alta voce ingredienti toccabili", answer: "Apri una ricetta con i passaggi e tocca \"Modalità cucina\": istruzioni una alla volta, più timer con nome, lettura a voce e schermo sempre acceso. Col microfono 🎤 vai avanti/indietro a voce, avvii timer e puoi anche fare domande (\"posso sostituire il burro?\"). Tocca un ingrediente nel passo per vedere la quantità.", action: { type: "page", target: "strumenti" } },
  { id: "import-video", title: "Importare una ricetta da un video social", kw: "video social tiktok instagram youtube reel importare link", answer: "Apri \"Nuova ricetta\" → \"Importa da video social\": incolla il link di TikTok/Instagram/YouTube e l'AI ne ricava ingredienti e passi. Se il link non basta, incolla la descrizione del video.", action: { type: "open", target: "nuova-ricetta" } },
  { id: "inventa-ricetta", title: "Inventare una ricetta dagli ingredienti", kw: "inventare inventa creare ricetta dagli ingredienti che ho ai genera", answer: "In \"Nuova ricetta\" tocca \"Inventa una ricetta (AI)\": scrivi gli ingredienti che hai e l'app propone una ricetta da modificare e salvare.", action: { type: "open", target: "nuova-ricetta" } },
  { id: "adatta-ricetta", title: "Rendere una ricetta vegana / leggera / senza glutine", kw: "vegano vegetariano senza glutine senza lattosio leggera adattare dieta convertire trasformare", answer: "Apri la ricetta e tocca \"Adatta la ricetta\": scegli vegano, vegetariano, senza glutine, senza lattosio o più leggera. L'AI la riscrive e la salvi come nuova ricetta (l'originale resta).", action: { type: "page", target: "strumenti" } },
  { id: "foto-frigo", title: "Sapere cosa cucinare dal frigo (foto)", kw: "frigo frigorifero foto fotografa dispensa cosa cucino ingredienti che ho riconosce", answer: "In Spesa → scheda \"Dispensa\" tocca \"Fotografa il frigo\": l'AI riconosce gli alimenti dalla foto e puoi aggiungerli in dispensa o cercare ricette.", action: { type: "page", target: "spesa-dispensa" }, tour: "frigo" },
  { id: "robot", title: "Adattare una ricetta al Companion o al Bimby", kw: "companion moulinex bimby robot cuociture velocita temperatura programma", answer: "Apri una ricetta e tocca \"Modalità robot\": scegli Companion o Bimby e l'AI traduce la ricetta nei comandi (accessorio, velocità, temperatura, tempo) da impostare a mano sul robot.", action: { type: "page", target: "strumenti" } },
  { id: "menu-settimana", title: "Pianificare il menù della settimana", kw: "menu settimana pianificare piano calendario cene pranzi pasti programmare ai", answer: "Vai in Piano → vista Settimana. Usa \"✨ Menù AI\" per farti proporre le cene dalle tue ricette (con anteprima), oppure \"Riempi le cene\". Da lì generi anche la spesa della settimana.", action: { type: "page", target: "piano" }, tour: "menusett" },
  { id: "timer", title: "Usare più timer da cucina", kw: "timer cronometro minuti contaminuti sveglia più timer", answer: "Apri Opzioni → \"Timer da cucina\": avvii più timer con nome (pasta, forno…) che continuano a contare mentre usi l'app e suonano alla fine.", action: { type: "open", target: "timer" } },
  { id: "aggiungi-ricetta", title: "Aggiungere una ricetta", kw: "aggiungere nuova ricetta inserire salvare creare scrivere", answer: "Tocca \"Nuova ricetta\" (in Home). Puoi scriverla, incollare un link e toccare \"Importa\", scansionarla da una foto, importarla da un video o inventarla con l'AI.", action: { type: "open", target: "nuova-ricetta" } },
  { id: "ocr-foto", title: "Leggere una ricetta da un libro/foto", kw: "libro quaderno foto scansionare ocr leggere carta scritta", answer: "In \"Nuova ricetta\" tocca \"Scansiona da una foto\": l'app legge il testo (ingredienti o preparazione) da una foto di un libro o quaderno.", action: { type: "open", target: "nuova-ricetta" } },
  { id: "cerca-online", title: "Cercare ricette online (anche per robot)", kw: "cercare online ricettario fonti idee giallozafferano misya moulinex bimby trovare ispirazione", answer: "Vai in Ricettario → \"Cerca online\". Scrivi un piatto e scegli la fonte; con \"Tutte le fonti\" vedi tutti i risultati. Scrivendo il nome di una fonte o robot (es. \"pollo bimby\") cerca solo lì.", action: { type: "page", target: "ricettario" } },
  { id: "dispensa-scadenze", title: "Dispensa e avvisi di scadenza", kw: "dispensa scadenza scade alimenti avvisi anti spreco usa prima scorte", answer: "In Spesa → \"Dispensa\" metti ciò che hai in casa con la scadenza: l'app ti avvisa prima che scada e in Home suggerisce ricette per consumarlo. Tocca la ⭐ per le scorte di base.", action: { type: "page", target: "spesa-dispensa" } },
  { id: "budget", title: "Tenere d'occhio la spesa (budget)", kw: "budget spesa soldi costo mensile quanto spendo tetto", answer: "In Spesa → \"Da comprare\", tocca la riga della spesa del mese per impostare un budget mensile: vedrai una barra con quanto hai speso.", action: { type: "page", target: "spesa" } },
  { id: "preferenze-diete", title: "Impostare preferenze alimentari e porzioni", kw: "preferenze vegetariano senza glutine senza lattosio porzioni predefinite per me dieta impostazioni", answer: "In Opzioni trovi le \"Preferenze alimentari\" (vegetariano, senza glutine, senza lattosio): in Home appare il filtro \"Per me\". Lì imposti anche le porzioni predefinite.", action: { type: "page", target: "impostazioni" } },
  { id: "notifiche", title: "Attivare i promemoria/notifiche", kw: "notifiche promemoria avvisi push ricordare scadenze pasti", answer: "In Opzioni attiva \"Promemoria\": ricevi avvisi per scadenze e pasti del giorno (anche ad app chiusa). Puoi scegliere l'ora.", action: { type: "page", target: "impostazioni" } },
  { id: "aspetto", title: "Cambiare aspetto (tema, colore, testo)", kw: "tema chiaro scuro colore accento testo grande dimensione aspetto contrasto personalizzare home", answer: "In Opzioni scegli tema chiaro/scuro, colore dell'app, dimensione del testo, alto contrasto e quali sezioni mostrare in Home.", action: { type: "page", target: "impostazioni" } },
  { id: "teglia", title: "Adattare le dosi a una teglia diversa", kw: "teglia stampo dimensione tortiera dosi ricalcolare rotonda quadrata", answer: "Apri una ricetta con le porzioni e tocca \"Adatta alla teglia/stampo\": inserisci la teglia della ricetta e la tua e ricalcolo le dosi in base alla superficie.", action: { type: "page", target: "strumenti" } },
  { id: "backup", title: "Salvare/esportare le ricette (backup)", kw: "backup esporta importa salva copia perdere dati ripristino pdf", answer: "In Opzioni: \"Esporta backup\" salva tutte le ricette in un file, \"Importa backup\" le ripristina. Con l'accesso cloud sono già salvate e sincronizzate. Puoi anche esportare un PDF.", action: { type: "page", target: "impostazioni" } }
];

// Normalizza (minuscole, niente accenti) per un confronto tollerante.
function norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ");
}
// Ricerca fuzzy semplice: punteggio per parole in comune con titolo+keyword+risposta.
export function findHelpTopics(query, limit = 4) {
  const words = norm(query).split(/\s+/).filter((w) => w.length >= 3);
  if (!words.length) return [];
  const STOP = new Set(["come", "posso", "fare", "puoi", "voglio", "che", "cosa", "per", "con", "una", "uno", "del", "della", "fornelli", "app", "dove", "quando", "serve", "faccio"]);
  const terms = words.filter((w) => !STOP.has(w));
  if (!terms.length) return [];
  const scored = HELP_TOPICS.map((t) => {
    const hay = norm(t.title + " " + t.kw + " " + t.answer);
    const titleKw = norm(t.title + " " + t.kw);
    let s = 0;
    for (const w of terms) {
      if (titleKw.includes(w)) s += 3;
      else if (hay.includes(w)) s += 1;
    }
    return { t, s };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.t);
}
