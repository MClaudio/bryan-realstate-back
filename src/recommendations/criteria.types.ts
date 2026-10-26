import type {
  CriteriaIntent,
  PropertyType,
  Topography,
  Zone,
} from '@prisma/client';

/**
 * Lo que busca un cliente, estructurado. Listas vacías / null = el cliente no lo dice
 * (nunca se asume que lo acepta todo: el matching lo trata como "sin confirmar").
 */
export interface ClientCriteriaData {
  intent: CriteriaIntent;
  acceptedTypes: PropertyType[];
  genericType: boolean;
  acceptedCities: string[];
  excludedCities: string[];
  acceptedSectors: string[];
  maxMinutesCenter: number | null;
  nearCenter: boolean;
  minLandM2: number | null;
  maxLandM2: number | null;
  minConstructionM2: number | null;
  minBudgetUsd: number | null;
  maxBudgetUsd: number | null;
  topographies: Topography[];
  zones: Zone[];
  /** agua | luz | alcantarillado | riego | internet | telefono */
  requiredServices: string[];
  /** vivienda | agricola | inversion | comercial | recreacion */
  uses: string[];
  /** dormitorios | banos | jardin | parqueadero | frutales | vista | piscina | departamentos | local comercial | acceso vial */
  wantedFeatures: string[];
}

export const emptyCriteria = (): ClientCriteriaData => ({
  intent: 'COMPRA',
  acceptedTypes: [],
  genericType: false,
  acceptedCities: [],
  excludedCities: [],
  acceptedSectors: [],
  maxMinutesCenter: null,
  nearCenter: false,
  minLandM2: null,
  maxLandM2: null,
  minConstructionM2: null,
  minBudgetUsd: null,
  maxBudgetUsd: null,
  topographies: [],
  zones: [],
  requiredServices: [],
  uses: [],
  wantedFeatures: [],
});

/** Contexto para leer ubicaciones: ciudades de la tabla `cities` y sectores conocidos. */
export interface ParseContext {
  cities: string[];
  sectors: string[];
}

export interface ParseResult {
  criteria: ClientCriteriaData;
  /** Motivos por los que las reglas no alcanzan y conviene usar la IA. Vacío = resuelto por reglas. */
  ambiguities: string[];
  /** Cifras (USD y m²) que aparecen en el texto: las de la IA deben estar aquí. */
  knownNumbers: number[];
}

/** Datos de la propiedad que usa el matching (solo del formulario). */
export interface PropertyMatchData {
  id: string;
  type: PropertyType;
  city: string | null;
  sector: string | null;
  landArea: number | null;
  constructionArea: number | null;
  topography: Topography | null;
  zone: Zone | null;
  services: string[];
  cityTime: number | null;
  price: number | null;
  /** Características + observaciones + dirección del formulario (nunca las descripciones públicas). */
  text: string;
}
