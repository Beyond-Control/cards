import { CATALOG, PALETTE, findInCatalog } from './catalog.js';
import * as store from './store.js';
import {
  FORMATS, formatOf, formatLabel, isTwoD, validate, guessFormat,
  tryRenderCode, startLiveScan, scanImageFile,
} from './codes.js';

const VERSION = '1.0.1';
const PRIMARY_FORMATS = ['ean13', 'code128', 'code39', 'itf', 'qrcode', 'aztec'];

const $ = (id) => document.getElementById(id);
const dpr = () => Math.min(window.devicePixelRatio || 1, 3);

let cards = [];
let query = '';
let current = null;      // tessera aperta
let draft = null;        // tessera in modifica
let showAllFormats = false;
let scanner = null;      // sessione di scansione attiva
let wakeLock = null;
let wantWake = false;
let toastTimer = null;

// --- colore -------------------------------------------------------------

function luminance(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const inkFor = (hex) => (luminance(hex) > 0.42 ? '#12100A' : '#FFFFFF');

// --- striscia decorativa sulle tessere ----------------------------------

function stripSVG(seed, dark) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const rnd = () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  const color = dark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)';
  let x = 0, rects = '';
  while (x < 118) {
    const w = 1 + Math.floor(rnd() * 3);
    rects += `<rect x="${x}" y="0" width="${w}" height="16" fill="${color}"/>`;
    x += w + 1 + Math.floor(rnd() * 3);
  }
  return `<svg class="tile-strip" viewBox="0 0 120 16" preserveAspectRatio="none">${rects}</svg>`;
}

// --- utilità ------------------------------------------------------------

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function groupDigits(code) {
  if (/^\d{8,}$/.test(code)) return code.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  return code;
}

function shortCode(code) {
  const d = String(code).replace(/\s/g, '');
  return d.length > 4 ? d.slice(-4) : d;
}

function dateLabel(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

function hideToast() {
  clearTimeout(toastTimer);
  $('toast').hidden = true;
}

function toast(msg, bad) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('bad', !!bad);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

// --- schermo acceso -----------------------------------------------------

async function acquireWake() {
  wantWake = true;
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (_) { /* non supportato o negato: pazienza */ }
}
function releaseWake() {
  wantWake = false;
  try { if (wakeLock) wakeLock.release(); } catch (_) { /* ignora */ }
  wakeLock = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wantWake) acquireWake();
});

// --- navigazione --------------------------------------------------------

const VIEWS = ['list', 'card', 'full', 'form', 'scan', 'settings'];

function navigate(state, replace) {
  history[replace ? 'replaceState' : 'pushState'](state, '');
  render(state);
}

function render(state) {
  const view = (state && state.view) || 'list';

  // un avviso rimasto a mezz'aria coprirebbe il codice: via prima di cambiare vista
  if (view === 'full' || view === 'scan') hideToast();

  // smontaggi
  if (view !== 'scan' && scanner) { scanner.stop(); scanner = null; }
  if (view !== 'full' && view !== 'card') releaseWake();

  for (const v of VIEWS) $('view-' + v).hidden = v !== view;

  if (view === 'list') { current = null; renderList(); }
  if (view === 'card') { renderCard(); acquireWake(); }
  if (view === 'full') { renderFull(); acquireWake(); }
  if (view === 'form') renderForm();
  if (view === 'scan') openScanner();
  if (view === 'settings') renderSettings();
}

window.addEventListener('popstate', (e) => render(e.state || { view: 'list' }));

function back() {
  if (history.length > 1) history.back();
  else navigate({ view: 'list' }, true);
}

// --- portafoglio --------------------------------------------------------

function visibleCards() {
  const q = query.trim().toLowerCase();
  const list = q
    ? cards.filter((c) =>
        (c.name + ' ' + c.sub + ' ' + c.code + ' ' + (c.note || '')).toLowerCase().includes(q))
    : cards.slice();
  return list.sort((a, b) =>
    (b.lastUsedAt || b.createdAt || 0) - (a.lastUsedAt || a.createdAt || 0));
}

