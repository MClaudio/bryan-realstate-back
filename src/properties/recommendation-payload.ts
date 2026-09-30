import { createHash } from 'node:crypto';
import {
  NumberLike,
  cleanText,
  positiveNumber,
  propertyEnumLabel,
  stringList,
} from '../ai/utils/property-labels';

/**
 * Datos de la propiedad relevantes para emparejar clientes. A propósito NO incluye precio
 * mínimo/máximo, comisión, precio real, propietario, asesor, estado, coordenadas, redes,
 * archivos ni descripciones públicas: no aportan al match, gastan tokens y (las descripciones)
 * cambiarían la huella sin que la propiedad cambie.
 */
export interface RecommendationPropertySource {
  propertyType?: string | null;
  city?: { name?: string | null } | null;
  referenceSector?: string | null;
  address?: string | null;
  zone?: string | null;
  topography?: string | null;
  landArea?: NumberLike;
  constructionArea?: NumberLike;
  constructionYears?: NumberLike;
  hasBasicServices?: boolean | null;
  basicServices?: unknown;
  cityTime?: NumberLike;
  features?: string | null;
  observations?: string | null;
  price?: NumberLike;
}

export interface RecommendationClientSource {
  id: string;
  interestDescription?: string | null;
  notes?: string | null;
}

/** Cliente tal como se envía a la IA: sin nombre ni teléfono. */
export interface RecommendationClientPayload {
  id: string;
  /** interés */
  i?: string;
  /** notas */
  n?: string;
}

const MAX_CLIENT_TEXT = 300;
const MAX_PROPERTY_TEXT = 1500;

const truncate = (value: string | undefined, max: number) =>
  value && value.length > max ? `${value.slice(0, max - 1)}…` : value;

export const buildRecommendationProperty = (
  property: RecommendationPropertySource,
): Record<string, unknown> => {
  const services = stringList(property.basicServices);
  const data: Record<string, unknown> = {
    tipo: propertyEnumLabel(property.propertyType),
    ciudad: cleanText(property.city?.name),
    sector: cleanText(property.referenceSector),
    direccion: cleanText(property.address),
    zona: propertyEnumLabel(property.zone),
    topografia: propertyEnumLabel(property.topography),
    terreno_m2: positiveNumber(property.landArea),
    construccion_m2: positiveNumber(property.constructionArea),
    anios: positiveNumber(property.constructionYears),
    servicios: property.hasBasicServices && services.length > 0 ? services : undefined,
    min_ciudad: positiveNumber(property.cityTime),
    caracteristicas: truncate(cleanText(property.features), MAX_PROPERTY_TEXT),
    observaciones: truncate(cleanText(property.observations), MAX_PROPERTY_TEXT),
    precio: positiveNumber(property.price),
  };
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
};

/** JSON con claves ordenadas para que la huella no dependa del orden. */
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

export const computeRecommendationHash = (compactProperty: Record<string, unknown>): string =>
  createHash('sha256').update(stableStringify(compactProperty)).digest('hex');

export const hasRecommendationText = (client: RecommendationClientSource): boolean =>
  Boolean(cleanText(client.interestDescription) || cleanText(client.notes));

export const buildRecommendationClient = (
  client: RecommendationClientSource,
): RecommendationClientPayload => {
  const payload: RecommendationClientPayload = { id: client.id };
  const interest = truncate(cleanText(client.interestDescription), MAX_CLIENT_TEXT);
  const notes = truncate(cleanText(client.notes), MAX_CLIENT_TEXT);
  if (interest) payload.i = interest;
  if (notes) payload.n = notes;
  return payload;
};
