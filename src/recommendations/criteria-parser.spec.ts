import {
  parseArea,
  parseClientCriteria,
  parseMoney,
  parseTypes,
} from './criteria-parser';
import { normalizeText } from './text-utils';

const context = {
  cities: ['Gualaceo', 'Paute', 'Chordeleg', 'Cuenca', 'Sígsig'],
  sectors: ['San Antonio', 'Pirincay', 'El Progreso', 'Chiquintur', 'Nieves'],
};
const parse = (text: string) => parseClientCriteria(text, null, context);
const money = (text: string) => parseMoney(normalizeText(text));
const area = (text: string) => parseArea(normalizeText(text));

describe('parseMoney: variantes de montos', () => {
  it.each([
    'hasta 100 mil',
    'hasta 100mil',
    'hasta 100k',
    'hasta 100K',
    'hasta $100mil',
    'hasta $ 100 mil',
    'hasta $100000',
    'hasta 100.000',
    'hasta 100,000',
    'hasta 100.000,00',
    'hasta USD 100000',
    'hasta 100 mil dólares',
    'presupuesto de cien mil',
  ])('"%s" → 100000', (text) => {
    expect(money(text).max).toBe(100000);
  });

  it('millones y palabras compuestas', () => {
    expect(money('hasta 1,5 millones').max).toBe(1500000);
    expect(money('tope 1.5M dólares').max).toBe(1500000);
    expect(money('ochenta y cinco mil dólares').max).toBe(85000);
    expect(money('medio millón').max).toBe(500000);
  });

  it('rangos: "entre 50 y 70 mil" → mínimo 50000, máximo 70000', () => {
    expect(money('entre 50 y 70 mil')).toMatchObject({
      min: 50000,
      max: 70000,
    });
    expect(money('de 40 a 60 mil dólares')).toMatchObject({
      min: 40000,
      max: 60000,
    });
  });

  it('un monto suelto es su presupuesto; las áreas, minutos, teléfonos y años no son dinero', () => {
    expect(money('casa de 80 mil').max).toBe(80000);
    expect(money('terreno de 900m2 a 10 minutos').max).toBeNull();
    expect(money('llamar al 0991234567 en 2024').max).toBeNull();
    expect(money('3 dormitorios y 2 baños').max).toBeNull();
  });

  it('"hasta 80" junto a presupuesto es ambiguo (¿80 mil?)', () => {
    expect(money('presupuesto hasta 80').ambiguous).toContain(
      'monto sin unidad',
    );
  });
});

describe('parseArea', () => {
  it.each([
    ['900m2 en adelante', 900],
    ['900 m² mínimo', 900],
    ['mayor a 500 metros cuadrados', 500],
    ['más de 600 mts', 600],
    ['de 1.500 m2', 1500],
    ['2 hectáreas', 20000],
    ['media hectárea', 5000],
    ['1 ha', 10000],
  ])('"%s" → mínimo %d', (text, expected) => {
    expect(area(text).minLand).toBe(expected);
  });

  it('distingue máximos, distancias y construcción', () => {
    expect(area('hasta 1000 m2')).toMatchObject({
      minLand: null,
      maxLand: 1000,
    });
    expect(area('a 200 metros de la vía')).toMatchObject({
      minLand: null,
      maxLand: null,
    });
    expect(area('casa de 120 m2 de construcción')).toMatchObject({
      minLand: null,
      minConstruction: 120,
    });
    expect(area('entre 500 y 1000 m2')).toMatchObject({
      minLand: 500,
      maxLand: 1000,
    });
  });
});

