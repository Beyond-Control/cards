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

Alternative equivalenti: Vercel, Cloudflare Pages, GitHub Pages. Sono file
statici, va bene qualunque hosting che serva HTTPS.

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

Quando aggiungeremo la sincronizzazione cloud questo passaggio sparirà: sarà
il server a tenere la copia buona.

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

Cambia i file e ricarica su Netlify. Il service worker ha una versione in cima
a `sw.js` (`tessere-v1`): **cambiala** a ogni aggiornamento (`tessere-v2`…),
altrimenti i telefoni continuano a servire la copia in cache.

## Cosa manca ancora

- Sincronizzazione cloud e account (scelta: prima l'app locale)
- Condivisione delle tessere in famiglia
- Suggerimento per posizione («sei da Esselunga»), che richiede il permesso di
  geolocalizzazione
