import type { PropertyType, Topography, Zone } from '@prisma/client';
import {
  ClientCriteriaData,
  ParseContext,
  ParseResult,
  emptyCriteria,
} from './criteria.types';
import {
  WORD_AMOUNT_PATTERN,
  escapeRegex,
  levenshtein,
  normalizeText,
  parseNumberToken,
  wordsToNumber,
} from './text-utils';

/**
 * Lee con reglas (sin IA) lo que busca un cliente. Si algo no se puede resolver con seguridad lo
 * deja en `ambiguities`: el servicio de criterios decide entonces si consulta a la IA.
 */

const uniq = <T>(items: T[]): T[] => [...new Set(items)];

// ─── Dinero ─────────────────────────────────────────────────────────────────

const AREA_UNIT_AFTER =
  /^\s*(m2|mt2|mts2|mts|mt|metros?|cuadrados|hectar[ei]as?|ha\b|cuadras?)/;

/** "1mil 500 metros cuadrados" → "1500 metros cuadrados"; "3mil metros" → "3000 metros". */
export const expandAreaThousands = (text: string): string =>
  text
    .replace(
      /\b(\d{1,3})\s*mil\s+(\d{1,3})\s*(?=(metros|m2|mts|cuadrados)\b)/g,
      (_, thousands: string, rest: string) =>
        `${Number(thousands) * 1000 + Number(rest)} `,
    )
    .replace(
      /\b(\d{1,3})\s*mil\s*(?=(metros|m2|mts|cuadrados)\b)/g,
      (_, thousands: string) => `${Number(thousands) * 1000} `,
    );
const COUNT_AFTER =
  /^\s*(min\b|minutos?|dormitorios?|cuartos?|habitaciones?|banos?|pisos?|plantas?|anos?|km|kilometros?|personas?|hijos?|parqueaderos?|departamentos?)/;
const MONEY_MAX_BEFORE =
  /\b(hasta|maximo|max\.?|tope( de)?|no mas de|menos de|presupuesto( maximo)?( de)?|cuenta con|dispone de|tiene|valor de|por|de unos|unos|alrededor de|cercano a|aproximadamente|precio( de)?)\s*(\$|usd)?\s*$/;
const MONEY_MIN_BEFORE =
  /\b(desde|minimo|mas de|a partir de|sobre los?)\s*(\$|usd)?\s*$/;
const MONEY_CONTEXT_BEFORE =
  /(presupuesto|precio|valor|pagar|credito|dolares|usd|\$|cuesta|costo|hasta|maximo|tope|financ)/;

interface MoneyHit {
  value: number;
  kind: 'max' | 'min' | 'plain';
}