describe('parseTypes', () => {
  const types = (text: string) => parseTypes(normalizeText(text)).types;

  it('casa con terreno ≠ terreno; terreno para construir casa/villa/quinta = terreno', () => {
    expect(types('Busca casa con terreno amplio')).toEqual([
      'Casa_y_terreno',
      'Casa',
    ]);
    expect(types('Busca terreno para construir una casa')).toEqual([
      'Terreno',
      'Lote',
      'Finca',
    ]);
    expect(types('Busca amplio terreno urbano para villa o quinta')).toEqual([
      'Terreno',
      'Lote',
      'Finca',
    ]);
    expect(types('Interesado en una casa')).toEqual(['Casa', 'Casa_y_terreno']);
    expect(types('Busca departamento o suite')).toEqual(['Departamento']);
    expect(
      types('Busca casa grande con terreno y posible departamentos'),
    ).toEqual(['Casa_y_terreno', 'Casa']);
  });

  it('"propiedad" sin tipo es genérico', () => {
    expect(
      parseTypes(normalizeText('Busca propiedades sobre 600m2')),
    ).toMatchObject({ types: [], generic: true });
  });
});

describe('parseClientCriteria: intereses reales', () => {
  it('Erika: terrenos planos de 700 m² en adelante en Gualaceo o a 5 min del centro (sin IA)', () => {
    const { criteria, ambiguities } = parse(
      'Busca terrenos planos de 700m2 en adelante en gualaceo o a unos 5 minutos del centro de gualaceo',
    );
    expect(criteria).toMatchObject({
      intent: 'COMPRA',
      acceptedTypes: ['Terreno', 'Lote', 'Finca'],
      acceptedCities: ['Gualaceo'],
      minLandM2: 700,
      maxMinutesCenter: 5,
      topographies: ['Plano'],
    });
    expect(ambiguities).toEqual([]);
  });

  it('Ángel Villa: Gualaceo, nunca Paute', () => {
    const { criteria } = parse(
      'Busca un terreno grande más de 900 metros cuadrados en Gualaceo',
    );
    expect(criteria.acceptedCities).toEqual(['Gualaceo']);
    expect(criteria.minLandM2).toBe(900);
  });

  it('Elizabeth Idrovo: plano, 900 m² en adelante, $35mil', () => {
    const { criteria } = parse(
      'Busca invertir en un terreno plano puede ser de 900m2 en adelante y cuenta con un presupuesto de $35mil dólares',
    );
    expect(criteria).toMatchObject({
      minLandM2: 900,
      maxBudgetUsd: 35000,
      topographies: ['Plano'],
    });
    expect(criteria.uses).toContain('inversion');
  });

  it('vendedor de El Progreso → VENDE', () => {
    const { criteria } = parse(
      'Tiene un terreno para vender por el sector de el progreso en gualaceo',
    );
    expect(criteria.intent).toBe('VENDE');
  });

  it('acepta varias ciudades y excluye las negadas; corrige "Chordelg"', () => {
    expect(
      parse('Busco terreno en Gualaceo, aunque también acepto Paute').criteria
        .acceptedCities,
    ).toEqual(['Gualaceo', 'Paute']);
    expect(
      parse('Busca terreno en Gualaceo, no en Paute').criteria,
    ).toMatchObject({
      acceptedCities: ['Gualaceo'],
      excludedCities: ['Paute'],
    });
    expect(
      parse('Busca terreno plano mayor a 1000m2 en Gualaceo o Chordelg')
        .criteria.acceptedCities,
    ).toEqual(['Gualaceo', 'Chordeleg']);
  });

  it('casos que necesitan IA: lugar desconocido, "fuera de", sin tipo', () => {
    expect(parse('Busca terreno en Pagran').ambiguities).toContain(
      'lugar desconocido "pagran"',
    );
    expect(
      parse('Busca terreno desde 500m2 fuera de Gualaceo').ambiguities,
    ).toContain('"fuera de Gualaceo"');
    expect(parse('Busca algo en Gualaceo hasta 40mil').ambiguities).toContain(
      'sin tipo de propiedad',
    );
  });

  it('sectores conocidos', () => {
    expect(
      parse('Busca terreno en San Antonio de Gualaceo').criteria
        .acceptedSectors,
    ).toEqual(['San Antonio']);
  });

  it('cifras conocidas para validar a la IA', () => {
    expect(parse('terreno de 700 m2 hasta 60mil').knownNumbers.sort()).toEqual(
      [60000, 700].sort(),
    );
  });
});
