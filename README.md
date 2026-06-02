# 🍳 Fornelli

App (PWA) per organizzare le ricette di casa **per strumento di cottura**
(friggitrice ad aria, forno, induzione, gas, vaporiera, ecc.).

Per ogni strumento si possono salvare ricette con **titolo, link e note**.
C'è anche un **Ricettario** integrato per cercare idee online (TheMealDB) e una
lista dei migliori **siti italiani**.

- ✅ Funziona **offline** e si installa sul telefono come una app.
- ✅ I dati possono restare **solo sul telefono** *oppure* essere salvati nel
  **cloud** (backup + sincronizzazione tra dispositivi).
- ✅ Nessun programma da installare per svilupparla: sono solo file statici.

---

## 1) Provarla subito sul computer

Apri semplicemente `index.html` con un browser? **Quasi**: i moduli JavaScript
richiedono di essere serviti da un piccolo server (non dal doppio click).
Il modo più semplice senza installare nulla:

- In **VS Code** installa l'estensione *Live Server* → tasto destro su
  `index.html` → **Open with Live Server**.

In questa modalità l'app parte in **modalità Locale** (dati salvati solo nel
browser). Tutto funziona tranne il backup cloud.

---

## 2) Metterla sul telefono di tua moglie (consigliato: Netlify Drop)

Serve un indirizzo **https** per poterla "installare". Il metodo più semplice e
gratuito, **senza installare programmi**:

1. Vai su **https://app.netlify.com/drop**
2. **Trascina la cartella** `Ricette` nella pagina.
3. Netlify ti dà un link tipo `https://nome-a-caso.netlify.app` ✅
4. Apri quel link sul telefono di tua moglie (Chrome).
5. Menu di Chrome (⋮) → **Aggiungi a schermata Home** → l'icona 🍳 compare
   tra le app.

> Alternative: **GitHub Pages** (hai git installato) o **Cloudflare Pages**.
> Vanno bene uguale: l'importante è che l'indirizzo sia `https`.

A questo punto è già perfettamente usabile in **modalità Locale**.
Se ti basta il salvataggio sul telefono, **hai finito qui**. 🎉

---

## 3) (Opzionale) Attivare il BACKUP NEL CLOUD con Firebase

Così le ricette sono al sicuro anche se si cambia/perde il telefono e si
sincronizzano su più dispositivi. È **gratis** per questo uso.

### a. Crea il progetto
1. Vai su **https://console.firebase.google.com** e accedi con un account Google.
2. **Aggiungi progetto** → dai un nome (es. `ricettario`) → crea.

### b. Attiva il Database
1. Menu a sinistra → **Build → Firestore Database** → **Crea database**.
2. Scegli **modalità produzione** e una località europea (es. `eur3`).
3. Vai sulla scheda **Regole**, incolla il contenuto del file
   [`firestore.rules`](firestore.rules) e premi **Pubblica**.

### c. Attiva l'accesso (login)
1. Menu → **Build → Authentication** → **Inizia**.
2. Scheda **Sign-in method** → abilita **Email/Password** → salva.

### d. Collega l'app
1. Nella console → ⚙️ **Impostazioni progetto**.
2. In basso, sezione *Le tue app*, clicca l'icona **`</>`** (Web) e registra
   l'app (un nome qualsiasi, **senza** Hosting).
3. Copia i valori di `firebaseConfig` che ti vengono mostrati.
4. Aprili nel file **[`js/config.js`](js/config.js)** e incollali al posto delle
   virgolette vuote, ad esempio:

   ```js
   export const firebaseConfig = {
     apiKey: "AIza........",
     authDomain: "ricettario-xxxx.firebaseapp.com",
     projectId: "ricettario-xxxx",
     storageBucket: "ricettario-xxxx.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef123456"
   };
   ```

5. **Ricarica il sito su Netlify** (ri-trascina la cartella aggiornata).

### e. Primo accesso
1. Apri l'app: ora chiede **email e password**.
2. La prima volta tocca **Registrati** per creare l'account
   (verranno aggiunti automaticamente gli strumenti di base).
3. Fatto: da quel telefono resta connessa. Sugli **altri** dispositivi basta
   fare **Accedi** con la stessa email per ritrovare tutte le ricette.

> 🔒 Le regole di sicurezza fanno sì che ogni account veda **solo** le proprie
> ricette.

---

## Backup manuale (sempre disponibile)

In **Impostazioni** puoi **Esportare** tutte le ricette in un file e
**Importarle** in seguito. Utile come copia di sicurezza extra, anche in
modalità Locale.

---

## Struttura del progetto

```
Ricette/
├─ index.html              Pagina principale
├─ styles.css              Stile (mobile-first)
├─ manifest.webmanifest    Dati per l'installazione come app
├─ sw.js                   Service worker (funzionamento offline)
├─ firestore.rules         Regole di sicurezza da incollare in Firebase
├─ icons/                  Icone dell'app
└─ js/
   ├─ app.js               Avvio e orchestrazione
   ├─ config.js            👉 QUI si incolla la configurazione Firebase
   ├─ store.js             Logica dati (interfaccia unica)
   ├─ store-local.js       Salvataggio sul telefono
   ├─ store-firebase.js    Salvataggio nel cloud
   ├─ auth.js              Login / registrazione
   ├─ ui.js                Interfaccia e schermate
   ├─ mealdb.js            Ricerca ricette online (TheMealDB)
   └─ sites.js             Elenco siti italiani
```

## Note

- Le ricette di TheMealDB sono per lo più **in inglese** (cerca p.es. *chicken*,
  *pasta*, *cake*). I siti italiani della scheda *Siti italiani* coprono il
  resto.
- L'app non richiede Node.js né alcun build: si modifica e si ricarica.
