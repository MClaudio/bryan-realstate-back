/** Utilidades para validar que la salida de la IA no introduce datos que no están en la entrada. */

export const stripAccents = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '');

export const toWords = (value: string): string[] =>
  stripAccents(value.toLowerCase())
    .split(/[^a-z0-9ñ]+/i)
    .filter(Boolean);

/** Números "semánticos" de un texto (150.000 → 150000; 30mil / 30k → 30 y 30000). */
export const toNumbers = (value: string): string[] => {
  const numbers: string[] = [];
  for (const match of value.matchAll(/(\d[\d.,]*)\s*(mil\b|k\b)?/gi)) {
    const digits = match[1].replace(/\D/g, '');
    if (!digits) continue;
    numbers.push(digits);
    if (match[2]) numbers.push(`${digits}000`);
  }
  return numbers;
};

export const asText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** Igual que asText pero conserva los saltos de línea (textos con viñetas o párrafos). */
export const asMultilineText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** Quita emojis e íconos (incluye selectores de variación y uniones ZWJ). */
export const stripEmojis = (value: string): string =>
  value
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu, '')
    .replace(/[ \t]{2,}/g, ' ');

/** Une un texto en un solo párrafo (sin saltos de línea ni viñetas al inicio de línea). */
export const toSingleParagraph = (value: string): string =>
  value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•·]|\d+[.)])\s+/, '').trim())
    .filter(Boolean)
    .map((line) => (/[.!?:;]$/.test(line) ? line : `${line}.`))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Frases de llamado a la acción que no deben aparecer en la descripción corta. */
const CALL_TO_ACTION =
  /\s*(?:¡\s*)?(?:agend[ae]|reserv[ae]|coordin[ae]|solicit[ae]|ped[ií]|pid[ae]|contact[aeá]|escr[ií]b|ll[aá]m|comun[ií]c|no te lo pierdas|no pierdas|aprovech|consult[ae]|visit[ae]nos|te esperamos|m[aá]s informaci[oó]n)[^.!?]*[.!?]*\s*$/i;

/** Quita al final del texto los llamados a la acción ("Agenda tu visita.", "Contáctanos."...). */
export const stripTrailingCallToAction = (value: string): string => {
  let text = value.trim();
  for (let i = 0; i < 3; i += 1) {
    const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [];
    const last = sentences[sentences.length - 1] ?? '';
    if (sentences.length < 2 || !CALL_TO_ACTION.test(last)) break;
    text = sentences.slice(0, -1).join('').trim();
  }
  return text;
};

/**
 * Variantes de escritura de un valor numérico para compararlo con cifras de un texto
 * (1500.5 → "15005", "150050", "1500", "1501").
 */
export const numericVariants = (value: number): string[] => {
  if (!Number.isFinite(value)) return [];
  return [
    String(value).replace(/\D/g, ''),
    value.toFixed(2).replace(/\D/g, ''),
    String(Math.trunc(value)),
    String(Math.round(value)),
  ];
};

/** Una cifra de salida es válida si coincide con alguna de la entrada (tolerando ceros decimales). */
export const isKnownNumber = (candidate: string, known: Set<string>): boolean =>
  known.has(candidate) || known.has(candidate.replace(/0+$/, '')) || known.has(candidate.replace(/00$/, ''));