function renderList() {
  const list = visibleCards();
  const grid = $('grid');
  const n = cards.length;

  $('list-count').textContent = n === 0
    ? 'Nessuna tessera'
    : `${n} ${n === 1 ? 'tessera' : 'tessere'} · su questo telefono`;

  $('empty').hidden = n !== 0;
  $('no-results').hidden = !(n > 0 && list.length === 0);
  grid.hidden = list.length === 0;
  $('q-clear').hidden = !query;

  grid.innerHTML = list.map((c) => {
    const ink = inkFor(c.color);
    const dark = ink !== '#FFFFFF';
    return `<button class="tile" data-id="${esc(c.id)}" style="background:${esc(c.color)};color:${ink}">
      <span class="tile-head">
        <span class="tile-name">${esc(c.name)}</span>
        ${c.sub ? `<span class="tile-sub">${esc(c.sub)}</span>` : ''}
      </span>
      <span>
        ${stripSVG(c.code + c.id, dark)}
        <span class="tile-meta">${esc(formatLabel(c.format))} · ${esc(shortCode(c.code))}</span>
      </span>
    </button>`;
  }).join('');
}

$('grid').addEventListener('click', (e) => {
  const tile = e.target.closest('.tile');
  if (!tile) return;
  openCard(tile.dataset.id);
});

$('q').addEventListener('input', (e) => { query = e.target.value; renderList(); });
$('q-clear').addEventListener('click', () => { query = ''; $('q').value = ''; renderList(); });
$('btn-settings').addEventListener('click', () => navigate({ view: 'settings' }));
$('btn-add').addEventListener('click', () => startNew());

// --- tessera aperta -----------------------------------------------------

async function openCard(id) {
  const card = await store.touchCard(id);
  if (!card) { toast('Tessera non trovata.', true); return; }
  cards = await store.allCards();
  current = card;
  navigate({ view: 'card', id });
}

function renderCard() {
  const state = history.state || {};
  const card = current || cards.find((c) => c.id === state.id);
  if (!card) { navigate({ view: 'list' }, true); return; }
  current = card;

  $('card-swatch').style.background = card.color;
  $('card-name').textContent = card.name;
  $('card-sub').textContent = card.sub || '';
  $('card-sub').hidden = !card.sub;

  const panel = $('code-panel');
  const canvas = $('code-canvas');
  panel.classList.toggle('two-d', isTwoD(card.format));

  const width = Math.max(280, panel.clientWidth - 36);
  const res = tryRenderCode(canvas, card.code, card.format, {
    targetWidth: width * dpr(),
    barHeight: isTwoD(card.format) ? undefined : 18,
  });

  $('code-error').hidden = res.ok;
  panel.hidden = !res.ok;
  if (!res.ok) {
    $('code-error').textContent =
      `Questo numero non è valido per ${formatLabel(card.format)}. Apri Modifica e scegli un altro formato — Code 128 accetta quasi tutto. (${res.error})`;
  }
  $('code-number').textContent = groupDigits(card.code);

  $('d-format').textContent = formatLabel(card.format);
  $('d-added').textContent = dateLabel(card.createdAt);
  $('d-note').textContent = card.note || '';
  $('d-note-row').hidden = !card.note;
  $('d-uses').textContent = card.uses > 1 ? `${card.uses} volte` : 'la prima volta';
}

$('btn-full').addEventListener('click', () => navigate({ view: 'full', id: current && current.id }));
$('btn-edit').addEventListener('click', () => startEdit(current));
$('btn-card-menu').addEventListener('click', () => { $('sheet').hidden = false; });

$('sheet').addEventListener('click', (e) => {
  const act = e.target.dataset && e.target.dataset.act;
  if (!act && e.target !== $('sheet')) return;
  $('sheet').hidden = true;
  if (act === 'edit') startEdit(current);
  if (act === 'delete') removeCard(current);
});

// --- modalità cassa -----------------------------------------------------

