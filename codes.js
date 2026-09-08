// Generazione e lettura dei codici.
// Generazione: bwip-js (copre tutti i formati che servono).
// Lettura: ZXing-JS, perché Safari non espone BarcodeDetector.

export const FORMATS = [
  { key: 'ean13', label: 'EAN-13', bcid: 'ean13', zxing: 'EAN_13', dim: 1, digits: [12, 13] },
  { key: 'ean8', label: 'EAN-8', bcid: 'ean8', zxing: 'EAN_8', dim: 1, digits: [7, 8] },
  { key: 'upca', label: 'UPC-A', bcid: 'upca', zxing: 'UPC_A', dim: 1, digits: [11, 12] },
  { key: 'upce', label: 'UPC-E', bcid: 'upce', zxing: 'UPC_E', dim: 1, digits: [7, 8] },
  { key: 'code128', label: 'Code 128', bcid: 'code128', zxing: 'CODE_128', dim: 1 },
  { key: 'code39', label: 'Code 39', bcid: 'code39', zxing: 'CODE_39', dim: 1 },
  { key: 'itf', label: 'ITF', bcid: 'interleaved2of5', zxing: 'ITF', dim: 1 },
  { key: 'codabar', label: 'Codabar', bcid: 'rationalizedCodabar', zxing: 'CODABAR', dim: 1 },
  { key: 'qrcode', label: 'QR', bcid: 'qrcode', zxing: 'QR_CODE', dim: 2 },
  { key: 'aztec', label: 'Aztec', bcid: 'azteccode', zxing: 'AZTEC', dim: 2 },
  { key: 'pdf417', label: 'PDF417', bcid: 'pdf417', zxing: 'PDF_417', dim: 2 },
  { key: 'datamatrix', label: 'Data Matrix', bcid: 'datamatrix', zxing: 'DATA_MATRIX', dim: 2 },
];

const BY_KEY = new Map(FORMATS.map((f) => [f.key, f]));
const BY_ZXING = new Map(FORMATS.map((f) => [f.zxing, f]));

export function formatOf(key) {
  return BY_KEY.get(key) || BY_KEY.get('code128');
}

export function formatLabel(key) {
  return formatOf(key).label;
}

export function isTwoD(key) {
  return formatOf(key).dim === 2;
}

// --- Validazione -------------------------------------------------------