/** Montos en USD: "100 mil", "100k", "$100mil", "$100000", "100.000", "cien mil", "1,5 millones"… */
export const parseMoney = (
  text: string,
): {
  max: number | null;
  min: number | null;
  ambiguous: string[];
  values: number[];
} => {
  const ambiguous: string[] = [];
  const hits: MoneyHit[] = [];
  const consumed: Array<[number, number]> = [];
  const isConsumed = (index: number) =>
    consumed.some(([from, to]) => index >= from && index < to);

  // Rangos: "entre 50 y 70 mil", "de 40 a 60 mil dolares".
  const RANGE =
    /\b(?:entre|de)\s+\$?\s*(\d[\d.,]*)\s*(mil|k|millon(?:es)?)?\s*(?:y|a|-)\s*\$?\s*(\d[\d.,]*)\s*(mil|k|millon(?:es)?)?\b/g;
  for (const m of text.matchAll(RANGE)) {
    const after = text.slice(m.index + m[0].length);
    if (AREA_UNIT_AFTER.test(after) || COUNT_AFTER.test(after)) continue;
    const mult = (word?: string) =>
      !word ? 1 : word.startsWith('millon') ? 1_000_000 : 1000;
    const highMult = mult(m[4]);
    const lowMult = m[2] ? mult(m[2]) : highMult;
    const low = (parseNumberToken(m[1]) ?? 0) * lowMult;
    const high = (parseNumberToken(m[3]) ?? 0) * highMult;
    if (high >= 1000 && low > 0) {
      hits.push({ value: Math.round(low), kind: 'min' });
      hits.push({ value: Math.round(high), kind: 'max' });
      consumed.push([m.index, m.index + m[0].length]);
    }
  }

  // Montos en palabras: "cien mil", "ochenta y cinco mil", "medio millon".
  for (const m of text.matchAll(WORD_AMOUNT_PATTERN)) {
    const base = wordsToNumber(m[1]);
    if (!base) {
      ambiguous.push('monto en palabras');
      continue;
    }
    const value = base * (m[2].startsWith('millon') ? 1_000_000 : 1000);
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    hits.push({
      value: Math.round(value),
      kind: MONEY_MIN_BEFORE.test(before)
        ? 'min'
        : MONEY_MAX_BEFORE.test(before)
          ? 'max'
          : 'plain',
    });
    consumed.push([m.index, m.index + m[0].length]);
  }

  const NUMBER =
    /(\$|us\$|usd)?\s*(\d[\d.,]*)\s*(mil\b|k\b|millon(?:es)?\b|m\b)?\s*(dolares|dolar|usd|dls)?/g;
  for (const m of text.matchAll(NUMBER)) {
    const start = m.index + m[0].indexOf(m[2]);
    if (isConsumed(start)) continue;
    const after = text.slice(m.index + m[0].length);
    const before = text.slice(Math.max(0, start - 30), start);
    const hasCurrency = Boolean(m[1] || m[4]);
    const multiplier = m[3]?.trim();
    // "900 m2", "15 min", "3 dormitorios": no son dinero ("m" sola es metros si no hay $).
    if (
      !hasCurrency &&
      (AREA_UNIT_AFTER.test(after) || COUNT_AFTER.test(after))
    )
      continue;
    if (multiplier === 'm' && !hasCurrency) continue;
    const base = parseNumberToken(m[2]);
    if (base === null) continue;
    const digits = m[2].replace(/\D/g, '');
    // Teléfonos y cédulas.
    if (!hasCurrency && !multiplier && digits.length >= 9) continue;
    const factor =
      multiplier === 'mil' || multiplier === 'k'
        ? 1000
        : multiplier?.startsWith('millon') || multiplier === 'm'
          ? 1_000_000
          : 1;
    const value = Math.round(base * factor);
    // Años sueltos ("2024").
    if (!hasCurrency && factor === 1 && value >= 1900 && value <= 2100)
      continue;
    const moneyContext = MONEY_CONTEXT_BEFORE.test(before);
    const isMoney = hasCurrency || factor > 1 || value >= 5000;
    if (!isMoney) {
      // "hasta 80" junto a "presupuesto": ¿80 mil? No se adivina.
      if (moneyContext && value > 0 && value < 1000)
        ambiguous.push('monto sin unidad');
      continue;
    }
    if (value < 1000) continue;
    hits.push({
      value,
      kind: MONEY_MIN_BEFORE.test(before)
        ? 'min'
        : MONEY_MAX_BEFORE.test(before)
          ? 'max'
          : 'plain',
    });
  }

  const maxes = hits.filter((h) => h.kind === 'max').map((h) => h.value);
  const mins = hits.filter((h) => h.kind === 'min').map((h) => h.value);
  const plains = uniq(
    hits.filter((h) => h.kind === 'plain').map((h) => h.value),
  );
  let max: number | null = maxes.length > 0 ? Math.max(...maxes) : null;
  if (max === null && plains.length > 0) {
    // Un solo monto sin "hasta" ("casa de 80 mil", "por $40mil") es su presupuesto.
    max = Math.max(...plains);
    if (plains.length > 1) ambiguous.push('varios montos');
  }
  const min = mins.length > 0 ? Math.min(...mins) : null;
  return {
    max,
    min: min !== null && max !== null && min > max ? null : min,
    ambiguous,
    values: uniq(hits.map((h) => h.value)),
  };
};

// ─── Área ───────────────────────────────────────────────────────────────────

export const AREA_PATTERN =
  /(\d[\d.,]*)\s*(m2|mt2|mts2|mts|mt|metros?(?:\s+cuadrados?)?|cuadrados|hectar[ei]as?|ha\b)/g;
