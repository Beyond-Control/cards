# Tessere — carte fedeltà

App web installabile per tenere le carte fedeltà sul telefono. Nessuno store,
nessun account sviluppatore, nessun costo. Funziona offline.

## Metterla online (5 minuti, gratis)

Serve HTTPS: senza, iOS non dà accesso alla fotocamera. Un file aperto dal
disco (`file://`) non basta.

**La strada più semplice — Netlify Drop**

1. Vai su **https://app.netlify.com/drop**
2. Trascina nella pagina **l'intera cartella `tessere`** (non i singoli file,
   non lo zip).
3. Dopo qualche secondo esce un indirizzo tipo
   `https://qualcosa-di-casuale.netlify.app`. Quello è l'app.
4. Facoltativo: crea un account gratuito per bloccare l'indirizzo, altrimenti
   dopo qualche ora il sito viene rimosso. Dalle impostazioni del sito puoi
   anche rinominarlo in qualcosa come `tessere-ale.netlify.app`.

**GitHub Pages**

Funziona bene: l'app è già scritta con percorsi relativi, quindi gira senza
modifiche anche sotto una sottocartella tipo `utente.github.io/tessere/`
— service worker e funzionamento offline compresi.

Una cosa da sapere prima: sul piano gratuito **GitHub Pages funziona solo da
repository pubbliche**, e il sito pubblicato è comunque pubblico. Per questa
app non è un problema — sul server non finisce nessun dato, le tessere stanno
solo nel telefono — ma il codice sarà visibile a chiunque. (Pubblicare un sito
Pages davvero privato richiede GitHub Enterprise Cloud, non basta Pro.)

*Dall'interfaccia web, senza usare git:*

1. Crea una repository nuova, **pubblica**, chiamata per esempio `tessere`.
   Non aggiungere README, licenza o `.gitignore`.
2. Nella pagina della repo vuota, clicca **uploading an existing file**.
3. Trascina **il contenuto** della cartella `tessere` — cioè `index.html`,
   `app.js`, le altre e le sottocartelle `icons/` e `vendor/` — **non** la
   cartella stessa: i file devono stare nella radice della repo, altrimenti
   l'indirizzo diventa `.../tessere/tessere/`.
4. **Commit changes**.
5. **Settings → Pages**. In *Source* scegli **Deploy from a branch**, ramo
   `main`, cartella `/ (root)`, e salva.
6. Dopo un paio di minuti l'app è su `https://<tuo-utente>.github.io/tessere/`.

*Da riga di comando:*

```bash
cd tessere
git init -b main
git add -A
git commit -m "Tessere: prima versione"
git remote add origin https://github.com/<tuo-utente>/tessere.git
git push -u origin main
```

Poi la stessa configurazione al punto 5.

Nello zip c'è un file `.nojekyll` che disattiva l'elaborazione Jekyll di
GitHub. Se l'uploader web non lo carica (i browser a volte nascondono i file
che iniziano per punto) non succede niente: qui nessun file inizia per `_`,
quindi Jekyll non toglierebbe nulla.

Alternative equivalenti: Vercel, Cloudflare Pages. Sono file statici, va bene
qualunque hosting che serva HTTPS.

## Installarla sull'iPhone

1. Apri l'indirizzo **in Safari** (non Chrome: solo Safari può installare).
2. Tocca **Condividi** → **Aggiungi a schermata Home**.
3. Aprila dall'icona sulla home, non dal browser.

Aperta così, l'app va a tutto schermo, funziona senza rete e può tenere lo
schermo acceso mentre mostri il codice alla cassa.

## Come funziona

- **Portafoglio** — le tessere in griglia, ordinate per ultima usata. La
  ricerca filtra su nome, programma, numero e nota.
- **Tessera aperta** — il codice su fondo bianco pieno, il numero sotto.
  Lo schermo non si spegne finché la tessera è aperta.