function eanChecksum(digits) {
  // Vale per EAN-13, EAN-8, UPC-A: pesi alternati a partire da destra.
  let sum = 0;
  const rev = digits.split('').reverse();
  for (let i = 0; i < rev.length; i++) {
    sum += Number(rev[i]) * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Controlla se il codice è compatibile con il formato scelto.
 * Restituisce { ok, code, warning } — `code` può essere completato
 * con la cifra di controllo mancante.
 */
export function validate(rawCode, formatKey) {
  const f = formatOf(formatKey);
  const code = String(rawCode || '').trim();
  if (!code) return { ok: false, code, error: 'Manca il numero della tessera.' };

  if (f.digits) {
    const digits = code.replace(/\D/g, '');
    const [short, full] = f.digits;
    if (digits.length === short) {
      return { ok: true, code: digits + eanChecksum(digits), note: 'Cifra di controllo aggiunta.' };
    }
    if (digits.length === full) {
      const body = digits.slice(0, -1);
      const given = Number(digits.slice(-1));
      if (eanChecksum(body) !== given) {
        return {
          ok: false,
          code: digits,
          error: `Cifra di controllo non valida per ${f.label}. Ricontrolla il numero, oppure usa Code 128.`,
        };
      }
      return { ok: true, code: digits };
    }
    return {
      ok: false,
      code: digits,
      error: `${f.label} vuole ${short} o ${full} cifre, questo ne ha ${digits.length}.`,
    };
  }

  if (f.key === 'itf') {
    const digits = code.replace(/\D/g, '');
    if (!digits) return { ok: false, code, error: 'ITF accetta solo cifre.' };
    if (digits.length % 2 !== 0) {
      return { ok: false, code: digits, error: 'ITF vuole un numero pari di cifre.' };
    }
    return { ok: true, code: digits };
  }

  if (f.key === 'code39') {
    const up = code.toUpperCase();
    if (!/^[0-9A-Z\-. $/+%]*$/.test(up)) {
      return { ok: false, code, error: 'Code 39 accetta lettere maiuscole, cifre e - . $ / + %' };
    }
    return { ok: true, code: up };
  }

  if (f.key === 'codabar') {
    const up = code.toUpperCase();
    const wrapped = /^[A-D]/.test(up) ? up : 'A' + up + 'A';
    if (!/^[A-D][0-9\-$:/.+]*[A-D]$/.test(wrapped)) {
      return { ok: false, code, error: 'Codabar accetta cifre e - $ : / . +' };
    }
    return { ok: true, code: wrapped };
  }

  return { ok: true, code };
}

/** Prova a indovinare il formato da un numero digitato a mano. */
export function guessFormat(code) {
  const digits = String(code || '').replace(/\D/g, '');
  const clean = String(code || '').trim();
  if (digits.length === clean.length) {
    if (digits.length === 13 || digits.length === 12) return 'ean13';
    if (digits.length === 8) return 'ean8';
  }
  return 'code128';
}

// --- Generazione -------------------------------------------------------

function bwip() {
  const lib = window.bwipjs;
  if (!lib) throw new Error('Libreria dei codici non caricata.');
  return lib;
}

/**
 * Disegna il codice su un canvas, scegliendo la scala perché risulti
 * nitido alla larghezza richiesta (i codici sfocati non si leggono).
 */
export function renderCode(canvas, code, formatKey, opts = {}) {
  const f = formatOf(formatKey);
  const targetPx = Math.max(240, Math.round(opts.targetWidth || 640));
  const barHeight = opts.barHeight || (f.dim === 2 ? undefined : 16);

  const draw = (scale) => {
    const o = {
      bcid: f.bcid,
      text: code,
      scale,
      includetext: false,
      backgroundcolor: 'FFFFFF',
      paddingwidth: f.dim === 2 ? 2 : 4,
      paddingheight: f.dim === 2 ? 2 : 2,
    };
    if (barHeight) o.height = barHeight;
    bwip().toCanvas(canvas, o);
  };

  // Prima passata per misurare, seconda per centrare la nitidezza.
  draw(2);
  const modules = canvas.width / 2;
  let scale = Math.ceil(targetPx / Math.max(modules, 1));
  scale = Math.min(Math.max(scale, 2), 24);
  if (scale !== 2) draw(scale);
  return canvas;
}

/** Come renderCode, ma non solleva: restituisce l'errore da mostrare. */
export function tryRenderCode(canvas, code, formatKey, opts) {
  try {
    renderCode(canvas, code, formatKey, opts);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err && err.message) || String(err) };
  }
}

// --- Lettura -----------------------------------------------------------

function zxing() {
  const lib = window.ZXing;
  if (!lib) throw new Error('Libreria di lettura non caricata.');
  return lib;
}

function buildHints(Z) {
  const hints = new Map();
  hints.set(
    Z.DecodeHintType.POSSIBLE_FORMATS,
    FORMATS.map((f) => Z.BarcodeFormat[f.zxing]).filter((v) => v !== undefined)
  );
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  return hints;
}

function buildReader() {
  const Z = zxing();
  return new Z.BrowserMultiFormatReader(buildHints(Z), 300);
}

function toResult(result) {
  const Z = zxing();
  const name = Z.BarcodeFormat[result.getBarcodeFormat()];
  const f = BY_ZXING.get(name);
  return { code: result.getText(), format: f ? f.key : 'code128', formatLabel: f ? f.label : name };
}

// --- lettura dal vivo ---------------------------------------------------
//
// Il ciclo di decodifica è scritto a mano invece di lasciarlo alla libreria,
// per tre motivi che sul telefono fanno la differenza fra "legge" e "non
// legge mai":
//
// 1. la libreria analizza il fotogramma intero, ridimensionato; qui invece si
//    ritaglia la fascia centrale alla risoluzione nativa, dove il codice sta
//    davvero, e i tratti restano netti;
// 2. i lettori lineari di ZXing scandiscono righe orizzontali: se tieni la
//    tessera ruotata non trovano niente, quindi si prova anche a 90°;
// 3. si chiede una risoluzione alta e la messa a fuoco continua, perché un
//    codice a barre sfocato non si legge nemmeno a occhio.