function renderFull() {
  const state = history.state || {};
  const card = current || cards.find((c) => c.id === state.id);
  if (!card) { navigate({ view: 'list' }, true); return; }
  current = card;

  $('full-swatch').style.background = card.color;
  $('full-name').textContent = [card.name, card.sub].filter(Boolean).join(' · ');
  $('full-number').textContent = groupDigits(card.code);

  const stage = $('full-stage');
  const rotor = $('full-rotor');
  const canvas = $('full-canvas');

  // il layout deve essere calcolato dopo che la vista è visibile
  requestAnimationFrame(() => {
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const twoD = isTwoD(card.format);

    if (twoD) {
      const size = Math.max(200, Math.min(W - 32, H - 32));
      const res = tryRenderCode(canvas, card.code, card.format, { targetWidth: size * dpr() });
      if (!res.ok) { fullFallback(res.error); return; }
      rotor.style.width = size + 'px';
      rotor.style.height = size + 'px';
      canvas.style.cssText = `width:${size}px;height:${size}px;position:static;transform:none`;
    } else {
      // Il codice viene ruotato di 90°: usa il lato lungo del telefono,
      // che è il motivo per cui questa schermata esiste.
      const long = Math.max(320, H - 12);
      const thick = Math.max(140, Math.min(W - 40, 320));
      const res = tryRenderCode(canvas, card.code, card.format, {
        targetWidth: long * dpr(), barHeight: 10,
      });
      if (!res.ok) { fullFallback(res.error); return; }
      rotor.style.width = thick + 'px';
      rotor.style.height = long + 'px';
      canvas.style.cssText =
        `width:${long}px;height:${thick}px;position:absolute;left:50%;top:50%;` +
        `transform:translate(-50%,-50%) rotate(90deg)`;
    }
    $('full-hint').textContent = 'Lo schermo resta acceso · tocca per uscire';
  });
}

function fullFallback(msg) {
  $('full-hint').textContent = 'Codice non valido per questo formato: ' + msg;
}

$('btn-full-close').addEventListener('click', back);
$('full-stage').addEventListener('click', back);

// --- form ---------------------------------------------------------------

function blankCard() {
  return {
    id: null, name: '', sub: '', code: '', format: 'ean13',
    color: PALETTE[0], note: '', cat: 'Altro',
  };
}

function startNew() {
  draft = blankCard();
  showAllFormats = false;
  navigate({ view: 'form', mode: 'new' });
}

function startEdit(card) {
  if (!card) return;
  draft = { ...card };
  showAllFormats = !PRIMARY_FORMATS.includes(card.format);
  navigate({ view: 'form', mode: 'edit', id: card.id });
}

function renderForm() {
  if (!draft) draft = blankCard();
  const editing = !!draft.id;
  $('form-title').textContent = editing ? 'Modifica tessera' : 'Nuova tessera';
  $('btn-delete').hidden = !editing;
  $('btn-save').textContent = editing ? 'Salva modifiche' : 'Salva tessera';

  $('f-code').value = draft.code;
  $('f-name').value = draft.name;
  $('f-sub').value = draft.sub;
  $('f-note').value = draft.note || '';

  renderFormatChips();
  renderSwatches();
  updatePreview();
}

function renderFormatChips() {
  const keys = showAllFormats ? FORMATS.map((f) => f.key) : PRIMARY_FORMATS.slice();
  if (!keys.includes(draft.format)) keys.push(draft.format);
  let html = keys.map((k) =>
    `<button type="button" class="chip" data-fmt="${k}" aria-pressed="${k === draft.format}">${esc(formatLabel(k))}</button>`
  ).join('');
  if (!showAllFormats) html += `<button type="button" class="chip" data-more="1">+ ALTRI</button>`;
  $('f-format').innerHTML = html;
}

function renderSwatches() {
  $('f-color').innerHTML = PALETTE.map((c) =>
    `<button type="button" class="sw" data-color="${c}" style="background:${c}" aria-pressed="${c.toLowerCase() === String(draft.color).toLowerCase()}" aria-label="Colore ${c}"></button>`
  ).join('');
}

$('f-format').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.more) { showAllFormats = true; renderFormatChips(); return; }
  draft.format = btn.dataset.fmt;
  renderFormatChips();
  updatePreview();
});

$('f-color').addEventListener('click', (e) => {
  const btn = e.target.closest('.sw');
  if (!btn) return;
  draft.color = btn.dataset.color;
  renderSwatches();
});

let previewTimer = null;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 200);
}

$('f-code').addEventListener('input', (e) => {
  draft.code = e.target.value;
  if (!draft.id && !draft.formatTouched) {
    const guess = guessFormat(draft.code);
    if (guess !== draft.format) { draft.format = guess; renderFormatChips(); }
  }
  schedulePreview();
});
$('f-format').addEventListener('click', () => { draft.formatTouched = true; });
$('f-sub').addEventListener('input', (e) => { draft.sub = e.target.value; });
$('f-note').addEventListener('input', (e) => { draft.note = e.target.value; });