const AREA_MAX_BEFORE =
  /\b(hasta|maximo|menos de|no mas de|no mayor a)\s*(unos\s+)?$/;
const AREA_DISTANCE_BEFORE = /\ba\s*(unos\s+)?$/;
const AREA_COMPARISON_BEFORE = /\b(mayor|superior|igual)\s+a\s*$/;
const AREA_DISTANCE_AFTER =
  /^\s*(de|del)\s+(la|el|las|los)?\s*(via|carretera|centro|parque|calle|escuela|iglesia|rio|vía|avenida|panamericana|entrada|ciudad)/;
const CONSTRUCTION_NEAR = /construccion|construida|construido|edificad/;

export const parseArea = (
  text: string,
): {
  minLand: number | null;
  maxLand: number | null;
  minConstruction: number | null;
  values: number[];
} => {
  const mins: number[] = [];
  const maxes: number[] = [];
  const constructions: number[] = [];
  const values: number[] = [];

  const half = /\bmedia\s+hectar[ei]a\b/.exec(text);
  if (half) {
    mins.push(5000);
    values.push(5000);
  }

  const RANGE =
    /\bentre\s+(\d[\d.,]*)\s*(?:m2|mts|metros)?\s*(?:y|a|-)\s*(\d[\d.,]*)\s*(m2|mt2|mts2|mts|metros?(?:\s+cuadrados?)?|hectar[ei]as?|ha\b)/g;
  const ranged: number[] = [];
  for (const m of text.matchAll(RANGE)) {
    const factor = /^h/.test(m[3]) ? 10_000 : 1;
    const low = parseNumberToken(m[1]);
    const high = parseNumberToken(m[2]);
    if (low && high) {
      mins.push(Math.round(low * factor));
      maxes.push(Math.round(high * factor));
      values.push(Math.round(low * factor), Math.round(high * factor));
      ranged.push(m.index + m[0].indexOf(m[2]));
    }
  }

  for (const m of text.matchAll(AREA_PATTERN)) {
    if (ranged.includes(m.index)) continue;
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    const after = text.slice(m.index + m[0].length);
    if (
      (AREA_DISTANCE_BEFORE.test(before) &&
        !AREA_COMPARISON_BEFORE.test(before)) ||
      AREA_DISTANCE_AFTER.test(after)
    )
      continue;
    const hectares = /^h/.test(m[2]);
    const base = parseNumberToken(m[1]);
    if (!base) continue;
    const value = Math.round(hectares ? base * 10_000 : base);
    values.push(value);
    const around = `${before.slice(-25)} ${after.slice(0, 25)}`;
    if (CONSTRUCTION_NEAR.test(around)) constructions.push(value);
    else if (AREA_MAX_BEFORE.test(before)) maxes.push(value);
    else mins.push(value);
  }

  return {
    minLand: mins.length > 0 ? Math.min(...mins) : null,
    maxLand: maxes.length > 0 ? Math.max(...maxes) : null,
    minConstruction:
      constructions.length > 0 ? Math.min(...constructions) : null,
    values: uniq(values),
  };
};

/** Primera superficie mencionada en un texto ("con un área de 4890 metros cuadrados"), en m². */
export const firstAreaInText = (text: string): number | null => {
  for (const m of text.matchAll(AREA_PATTERN)) {
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    const after = text.slice(m.index + m[0].length);
    if (
      (AREA_DISTANCE_BEFORE.test(before) &&
        !AREA_COMPARISON_BEFORE.test(before)) ||
      AREA_DISTANCE_AFTER.test(after)
    )
      continue;
    const base = parseNumberToken(m[1]);
    if (base) return Math.round(/^h/.test(m[2]) ? base * 10_000 : base);
  }
  return null;
};

// ─── Tipo e intención ───────────────────────────────────────────────────────

const LAND: PropertyType[] = ['Terreno', 'Lote', 'Finca'];
const HOUSE: PropertyType[] = ['Casa', 'Casa_y_terreno'];