function drawRegion(video, canvas, sx, sy, sw, sh, rotate) {
  const MAX = 1400;                       // oltre non serve, e costa tempo
  const k = Math.min(1, MAX / Math.max(sw, sh));
  const dw = Math.max(2, Math.round(sw * k));
  const dh = Math.max(2, Math.round(sh * k));
  canvas.width = rotate ? dh : dw;
  canvas.height = rotate ? dw : dh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.save();
  if (rotate) {
    ctx.translate(dh, 0);
    ctx.rotate(Math.PI / 2);
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
  ctx.restore();
}

/**
 * Avvia la lettura dal vivo.
 * onResult riceve { code, format, formatLabel }; onStatus riceve il numero
 * di tentativi, così l'interfaccia può dire qualcosa invece di tacere.
 * Restituisce un oggetto con stop().
 */
export async function startLiveScan(videoEl, onResult, onError, onStatus) {
  const Z = zxing();
  let stopped = false;
  let stream = null;
  let timer = null;
  let attempts = 0;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
  } catch (err) {
    throw err;   // il chiamante distingue permesso negato da fotocamera assente
  }

  // Messa a fuoco continua dove il dispositivo la espone: senza, molti
  // telefoni restano fissi sull'infinito e la tessera resta sfocata.
  try {
    const track = stream.getVideoTracks()[0];
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    if (caps && caps.focusMode && caps.focusMode.includes('continuous')) {
      await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
    }
  } catch (_) { /* facoltativo */ }

  videoEl.setAttribute('playsinline', 'true');
  videoEl.setAttribute('muted', 'true');
  videoEl.muted = true;
  videoEl.srcObject = stream;

  await new Promise((res) => {
    if (videoEl.readyState >= 2) return res();
    videoEl.onloadedmetadata = () => res();
    setTimeout(res, 3000);
  });
  try { await videoEl.play(); } catch (_) { /* alcuni browser partono da soli */ }

  const reader = new Z.MultiFormatReader();
  reader.setHints(buildHints(Z));
  const canvas = document.createElement('canvas');

  const tick = () => {
    if (stopped) return;
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;

    if (vw && vh && videoEl.readyState >= 2) {
      // Tre inquadrature a rotazione, una per giro, per restare reattivi.
      // La fascia va presa nel verso del codice: per un codice orizzontale
      // una striscia larga, per uno verticale una striscia alta. Ritagliare
      // di traverso taglierebbe il codice per il lungo e lo renderebbe
      // illeggibile — ed è esattamente l'errore che faceva fallire la lettura
      // delle tessere tenute ruotate.
      const strategia = attempts % 3;
      const bandH = Math.round(vh * 0.55);
      const bandY = Math.round((vh - bandH) / 2);
      const bandW = Math.round(vw * 0.55);
      const bandX = Math.round((vw - bandW) / 2);
      try {
        if (strategia === 0) drawRegion(videoEl, canvas, 0, bandY, vw, bandH, false);
        else if (strategia === 1) drawRegion(videoEl, canvas, bandX, 0, bandW, vh, true);
        else drawRegion(videoEl, canvas, 0, 0, vw, vh, false);

        const src = new Z.HTMLCanvasElementLuminanceSource(canvas);
        const bitmap = new Z.BinaryBitmap(new Z.HybridBinarizer(src));
        const result = reader.decode(bitmap);
        if (result) {
          stopped = true;
          onResult(toResult(result));
          return;
        }
      } catch (err) {
        // NotFoundException a ogni fotogramma senza codice: è il caso normale
        if (err && !(err instanceof Z.NotFoundException) && err.name !== 'NotFoundException') {
          if (onError) onError(err);
        }
      } finally {
        try { reader.reset(); } catch (_) { /* ignora */ }
      }
      attempts++;
      if (onStatus) onStatus(attempts);
    }

    timer = setTimeout(tick, 120);
  };

  tick();

  return {
    stop() {
      stopped = true;
      clearTimeout(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    },
  };
}

/** Legge un codice da una foto scattata o scelta dalla galleria. */
export async function scanImageFile(file) {
  const reader = buildReader();
  const url = URL.createObjectURL(file);
  try {
    const result = await reader.decodeFromImageUrl(url);
    return toResult(result);
  } finally {
    URL.revokeObjectURL(url);
    try {
      reader.reset();
    } catch (_) {
      /* ignora */
    }
  }
}
