/** Utilidades de texto y números para leer intereses de clientes escritos a mano. */

/** Minúsculas, sin tildes, "m²" → "m2", espacios simples. */
export const normalizeText = (value: unknown): string =>
  (typeof value === 'string'
    ? value
    : typeof value === 'number'
      ? String(value)
      : ''
  )
    .replace(/²/g, '2')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Número escrito con separadores, en formato ecuatoriano o anglosajón:
 * "100.000" / "100,000" / "100.000,00" / "100000" → 100000; "1,5" / "1.5" → 1.5.
 */
export const parseNumberToken = (raw: string): number | null => {
  const token = raw.replace(/[.,]+$/, '');
  if (!token || !/\d/.test(token)) return null;
  let normalized: string;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(token)) {
    normalized = token.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(token)) {
    normalized = token.replace(/,/g, '');
  } else if (/^\d+[.,]\d{1,2}$/.test(token)) {
    normalized = token.replace(',', '.');
  } else if (/^\d+$/.test(token)) {
    normalized = token;
  } else {
    normalized = token.replace(/[.,]/g, '');
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
};

const WORD_VALUES: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiun: 21,
  veintiuno: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
  cien: 100,
  ciento: 100,
  doscientos: 200,
  doscientas: 200,
  trescientos: 300,
  trescientas: 300,
  cuatrocientos: 400,
  cuatrocientas: 400,
  quinientos: 500,
  quinientas: 500,
  seiscientos: 600,
  seiscientas: 600,
  setecientos: 700,
  setecientas: 700,
  ochocientos: 800,
  ochocientas: 800,
  novecientos: 900,
  novecientas: 900,
};
const WORD_ALTERNATION = Object.keys(WORD_VALUES)
  .sort((a, b) => b.length - a.length)
  .join('|');
/** "ochenta y cinco mil", "cien mil", "un millon", "medio millon" (texto ya normalizado). */
export const WORD_AMOUNT_PATTERN = new RegExp(
  `\\b((?:(?:${WORD_ALTERNATION})(?:\\s+y\\s+|\\s+))*(?:${WORD_ALTERNATION})|medio)\\s+(mil|millon(?:es)?)\\b`,
  'g',
);

/** Valor de una frase como "ochenta y cinco" (sin el multiplicador). */
export const wordsToNumber = (phrase: string): number | null => {
  if (phrase.trim() === 'medio') return 0.5;
  let total = 0;
  for (const word of phrase.split(/\s+/)) {
    if (word === 'y' || !word) continue;
    const value = WORD_VALUES[word];
    if (value === undefined) return null;
    total += value;
  }
  return total > 0 ? total : null;
};

/** Distancia de edición (para nombres mal escritos: "Chordelg" → "Chordeleg"). */
export const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = temp;
    }
  }
  return prev[b.length];
};

export const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const formatUsd = (value: number): string =>
  `$${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

export const formatM2 = (value: number): string =>
  `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} m²`;