export const parseTypes = (
  text: string,
): {
  types: PropertyType[];
  generic: boolean;
  uses: string[];
  features: string[];
} => {
  let rest = ` ${text} `;
  const types: PropertyType[] = [];
  const uses: string[] = [];
  const features: string[] = [];

  // "terreno para construir una casa / villa / quinta": es el uso del terreno, no el tipo buscado.
  const BUILD =
    /\b(?:para\s+)?(?:construir|construccion de|edificar|hacer|levantar)\s+(?:una\s+|su\s+|la\s+|mi\s+|un\s+)?(casa|vivienda|villa|quinta|cabana|departamento|local)s?\b/g;
  for (const m of rest.matchAll(BUILD)) {
    uses.push(
      ['quinta', 'cabana'].includes(m[1])
        ? 'recreacion'
        : m[1] === 'local'
          ? 'comercial'
          : 'vivienda',
    );
  }
  rest = rest.replace(BUILD, ' ');
  if (/\b(terrenos?|lotes?|solar(es)?)\b/.test(rest)) {
    const FOR =
      /\bpara\s+(?:una\s+|un\s+)?(villa|quinta|cabana|casa)s?(?:\s+(?:o|y)\s+(?:una\s+|un\s+)?(villa|quinta|cabana|casa)s?)?\b/g;
    for (const m of rest.matchAll(FOR)) {
      for (const w of [m[1], m[2]].filter(Boolean)) {
        uses.push(['quinta', 'cabana'].includes(w) ? 'recreacion' : 'vivienda');
      }
    }
    rest = rest.replace(FOR, ' ');
  }

  const HOUSE_WITH_LAND =
    /\b(casas?|viviendas?)\s+(?:\w+\s+){0,6}(con|y)\s+(?:un\s+poco\s+de\s+|poco\s+de\s+|poco\s+|amplio\s+|un\s+|gran\s+)?(terrenos?|patio|jardin(es)?|lotes?|espacios?\s+verdes?)\b|\bterrenos?\s+con\s+(casa|vivienda)s?\b/g;
  if (HOUSE_WITH_LAND.test(rest)) {
    types.push('Casa_y_terreno', 'Casa');
    rest = rest.replace(HOUSE_WITH_LAND, ' casa_con_terreno ');
  }
  // "el área del terreno debe ser…" describe el terreno de la casa, no busca un terreno.
  rest = rest.replace(
    /\b(area|superficie|metros)\s+(del|de)\s+terreno\b/g,
    ' ',
  );

  // "casa con departamentos", "casa grande con terreno y posible departamentos": característica.
  const WITH_APARTMENTS =
    /\bcon\s+(?:\w+\s+){0,3}departamentos?\b|\bposibles?\s+departamentos?\b|\b(?:tiene|tenga|tener|sea)\s+(?:\w+\s+){0,2}departamentos?\b|\bo\s+de\s+departamentos?\b/g;
  if (WITH_APARTMENTS.test(rest)) {
    features.push('departamentos');
    rest = rest.replace(WITH_APARTMENTS, ' ');
  }
  if (/\b(casas?|viviendas?|villas?|chalet)\b/.test(rest)) types.push(...HOUSE);
  if (/\b(terrenos?|lotes?|solar(es)?|tierras?)\b/.test(rest))
    types.push(...LAND);
  if (
    /\b(departamentos?|dptos?|deptos?|suites?|apartamentos?|minidepartamentos?)\b/.test(
      rest,
    )
  )
    types.push('Departamento');
  if (/\b(fincas?|quintas?|haciendas?)\b/.test(rest)) types.push('Finca');

  const generic =
    types.length === 0 &&
    /\b(propiedad(es)?|inmuebles?|bien(es)? raic(es)?|bienes)\b/.test(rest);
  return { types: uniq(types), generic, uses, features };
};

const SELLER =
  /\b(para (la )?venta|para vender|quiere vender|desea vender|busca vender|necesita vender|vend(e|o) (un|una|su|sus|el|la|terreno|casa|lote|propiedad)|esta vendiendo|vendiendo|ofrece (un|una|su|en venta)|tiene (un|una|unos|unas)? ?\w+ (para|en) venta|tiene (un|una)? ?(terreno|casa|lote|propiedad|finca|departamento) (para|en) (vender|venta))\b/;
