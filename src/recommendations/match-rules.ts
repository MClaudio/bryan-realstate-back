import type { MatchLevel } from '@prisma/client';
import type { ClientCriteriaData, PropertyMatchData } from './criteria.types';
import {
  FEATURE_PATTERNS,
  SERVICE_PATTERNS,
  USE_PATTERNS,
} from './criteria-parser';
import { formatM2, formatUsd, normalizeText } from './text-utils';

/**
 * Reglas de emparejamiento propiedad ↔ cliente. Sin IA: deterministas y explicables.
 * Si cambias cualquier regla de este archivo, sube MATCH_RULES_VERSION: el cron recalcula todo.
 */
export const MATCH_RULES_VERSION = 'match-v3';

/** Usos que la descripción de la PROPIEDAD confirma (más estricto que lo que pide el cliente). */
const PROPERTY_USE_PATTERNS: Record<string, RegExp> = {
  ...USE_PATTERNS,
  comercial:
    /\b(uso comercial|locale?s? comercial(es)?|zona comercial|negocio|oficinas?|restaurante|airbnb|rentas?|bodega|nave industrial)\b/,
};

/** Características que la descripción de la PROPIEDAD confirma. */
const PROPERTY_FEATURE_PATTERNS: Record<string, RegExp> = {
  ...FEATURE_PATTERNS,
  departamentos: /\bdepartamentos?\b/,
};

/** Área hasta 10 % por debajo del mínimo pedido: se recomienda como BAJO. */
export const AREA_TOLERANCE = 0.9;

export interface MatchResult {
  level: MatchLevel;
  score: number;
  matched: string[];
  unconfirmed: string[];
  explanation: string;
}

const SERVICE_LABELS: Record<string, string> = {
  agua: 'agua potable',
  luz: 'luz',
  alcantarillado: 'alcantarillado',
  riego: 'agua de riego',
  internet: 'internet',
  telefono: 'teléfono',
};
const USE_LABELS: Record<string, string> = {
  vivienda: 'construir vivienda',
  agricola: 'uso agrícola',
  comercial: 'uso comercial',
  recreacion: 'quinta / recreación',
};
const TYPE_LABELS: Record<string, string> = {
  Casa_y_terreno: 'Casa y terreno',
};
const typeLabel = (type: string) => TYPE_LABELS[type] ?? type;

/** Servicios del formulario ("Agua de Riego" → riego) + los que menciona su descripción. */
export const normalizePropertyServices = (
  basicServices: unknown,
  text: string,
): string[] => {
  const list = Array.isArray(basicServices)
    ? basicServices.map(normalizeText)
    : [];
  const services = new Set<string>();
  for (const item of list) {
    if (item.includes('riego')) services.add('riego');
    else if (item.includes('agua')) services.add('agua');
    if (item.includes('luz') || item.includes('electric')) services.add('luz');
    if (item.includes('alcantarillado')) services.add('alcantarillado');
    if (item.includes('internet')) services.add('internet');
    if (item.includes('telefono')) services.add('telefono');
  }
  const normalized = normalizeText(text);
  for (const [key, re] of Object.entries(SERVICE_PATTERNS)) {
    if (re.test(normalized)) services.add(key);
  }
  return [...services];
};

const placeMatches = (value: string | null, wanted: string[]): boolean => {
  if (!value) return false;
  const norm = normalizeText(value);
  return wanted.some((w) => {
    const target = normalizeText(w);
    return norm === target || norm.includes(target) || target.includes(norm);
  });
};

const LAND_TYPES = new Set(['Terreno', 'Lote', 'Finca']);

/**
 * Evalúa una pareja. null = no se recomienda (algún criterio obligatorio o explícito no se cumple).
 * ALTO solo si TODO lo que el cliente pidió está confirmado, incluida ubicación y presupuesto.
 */
