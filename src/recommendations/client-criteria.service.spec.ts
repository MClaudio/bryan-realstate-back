import { parseClientCriteria } from './criteria-parser';
import {
  criteriaHashOf,
  mergeAiCriteria,
  sourceHashOf,
} from './client-criteria.service';

const context = {
  cities: ['Gualaceo', 'Paute', 'Chordeleg'],
  sectors: ['San Antonio'],
};

const aiOutput = (overrides: Record<string, unknown> = {}) => ({
  id: 'x',
  intent: 'COMPRA',
  accepted_types: ['Terreno', 'Lote', 'Finca'],
  generic_type: false,
  accepted_cities: ['Gualaceo'],
  excluded_cities: [],
  accepted_sectors: [],
  max_minutes_center: null,
  near_center: false,
  min_land_m2: null,
  max_land_m2: null,
  min_construction_m2: null,
  min_budget_usd: null,
  max_budget_usd: null,
  topographies: [],
  zones: [],
  required_services: [],
  uses: [],
  wanted_features: [],
  notes: '',
  ...overrides,
});

const merge = (text: string, overrides: Record<string, unknown>) =>
  mergeAiCriteria(
    aiOutput(overrides),
    parseClientCriteria(text, null, context),
    text,
    context,
  );

describe('mergeAiCriteria: la IA no puede inventar', () => {
  it('acepta cifras del texto en cualquiera de sus variantes', () => {
    expect(
      merge('Busca terreno en Gualaceo hasta 100k', { max_budget_usd: 100000 })
        .criteria.maxBudgetUsd,
    ).toBe(100000);
    expect(
      merge('Busca terreno en Gualaceo hasta $100.000', {
        max_budget_usd: 100000,
      }).criteria.maxBudgetUsd,
    ).toBe(100000);
    expect(
      merge('terreno de cien mil en Gualaceo', { max_budget_usd: 100000 })
        .criteria.maxBudgetUsd,
    ).toBe(100000);
  });

  it('descarta cifras que no están en el texto y usa lo que leyeron las reglas', () => {
    const { criteria, rejected } = merge(
      'Busca terreno en Gualaceo hasta 60mil',
      { max_budget_usd: 90000, min_land_m2: 800 },
    );
    expect(criteria.maxBudgetUsd).toBe(60000);
    expect(criteria.minLandM2).toBeNull();
    expect(rejected).toEqual(['min_land_m2=800', 'max_budget_usd=90000']);
  });

  it('solo ciudades de la tabla cities (escritas como en la tabla); Gualaceo no se amplía a Paute', () => {
    const { criteria } = merge('Busca terreno en gualaceo', {
      accepted_cities: ['gualaceo', 'Paute ', 'Quito'],
    });
    expect(criteria.acceptedCities).toEqual(['Gualaceo', 'Paute']);
  });

  it('valores fuera de catálogo se ignoran', () => {
    const { criteria } = merge('terreno en Gualaceo', {
      accepted_types: ['Terreno', 'Castillo'],
      topographies: ['Plano', 'Ondulado'],
      required_services: ['agua', 'gas'],
      intent: 'QUIZAS',
    });
    expect(criteria).toMatchObject({
      acceptedTypes: ['Terreno'],
      topographies: ['Plano'],
      requiredServices: ['agua'],
      intent: 'COMPRA',
    });
  });
});

describe('huellas', () => {
  it('la huella del texto ignora mayúsculas, tildes y espacios', () => {
    expect(sourceHashOf('Busca  Terreno en Gualaceo', null)).toBe(
      sourceHashOf('busca terreno en gualaceo', ''),
    );
  });

  it('la huella de criterios no depende del orden de las listas', () => {
    const a = parseClientCriteria(
      'terreno en Gualaceo o Paute',
      null,
      context,
    ).criteria;
    const b = { ...a, acceptedCities: [...a.acceptedCities].reverse() };
    expect(criteriaHashOf(a)).toBe(criteriaHashOf(b));
  });
});