const BUYER =
  /\b(compra|comprar|adquirir|invertir|inversion|busca|buscando|interesad[oa]|necesita (un|una|terreno|casa|lote)|quiere (un|una|terreno|casa|lote|comprar)|desea (un|una|comprar))\b/;
const NOT_LOOKING =
  /\b(ya compro|ya adquirio|ya no busca|no esta interesad[oa]|no le interesa|ya no le interesa|no busca nada)\b/;
/** Relación pasada con una propiedad ("me compró un terreno", "casa vendida", "dueña de…"). */
const PAST_RELATION =
  /\b((me|le|nos|que)\s+compro|compro\s+(un|una|el|la)|(se|que)\s+vendio|vendio\s+(con|un|una|el|la|su)|vendid[oa]s?|duen[oa]s?\s+(de|del))\b/;
const SEARCHING =
  /\b(busca|buscando|interesad[oa]|interes en|quiere|desea|necesita|le interesa|le interesan)\b/;

export const parseIntent = (
  text: string,
): { intent: ClientCriteriaData['intent']; ambiguous: boolean } => {
  if (NOT_LOOKING.test(text)) return { intent: 'OTRO', ambiguous: false };
  if (PAST_RELATION.test(text) && !SEARCHING.test(text))
    return { intent: 'OTRO', ambiguous: false };
  const seller = SELLER.test(text);
  const buyer = BUYER.test(text);
  if (seller && !buyer) return { intent: 'VENDE', ambiguous: false };
  // Vende y compra a la vez ("vende su casa y busca terreno"): decide la IA.
  return { intent: 'COMPRA', ambiguous: seller && buyer };
};

// ─── Ubicación ──────────────────────────────────────────────────────────────

const NEGATION_BEFORE =
  /(\bno\b|excepto|menos|salvo|\bni\b)\s+(en\s+|por\s+|de\s+)?(el\s+)?$/;
const OUTSIDE_BEFORE = /(fuera de|afuera de)\s*$/;
const PLACE_STOPWORDS = new Set([
  'ecuador',
  'azuay',
  'zona',
  'el',
  'la',
  'los',
  'las',
  'centro',
  'ciudad',
  'canton',
  'provincia',
  'venta',
  'buen',
  'buena',
  'lugar',
  'sector',
  'parte',
  'efectivo',
  'credito',
  'cuotas',
  'plano',
  'semiplano',
  'urbano',
  'rural',
  'esquina',
  'vivienda',
  'casa',
  'terreno',
  'lote',
]);