export const evaluateMatch = (
  property: PropertyMatchData,
  criteria: ClientCriteriaData,
): MatchResult | null => {
  if (criteria.intent !== 'COMPRA') return null;

  const matched: string[] = [];
  const unconfirmed: string[] = [];
  const details: string[] = [];
  const pending: string[] = [];
  let lowOnly = false;
  const propertyText = normalizeText(
    `${property.text} ${property.sector ?? ''}`,
  );

  // Tipo (obligatorio): sin tipo indicado no hay recomendación; "una propiedad" = cualquiera, sin ALTO.
  if (criteria.acceptedTypes.length > 0) {
    if (!criteria.acceptedTypes.includes(property.type)) return null;
    matched.push('tipo');
    details.push(`tipo (${typeLabel(property.type)})`);
  } else if (criteria.genericType) {
    unconfirmed.push('tipo');
    pending.push('tipo (busca "una propiedad")');
  } else {
    return null;
  }

  // Ubicación (obligatoria si la indica): ciudad exacta; sector si lo pide.
  if (property.city && criteria.excludedCities.includes(property.city))
    return null;
  if (
    criteria.acceptedCities.length > 0 ||
    criteria.acceptedSectors.length > 0
  ) {
    if (
      criteria.acceptedCities.length > 0 &&
      (!property.city || !criteria.acceptedCities.includes(property.city))
    )
      return null;
    if (criteria.acceptedSectors.length > 0) {
      const sectorText = `${property.sector ?? ''} ${property.text}`;
      if (
        !placeMatches(sectorText, criteria.acceptedSectors) &&
        !placeMatches(property.sector, criteria.acceptedSectors)
      )
        return null;
    }
    matched.push('ubicación');
    details.push(
      `ubicación (${[property.sector, property.city].filter(Boolean).join(', ')})`,
    );
  } else {
    unconfirmed.push('ubicación');
    pending.push('ubicación (el cliente no la indica)');
  }

  // Cercanía al centro.
  if (criteria.maxMinutesCenter !== null) {
    if (property.cityTime === null) {
      unconfirmed.push('cercanía');
      pending.push(`cercanía (pide máx. ${criteria.maxMinutesCenter} min)`);
    } else if (property.cityTime <= criteria.maxMinutesCenter) {
      matched.push('cercanía');
      details.push(`cercanía (${property.cityTime} min)`);
    } else {
      unconfirmed.push('cercanía');
      pending.push(
        `cercanía (está a ${property.cityTime} min; pide ${criteria.maxMinutesCenter})`,
      );
    }
  } else if (criteria.nearCenter) {
    if (property.cityTime !== null && property.cityTime <= 5) {
      matched.push('cercanía');
      details.push(`cerca del centro (${property.cityTime} min)`);
    } else if (
      /\b(en el centro (de|historico)|centro historico)\b/.test(propertyText)
    ) {
      matched.push('cercanía');
      details.push('en el centro');
    } else {
      unconfirmed.push('cercanía');
      pending.push(
        property.cityTime !== null
          ? `cerca del centro (está a ${property.cityTime} min)`
          : 'cerca del centro',
      );
    }
  }

  // Área: terreno; construcción si la pide o si es departamento.
  const wantsConstruction = criteria.minConstructionM2 !== null;
  const minArea = wantsConstruction
    ? criteria.minConstructionM2
    : criteria.minLandM2;
  const area =
    wantsConstruction || property.type === 'Departamento'
      ? property.constructionArea
      : property.landArea;
  if (minArea !== null) {
    if (area === null) {
      unconfirmed.push('área');
      pending.push(`área (pide desde ${formatM2(minArea)})`);
    } else if (area >= minArea) {
      matched.push('área');
      details.push(`área (${formatM2(area)} ≥ ${formatM2(minArea)})`);
    } else if (area >= minArea * AREA_TOLERANCE) {
      lowOnly = true;
      pending.push(
        `área (${formatM2(area)}, dentro de la tolerancia del 10 % del mínimo de ${formatM2(minArea)})`,
      );
      unconfirmed.push('área');
    } else {
      return null;
    }
  }
  if (
    criteria.maxLandM2 !== null &&
    property.landArea !== null &&
    LAND_TYPES.has(property.type)
  ) {
    if (property.landArea > criteria.maxLandM2 / AREA_TOLERANCE) return null;
    if (property.landArea > criteria.maxLandM2) {
      unconfirmed.push('área máxima');
      pending.push(
        `área (${formatM2(property.landArea)}; pide hasta ${formatM2(criteria.maxLandM2)})`,
      );
    } else if (!matched.includes('área')) {
      matched.push('área');
      details.push(
        `área (${formatM2(property.landArea)} ≤ ${formatM2(criteria.maxLandM2)})`,
      );
    }
  }

  // Presupuesto: tope estricto. Sin presupuesto no se puede asegurar la venta (nunca ALTO).
  if (criteria.maxBudgetUsd !== null) {
    if (property.price === null) {
      unconfirmed.push('presupuesto');
      pending.push('precio de la propiedad');
    } else if (property.price > criteria.maxBudgetUsd) {
      return null;
    } else {
      matched.push('presupuesto');
      details.push(
        `presupuesto (${formatUsd(property.price)} ≤ ${formatUsd(criteria.maxBudgetUsd)})`,
      );
    }
  } else {
    unconfirmed.push('presupuesto');
    pending.push('presupuesto (el cliente no lo indica)');
  }

  // Topografía: plano solo con Plano; Semiplano → sin confirmar; Mixto/Pendiente → no.
  if (criteria.topographies.length > 0) {
    if (!property.topography) {
      unconfirmed.push('topografía');
      pending.push('topografía');
    } else if (criteria.topographies.includes(property.topography)) {
      matched.push('topografía');
      details.push(`topografía (${property.topography})`);
    } else if (
      criteria.topographies.includes('Plano') &&
      property.topography === 'Semiplano'
    ) {
      unconfirmed.push('topografía');
      pending.push('topografía (pide plano; es semiplano)');
    } else {
      return null;
    }
  }

  // Zona.
  if (criteria.zones.length > 0) {
    if (!property.zone) {
      unconfirmed.push('zona');
      pending.push('zona');
    } else if (criteria.zones.includes(property.zone)) {
      matched.push('zona');
      details.push(
        `zona (${property.zone === 'Urbanizacion' ? 'Urbanización' : property.zone})`,
      );
    } else {
      return null;
    }
  }

  // Servicios pedidos.
  for (const service of criteria.requiredServices) {
    const label = SERVICE_LABELS[service] ?? service;
    if (property.services.includes(service)) {
      matched.push(label);
      details.push(label);
    } else {
      unconfirmed.push(label);
      pending.push(label);
    }
  }

  // Usos y características puntuales: se confirman solo si la descripción del asesor los menciona.
  for (const use of criteria.uses) {
    if (use === 'inversion') continue;
    const label = USE_LABELS[use] ?? use;
    const inferred =
      (use === 'vivienda' && LAND_TYPES.has(property.type)) ||
      (use === 'agricola' &&
        (property.type === 'Finca' || property.services.includes('riego')));
    if (inferred || PROPERTY_USE_PATTERNS[use]?.test(propertyText)) {
      matched.push(label);
      details.push(label);
    } else {
      unconfirmed.push(label);
      pending.push(label);
    }
  }
  for (const feature of criteria.wantedFeatures) {
    if (PROPERTY_FEATURE_PATTERNS[feature]?.test(propertyText)) {
      matched.push(feature);
      details.push(feature);
    } else {
      unconfirmed.push(feature);
      pending.push(feature);
    }
  }

  if (unconfirmed.includes('ubicación') && !matched.some((m) => m !== 'tipo'))
    return null;

  // Nivel: ALTO = todo confirmado; MEDIO = falta confirmar algo; BAJO = tolerancia de área o muchas dudas.
  let level: MatchLevel;
  if (lowOnly || unconfirmed.length >= 4) level = 'BAJO';
  else if (unconfirmed.length > 0) level = 'MEDIO';
  else level = 'ALTO';

  const total = matched.length + unconfirmed.length;
  const ratio = total > 0 ? matched.length / total : 0;
  const [min, max] =
    level === 'ALTO' ? [80, 100] : level === 'MEDIO' ? [60, 79] : [40, 59];
  const score = Math.round(min + (max - min) * ratio);

  const explanation = [
    `Coincide en: ${details.join(', ')}.`,
    pending.length > 0 ? `Sin confirmar: ${pending.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return { level, score, matched, unconfirmed, explanation };
};