$('f-name').addEventListener('input', (e) => {
  draft.name = e.target.value;
  const matches = findInCatalog(draft.name);
  const box = $('suggest');
  if (!matches.length || matches.some((m) => m.name === draft.name)) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.innerHTML = matches.map((m, i) =>
    `<button type="button" data-i="${i}">
       <span class="dot" style="background:${m.color}"></span>
       <span><span class="s-name">${esc(m.name)}</span><br><span class="s-sub">${esc(m.sub)}</span></span>
     </button>`
  ).join('');
  box._matches = matches;
});

$('suggest').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const m = ($('suggest')._matches || [])[Number(btn.dataset.i)];
  if (!m) return;
  draft.name = m.name;
  draft.sub = m.sub;
  draft.color = m.color;
  draft.cat = m.cat;
  if (!draft.formatTouched && !draft.id) draft.format = m.format;
  $('f-name').value = m.name;
  $('f-sub').value = m.sub;
  $('suggest').hidden = true;
  renderFormatChips();
  renderSwatches();
  updatePreview();
});

function updatePreview() {
  const hint = $('code-hint');
  const msg = $('preview-msg');
  const panel = $('preview-panel');
  const canvas = $('preview-canvas');

  if (!draft.code.trim()) {
    hint.hidden = true;
    panel.hidden = true;
    msg.textContent = 'Scrivi il numero per vedere il codice.';
    return;
  }

  const v = validate(draft.code, draft.format);
  hint.hidden = false;
  hint.className = 'hint ' + (v.ok ? 'good' : 'bad');
  hint.textContent = v.ok ? (v.note || 'Numero valido.') : v.error;

  if (!v.ok) { panel.hidden = true; msg.textContent = ''; return; }

  panel.classList.toggle('two-d', isTwoD(draft.format));
  const res = tryRenderCode(canvas, v.code, draft.format, {
    targetWidth: 560, barHeight: isTwoD(draft.format) ? undefined : 14,
  });
  panel.hidden = !res.ok;
  msg.textContent = res.ok ? '' : 'Non riesco a disegnare questo codice: ' + res.error;
}

$('btn-save').addEventListener('click', save);

async function save() {
  const name = $('f-name').value.trim();
  const code = $('f-code').value.trim();
  if (!code) { toast('Manca il numero della tessera.', true); $('f-code').focus(); return; }
  if (!name) { toast('Dai un nome alla tessera.', true); $('f-name').focus(); return; }

  const v = validate(code, draft.format);
  if (!v.ok) { toast(v.error, true); return; }

  const probe = document.createElement('canvas');
  const res = tryRenderCode(probe, v.code, draft.format, { targetWidth: 300 });
  if (!res.ok) { toast('Codice non disegnabile: ' + res.error, true); return; }

  const saved = await store.putCard({
    ...draft,
    name,
    sub: $('f-sub').value.trim(),
    note: $('f-note').value.trim(),
    code: v.code,
  });

  cards = await store.allCards();
  current = saved;
  store.requestPersistence();
  toast(draft.id ? 'Modifiche salvate.' : 'Tessera aggiunta.');
  draft = null;
  navigate({ view: 'card', id: saved.id }, true);
}

$('btn-delete').addEventListener('click', () => removeCard(draft));

async function removeCard(card) {
  if (!card || !card.id) return;
  const ok = window.confirm(`Elimino «${card.name}»? Il numero non è recuperabile se non hai un backup.`);
  if (!ok) return;
  await store.deleteCard(card.id);
  cards = await store.allCards();
  current = null;
  draft = null;
  toast('Tessera eliminata.');
  navigate({ view: 'list' }, true);
}

// --- scansione ----------------------------------------------------------

let pendingScan = null;

$('btn-scan').addEventListener('click', () => navigate({ view: 'scan' }));
$('btn-scan-close').addEventListener('click', back);
$('btn-manual').addEventListener('click', () => { back(); setTimeout(() => $('f-code').focus(), 250); });
$('btn-photo').addEventListener('click', () => $('photo-input').click());

$('photo-input').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  $('scan-msg').textContent = 'Sto leggendo la foto…';
  try {
    const hit = await scanImageFile(file);
    showHit(hit);
  } catch (_) {
    $('scan-msg').textContent = 'Nella foto non ho trovato un codice. Riprova più da vicino, con luce piena.';
  }
});