- **Apri a tutto schermo** — la modalità cassa: bianco pieno, codice ruotato
  di 90° per sfruttare il lato lungo del telefono. È il modo più affidabile di
  farlo leggere da uno scanner, visto che nessun browser può alzare la
  luminosità.
- **Aggiungi tessera** — inquadra il codice con la fotocamera, scatta una foto,
  oppure scrivi il numero. Il formato viene riconosciuto da solo; scrivendo a
  mano viene proposto e resta modificabile.

Digitando il nome del negozio compaiono suggerimenti da un catalogo di una
sessantina di catene italiane ed estere, che riempiono colore, programma e
formato tipico.

## Formati supportati

Generazione e lettura: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, ITF,
Codabar, QR, Aztec, PDF417, Data Matrix.

Per EAN/UPC la cifra di controllo viene calcolata se manca e segnalata se è
sbagliata: un numero che non torna verrebbe rifiutato dalla cassa, meglio
scoprirlo subito. Se un numero non entra in nessun formato numerico, **Code
128** accetta praticamente qualsiasi cosa.

## Backup — leggi questo

Le tessere stanno **solo su questo telefono**, in IndexedDB. iOS cancella i
dati dei siti che non apri da un po', anche installati. L'app chiede
l'archiviazione persistente, ma Apple non la garantisce.

Quindi: **Impostazioni → Esporta backup** ogni tanto. Esce un file `.json` che
finisce in File o dove scegli tu. Per ripristinare: **Importa da file**.
L'importazione è additiva — aggiorna le tessere più vecchie e non cancella
niente.

Finché non c'è la sincronizzazione, il file di backup è l'unica rete di
sicurezza che hai.

## Struttura dei file

```
index.html               struttura delle quattro schermate
app.css                  aspetto
app.js                   logica, navigazione, schermate
store.js                 archivio IndexedDB, backup, importazione
codes.js                 generazione e lettura dei codici, validazione
catalog.js               catene note: colore e formato tipico
sw.js                    service worker: fa funzionare l'app offline
manifest.webmanifest     nome, icone, avvio a tutto schermo
icons/                   icone per home screen e installazione
vendor/bwip-js.min.js    disegna i codici (tutti i formati)
vendor/zxing.min.js      legge i codici da fotocamera e foto
```

Nessuna build, nessun bundler, nessuna dipendenza da installare: sono file
statici che si aprono e si modificano direttamente.

## Aggiornarla

Cambia i file e ricarica (Netlify: trascina di nuovo la cartella; GitHub
Pages: `git push`, oppure ricarica i file dall'interfaccia web).

**In entrambi i casi cambia la versione in cima a `sw.js`** — da `tessere-v1`
a `tessere-v2` e così via. Il service worker serve i file dalla cache, quindi
senza quel cambio i telefoni continuano a mostrare la versione vecchia anche
dopo la pubblicazione.

## Se un codice non viene riconosciuto

La lettura dal vivo prova tre inquadrature a rotazione: fascia centrale
orizzontale, fascia centrale verticale ruotata di 90° (per le tessere tenute
per il verso lungo) e fotogramma intero. In più chiede al telefono la messa a
fuoco continua e la massima risoluzione disponibile.

Quello che resta fuori portata è un codice **sfocato**: se i tratti sono
impastati non lo legge nessuno, nemmeno l'occhio. In quel caso:

- avvicina finché la tessera riempie il riquadro, poi aspetta un attimo che
  metta a fuoco;
- più luce, e tessera ben piatta (le tessere curve fanno riflessi);
- se non basta, **Scatta una foto**: da ferma la decodifica ha molte più
  possibilità della ripresa dal vivo;
- in ultima istanza il numero è stampato sotto al codice: digitarlo a mano
  dà lo stesso identico risultato.

## Cosa manca ancora

- Sincronizzazione fra dispositivi e account
- Condivisione delle tessere in famiglia
- Suggerimento per posizione («sei da Esselunga»), che richiede il permesso di
  geolocalizzazione
