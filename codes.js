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

function buildReader() {
  const Z = zxing();
  const hints = new Map();
  hints.set(
    Z.DecodeHintType.POSSIBLE_FORMATS,
    FORMATS.map((f) => Z.BarcodeFormat[f.zxing]).filter((v) => v !== undefined)
  );
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  return new Z.BrowserMultiFormatReader(hints, 300);
}

function toResult(result) {
  const Z = zxing();
  const name = Z.BarcodeFormat[result.getBarcodeFormat()];
  const f = BY_ZXING.get(name);
  return { code: result.getText(), format: f ? f.key : 'code128', formatLabel: f ? f.label : name };
}

/**
 * Scansione dal vivo. Restituisce un oggetto con stop().
 * onResult riceve { code, format, formatLabel }.
 */
export async function startLiveScan(videoEl, onResult, onError) {
  const reader = buildReader();
  let stopped = false;
  const Z = zxing();

  await reader.decodeFromConstraints(
    { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } },
    videoEl,
    (result, err) => {
      if (stopped) return;
      if (result) {
        onResult(toResult(result));
        return;
      }
      // NotFoundException arriva a ogni fotogramma senza codice: è normale.
      if (err && !(err instanceof Z.NotFoundException) && onError) onError(err);
    }
  );

  return {
    stop() {
      stopped = true;
      try {
        reader.reset();
      } catch (_) {
        /* ignora */
      }
      const stream = videoEl.srcObject;
      if (stream && stream.getTracks) stream.getTracks().forEach((t) => t.stop());
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