async function openScanner() {
  pendingScan = null;
  $('scan-hit').hidden = true;
  $('btn-scan-use').hidden = true;
  $('scan-msg').textContent = 'Tieni la tessera piatta e ben illuminata.';

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    $('scan-msg').textContent =
      'Questo browser non dà accesso alla fotocamera. Usa «Scatta una foto» oppure digita il numero.';
    return;
  }

  try {
    scanner = await startLiveScan(
      $('scan-video'),
      (hit) => showHit(hit),
      null,
      (tentativi) => {
        if (pendingScan) return;
        // Dopo qualche secondo senza esito conviene dire cosa cambiare,
        // invece di lasciare l'utente a fissare un rettangolo muto.
        if (tentativi === 12) {
          $('scan-msg').textContent = 'Sto cercando… avvicina la tessera fino a riempire il riquadro.';
        } else if (tentativi === 45) {
          $('scan-msg').textContent =
            'Non ci riesco. Prova più luce, tienila ben piatta, oppure usa «Scatta una foto»: da ferma si legge meglio.';
        }
      }
    );
  } catch (err) {
    const nome = (err && err.name) || '';
    if (nome === 'NotAllowedError' || nome === 'SecurityError') {
      $('scan-msg').textContent =
        'Accesso alla fotocamera negato. In Safari: «aA» nella barra indirizzi → Impostazioni sito → Fotocamera → Consenti.';
    } else if (nome === 'NotFoundError' || nome === 'OverconstrainedError') {
      $('scan-msg').textContent = 'Nessuna fotocamera utilizzabile. Usa «Scatta una foto» o digita il numero.';
    } else {
      $('scan-msg').textContent = 'Fotocamera non disponibile (' + (nome || 'errore') + '). Prova con «Scatta una foto».';
    }
  }
}

function showHit(hit) {
  pendingScan = hit;
  $('scan-hit').hidden = false;
  $('scan-hit-format').textContent = hit.formatLabel + ' riconosciuto';
  $('scan-hit-code').textContent = groupDigits(hit.code);
  $('btn-scan-use').hidden = false;
  $('scan-msg').textContent = 'Trovato. Controlla che il numero coincida con quello sulla tessera.';
  if (navigator.vibrate) navigator.vibrate(30);
}

$('btn-scan-use').addEventListener('click', () => {
  if (!pendingScan) return;
  if (!draft) draft = blankCard();
  draft.code = pendingScan.code;
  draft.format = pendingScan.format;
  draft.formatTouched = true;
  back();
});

// --- impostazioni -------------------------------------------------------

async function renderSettings() {
  $('version-line').textContent = 'Tessere ' + VERSION;
  const info = await store.storageInfo();
  if (info) {
    const mb = (info.usage / 1048576).toFixed(1);
    $('storage-line').textContent =
      `${cards.length} tessere · ${mb} MB usati` +
      (info.persisted ? ' · archiviazione protetta' : ' · archiviazione non protetta, esporta ogni tanto');
  } else {
    $('storage-line').textContent = `${cards.length} tessere su questo telefono.`;
  }
}

$('btn-export').addEventListener('click', async () => {
  const data = await store.exportBackup();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tessere-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(`Backup di ${data.count} tessere pronto.`);
});

$('btn-import').addEventListener('click', () => $('import-input').click());

$('import-input').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const r = await store.importBackup(data);
    cards = await store.allCards();
    renderSettings();
    toast(`Importate: ${r.added} nuove, ${r.updated} aggiornate.`);
  } catch (err) {
    toast('Non riesco a leggere il file: ' + ((err && err.message) || err), true);
  }
});

// --- avvio --------------------------------------------------------------

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-back]')) back();
});

window.addEventListener('resize', () => {
  if (!$('view-full').hidden) renderFull();
  else if (!$('view-card').hidden) renderCard();
});

async function boot() {
  try {
    cards = await store.allCards();
  } catch (err) {
    toast('Archivio non accessibile: ' + ((err && err.message) || err), true);
    cards = [];
  }
  navigate({ view: 'list' }, true);

  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('sw.js'); } catch (_) { /* ignora */ }
  }

}

boot();

// utile in console per un controllo veloce
window.__tessere = { store, cards: () => cards, CATALOG };