export const parseLocation = (
  text: string,
  originalText: string,
  context: ParseContext,
): {
  cities: string[];
  excluded: string[];
  sectors: string[];
  maxMinutes: number | null;
  nearCenter: boolean;
  ambiguous: string[];
} => {
  const cities: string[] = [];
  const excluded: string[] = [];
  const sectors: string[] = [];
  const ambiguous: string[] = [];
  const knownPlaces = new Set<string>();

  const cityEntries = context.cities.map((name) => ({
    name,
    norm: normalizeText(name),
  }));
  for (const { name, norm } of cityEntries) {
    knownPlaces.add(norm);
    const hits = [
      ...text.matchAll(new RegExp(`\\b${escapeRegex(norm)}\\b`, 'g')),
    ].map((m) => m.index);
    // Nombre mal escrito ("chordelg", "gualaseo"): una letra de diferencia en nombres largos.
    if (hits.length === 0 && norm.length >= 6 && !norm.includes(' ')) {
      for (const m of text.matchAll(/\b[a-z]{5,}\b/g)) {
        if (levenshtein(m[0], norm) <= 1 && !PLACE_STOPWORDS.has(m[0]))
          hits.push(m.index);
      }
    }
    for (const index of hits) {
      const before = text.slice(Math.max(0, index - 20), index);
      if (NEGATION_BEFORE.test(before)) excluded.push(name);
      else {
        if (OUTSIDE_BEFORE.test(before)) ambiguous.push(`"fuera de ${name}"`);
        cities.push(name);
      }
    }
  }

  for (const sector of context.sectors) {
    const norm = normalizeText(sector).replace(
      /^(sector|barrio|comunidad|parroquia|ciudadela)\s+(de\s+)?/,
      '',
    );
    if (norm.length < 4 || knownPlaces.has(norm)) continue;
    knownPlaces.add(norm);
    if (new RegExp(`\\b${escapeRegex(norm)}\\b`).test(text))
      sectors.push(sector);
  }

  // Lugares que no conocemos ("terreno en Pagran", "sector Callazay"): los resuelve la IA.
  const PLACE =
    /\b(?:en|por|sector(?: de)?|parroquia|comunidad(?: de)?|barrio)\s+(?:el\s+|la\s+|los\s+|las\s+|san\s+|santa\s+)?(?!sector\b|parroquia\b|comunidad\b|barrio\b)([a-zñ]{4,})\b/g;
  for (const m of text.matchAll(PLACE)) {
    const word = m[1];
    const explicit = /^(sector|parroquia|comunidad|barrio)/.test(m[0]);
    const capitalized = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i').exec(
      originalText.normalize('NFD').replace(/[̀-ͯ]/g, ''),
    );
    const looksLikeName = capitalized ? /^[A-Z]/.test(capitalized[0]) : false;
    if (PLACE_STOPWORDS.has(word)) continue;
    if ([...knownPlaces].some((p) => p.split(' ').includes(word))) continue;
    if (explicit || looksLikeName) {
      ambiguous.push(`lugar desconocido "${word}"`);
      sectors.push(word.charAt(0).toUpperCase() + word.slice(1));
    }
  }
  // "en Nallig o alrededores de Gualaceo": acepta toda la ciudad, el sector es solo referencia.
  const broadened =
    cities.length > 0 &&
    /\b(o|y)\s+(en\s+)?(los\s+|las\s+|sus\s+)?(alrededores|afueras|cercanias)\b/.test(
      text,
    );
  if (broadened) sectors.length = 0;

  const minutes =
    /\b(?:a|hasta)\s+(?:unos\s+|maximo\s+|no mas de\s+)?(\d{1,3})\s*(?:min\b|minutos?)/.exec(
      text,
    );
  const nearCenter =
    /\b(cerca (del|al) centro|centric[oa]|en el centro|centro de (la ciudad|\w+)|en la ciudad)\b/.test(
      text,
    );

  if (uniq(cities).length > 1 && /\bsi\s+(es|tiene|esta|hay)\b/.test(text))
    ambiguous.push('varias ciudades con condiciones');

  return {
    cities: uniq(cities),
    excluded: uniq(excluded),
    sectors: uniq(sectors),
    maxMinutes: minutes ? Number(minutes[1]) : null,
    nearCenter,
    ambiguous: uniq(ambiguous),
  };
};

// ─── Preferencias ───────────────────────────────────────────────────────────

export const parseTopography = (text: string): Topography[] => {
  if (/\bsemi\s?-?plan[oa]s?\b/.test(text)) return ['Plano', 'Semiplano'];
  if (/\bplan[oa]s?\b/.test(text)) return ['Plano'];
  if (/\b(con pendiente|inclinad[oa]|en ladera)\b/.test(text))
    return ['Pendiente'];
  return [];
};

export const parseZones = (text: string): Zone[] => {
  if (/\bfuera de (la )?zona urbana\b/.test(text)) return ['Rural'];
  if (
    /\b(cerca|cercan[oa]|proxim[oa]|junto|a lado)\s+(de|a)\s+(la\s+)?zona urbana\b/.test(
      text,
    )
  )
    return [];
  if (/\burbanizacion\b/.test(text)) return ['Urbanizacion'];
  if (/\b(zona urbana|urban[oa]s?)\b/.test(text))
    return ['Urbano', 'Urbanizacion'];
  if (/\b(zona rural|rural(es)?)\b/.test(text)) return ['Rural'];
  return [];
};

export const SERVICE_PATTERNS: Record<string, RegExp> = {
  riego: /\b(agua de riego|riego)\b/,
  agua: /\b(agua potable|agua(?! de riego))\b/,
  luz: /\b(luz|energia electrica|electricidad)\b/,
  alcantarillado: /\b(alcantarillado|desague)\b/,
  internet: /\binternet\b/,
  telefono: /\b(telefono|linea telefonica)\b/,
};

export const parseServices = (text: string): string[] => {
  const services = Object.entries(SERVICE_PATTERNS)
    .filter(([, re]) => re.test(text))
    .map(([key]) => key);
  if (/\bservicios basicos\b/.test(text)) services.push('agua', 'luz');
  return uniq(services);
};

export const USE_PATTERNS: Record<string, RegExp> = {
  agricola:
    /\b(sembrar|siembra|cultiv\w*|agricol\w*|frutales|ganad\w*|huerto|chacra)\b/,
  inversion: /\b(invertir|inversion)\b/,
  comercial:
    /\b(comercial(es)?|negocio|local|mecanica|taller|rentas?|rentera|rentable|airbnb|arriendo)\b/,
  recreacion:
    /\b(quinta|cabana|glamping|vacacional|descanso|fin de semana|recreacion)\b/,
  vivienda: /\b(para vivir|vivienda|construir)\b/,
};

export const parseUses = (text: string): string[] =>
  Object.entries(USE_PATTERNS)
    .filter(([, re]) => re.test(text))
    .map(([key]) => key);

export const FEATURE_PATTERNS: Record<string, RegExp> = {
  dormitorios: /\b\d?\s*(dormitorios?|habitaciones?|cuartos?|recamaras?)\b/,
  banos: /\b\d?\s*banos?\b/,
  jardin: /\b(jardin(es)?|espacios? verdes?|areas? verdes?|patio)\b/,
  parqueadero: /\b(parqueaderos?|garajes?|cocheras?|estacionamiento)\b/,
  frutales: /\b(frutales|arboles frutales)\b/,
  vista: /\b(vista|mirador)\b/,
  piscina: /\bpiscina\b/,
  'local comercial': /\blocal(es)? comercial(es)?\b/,
  'acceso vial':
    /\b(junto a la via|via principal|via asfaltada|acceso vehicular|carretera|avenidas? principal(es)?|via de acceso)\b/,
};

export const parseFeatures = (text: string): string[] =>
  Object.entries(FEATURE_PATTERNS)
    .filter(([, re]) => re.test(text))
    .map(([key]) => key);

// ─── Todo junto ─────────────────────────────────────────────────────────────

export const parseClientCriteria = (
  interestDescription: string | null | undefined,
  notes: string | null | undefined,
  context: ParseContext,
): ParseResult => {
  const original = [interestDescription, notes]
    .map((t) => (t ?? '').trim())
    .filter(Boolean)
    .join('. ');
  const text = expandAreaThousands(normalizeText(original));
  const criteria = emptyCriteria();
  const ambiguities: string[] = [];
  if (!text) return { criteria, ambiguities, knownNumbers: [] };

  const intent = parseIntent(text);
  criteria.intent = intent.intent;
  if (intent.ambiguous) ambiguities.push('vende y compra');

  const types = parseTypes(text);
  criteria.acceptedTypes = types.types;
  criteria.genericType = types.generic;
  if (
    criteria.intent === 'COMPRA' &&
    types.types.length === 0 &&
    !types.generic
  )
    ambiguities.push('sin tipo de propiedad');

  const location = parseLocation(text, original, context);
  criteria.acceptedCities = location.cities;
  criteria.excludedCities = location.excluded;
  criteria.acceptedSectors = location.sectors;
  criteria.maxMinutesCenter = location.maxMinutes;
  criteria.nearCenter = location.nearCenter;
  ambiguities.push(...location.ambiguous);

  const area = parseArea(text);
  criteria.minLandM2 = area.minLand;
  criteria.maxLandM2 = area.maxLand;
  criteria.minConstructionM2 = area.minConstruction;

  const money = parseMoney(text);
  criteria.maxBudgetUsd = money.max;
  criteria.minBudgetUsd = money.min;
  ambiguities.push(...money.ambiguous);

  criteria.topographies = parseTopography(text);
  criteria.zones = parseZones(text);
  criteria.requiredServices = parseServices(text);
  criteria.uses = uniq([...types.uses, ...parseUses(text)]);
  criteria.wantedFeatures = uniq([...types.features, ...parseFeatures(text)]);

  return {
    criteria,
    ambiguities: uniq(ambiguities),
    knownNumbers: uniq([...money.values, ...area.values]),
  };
};
