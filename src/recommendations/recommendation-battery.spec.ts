import { Prisma } from '@prisma/client';
import { parseClientCriteria } from './criteria-parser';
import { evaluateMatch } from './match-rules';
import { toPropertyMatchData } from './match-engine.service';
import {
  BATTERY_CITIES,
  BATTERY_CLIENTS,
  BATTERY_PROPERTIES,
  BatteryProperty,
} from './__fixtures__/battery';
import { BATTERY2_CLIENTS, BATTERY2_PROPERTIES } from './__fixtures__/battery2';

/**
 * Batería con datos reales (5 propiedades × 50 clientes = 250 pares), solo con reglas (sin IA).
 * Resultado esperado según los criterios acordados:
 * - tipo y ubicación obligatorios (cantón y sector pedidos); casa ≠ casa con terreno ≠ terreno;
 * - presupuesto tope estricto; área con tolerancia del 10 % (BAJO); requisitos explícitos (plano…);
 * - solo compradores: quien vendió, compró, es dueño o no busca nada no se recomienda;
 * - ALTO solo si todo está confirmado (ninguno de estos clientes indica todo → no hay ALTO).
 */
const EXPECTED: Record<string, Record<string, 'ALTO' | 'MEDIO' | 'BAJO'>> = {
  // Terreno 4.890 m² (escrito en la descripción; el formulario dice 0), Mixto, rural, $76.000.
  'Gual-SectorBullzhun-53': {
    'Cliente 13': 'MEDIO', // "propiedad" (tipo genérico) de más de 800 m² en alrededores de Gualaceo
    'Cliente 33': 'MEDIO', // terreno en Gualaceo mayor a 500 m²; sin presupuesto
  },
  // Casa en Cuenca, $258.000.
  'Cuen-Ciudadeladelosingenieros-56': {
    'Cliente 36': 'MEDIO', // casa comercial en Cuenca; centro y uso comercial sin confirmar
    'Cliente 37': 'MEDIO', // casa comercial en Cuenca; uso comercial sin confirmar
  },
  // Casa en Chordeleg: ningún cliente busca casa en Chordeleg.
  'Chor-SectorPorrion-45': {},
  // Terreno 3.000 m² en Gualaceo, Mixto, $120.000.
  'Gual-entrecertagysanjose-31': {
    'Cliente 13': 'MEDIO',
    'Cliente 33': 'MEDIO',
  },
  // Casa en Cuenca, $160.000 (oficinas → uso comercial confirmado).
  'cuencremig-0011': {
    'Cliente 36': 'MEDIO',
    'Cliente 37': 'MEDIO',
  },
};

/** Por qué NO se recomiendan algunos casos clave (documentación de la batería). */
const NOT_BUYERS = [
  'Cliente 3',
  'Cliente 7',
  'Cliente 10',
  'Cliente 15',
  'Cliente 16',
  'Cliente 42',
  'Cliente 43',
];

const context = {
  cities: BATTERY_CITIES,
  sectors: BATTERY_PROPERTIES.map((p) => p.sector),
};

const toData = (p: BatteryProperty) =>
  toPropertyMatchData({
    id: p.codigo,
    status: 'Nuevo',
    deletedAt: null,
    propertyType: p.tipo,
    referenceSector: p.sector,
    address: p.direccion,
    landArea: new Prisma.Decimal(p.terreno_m2),
    constructionArea: new Prisma.Decimal(p.construccion_m2),
    topography: p.topografia,
    zone: p.zona,
    basicServices: p.servicios,
    hasBasicServices: p.servicios.length > 0,
    cityTime: p.minutos_al_centro,
    price: new Prisma.Decimal(p.precio_usd),
    features: p.caracteristicas,
    observations: p.observaciones,
    recommendationHash: null,
    advisorId: 'advisor',
    code: p.codigo,
    city: { name: p.ciudad },
  } as never);

const criteriaByClient = Object.fromEntries(
  Object.entries(BATTERY_CLIENTS).map(([name, text]) => [
    name,
    parseClientCriteria(text, null, context).criteria,
  ]),
);

describe('Batería real: 5 propiedades × 50 clientes', () => {
  it.each(BATTERY_PROPERTIES.map((p) => [p.codigo, p] as const))(
    '%s: recomienda exactamente a los clientes esperados y con el nivel esperado',
    (codigo, property) => {
      const data = toData(property);
      const actual: Record<string, string> = {};
      for (const [name, criteria] of Object.entries(criteriaByClient)) {
        const result = evaluateMatch(data, criteria);
        if (result) actual[name] = result.level;
      }
      expect(actual).toEqual(EXPECTED[codigo]);
    },
  );

  it('ninguno sale en ALTO: a todos les falta confirmar algo (presupuesto, tipo o uso)', () => {
    for (const property of BATTERY_PROPERTIES) {
      for (const criteria of Object.values(criteriaByClient)) {
        expect(evaluateMatch(toData(property), criteria)?.level).not.toBe(
          'ALTO',
        );
      }
    }
  });

  it('quien vendió, compró, es dueño o está vendiendo no es comprador', () => {
    for (const name of NOT_BUYERS) {
      expect([name, criteriaByClient[name].intent]).not.toEqual([
        name,
        'COMPRA',
      ]);
    }
  });

  it('la propiedad sin área en el formulario toma la escrita por el asesor (4.890 m²)', () => {
    expect(toData(BATTERY_PROPERTIES[0]).landArea).toBe(4890);
  });

  it('lugares que no son ciudades conocidas se exigen como sector (no se amplía a toda la ciudad)', () => {
    expect(criteriaByClient['Cliente 19']).toMatchObject({
      acceptedCities: ['Gualaceo'],
      acceptedSectors: ['Tocteloma'],
      minLandM2: 700,
    });
    expect(criteriaByClient['Cliente 14'].acceptedSectors).toEqual([
      'Cazhalao',
    ]);
    // "en Nallig o alrededores de Gualaceo": acepta toda la ciudad.
    expect(criteriaByClient['Cliente 13']).toMatchObject({
      acceptedCities: ['Gualaceo'],
      acceptedSectors: [],
    });
  });

  it('casa con (poco) terreno no es buscar terreno; "terreno mayor a 2000m2" es mínimo, no máximo', () => {
    expect(criteriaByClient['Cliente 23'].acceptedTypes).toEqual([
      'Casa_y_terreno',
      'Casa',
    ]);
    expect(criteriaByClient['Cliente 44'].acceptedTypes).toEqual([
      'Casa_y_terreno',
      'Casa',
    ]);
    expect(criteriaByClient['Cliente 21']).toMatchObject({
      minLandM2: 2000,
      maxLandM2: null,
    });
    expect(criteriaByClient['Cliente 28'].minLandM2).toBe(50000); // "5 hectarias"
  });
});

/**
 * Segunda batería real. Casos clave:
 * - Cliente 19 ("vendió con nosotros"), 33 ("dueño del terreno"), 18 ("compró"), 38 ("quiere vender"): no son compradores.
 * - Cliente 49 ("Comprador terreno esquinero de …"): sin ubicación ni otro dato que coincida → no se recomienda.
 * - Cliente 11 ("1mil cuadrados en adelante") = 1.000 m²; Cliente 35 ("1mil 500 metros") = 1.500 m².
 * - Cliente 43 ("máximo 1000 metros"): el terreno de 2.480 m² no aplica.
 * - Sectores pedidos (Callazay, Capzha, Pagrán, Nallig, Zhio) que no son los de estas propiedades → no aplican.
 */
const EXPECTED2: Record<string, Record<string, 'ALTO' | 'MEDIO' | 'BAJO'>> = {
  // Casa en el centro de Cuenca (San Blas), $225.000, antes usada como departamentos.
  'Cuen-AcuadraymediadelregistrocivildeSanBlas-60': {
    'Cliente 1': 'MEDIO', // casa comercial zona urbana de Cuenca
    'Cliente 10': 'MEDIO', // casa de departamentos en Cuenca
    'Cliente 14': 'MEDIO', // casa en el centro de Cuenca (centro confirmado por la descripción)
    'Cliente 15': 'MEDIO', // casa en Cuenca para remodelar / Airbnb
    'Cliente 30': 'MEDIO', // casa o terreno en zona comercial / centro de Cuenca
    'Cliente 42': 'MEDIO', // casa rentera en Cuenca
  },
  // Terreno 2.480 m² plano, urbano, 2 min del centro de Gualaceo, $480.000.
  'Gual-cercadeparquedelafamilia-27': {
    'Cliente 2': 'MEDIO', // > 2.000 m² plano en Gualaceo
    'Cliente 5': 'MEDIO', // > 1.300 m² plano, hasta 8 min
    'Cliente 11': 'MEDIO', // ≥ 1.000 m² en Gualaceo
    'Cliente 12': 'MEDIO', // terreno amplio en Gualaceo
    'Cliente 26': 'MEDIO', // terrenos en Gualaceo o Chordeleg
    'Cliente 32': 'MEDIO', // plano ≥ 700 m², a 5 min
    'Cliente 36': 'MEDIO', // propiedad > 800 m² en alrededores de Gualaceo
  },
  // Terreno 993 m² (descripción), semiplano, 6 min (descripción), $24.000.
  'Gual-SectorSanFranciscoBajo-50': {
    'Cliente 11': 'BAJO', // pide ≥ 1.000 m²: 993 está dentro de la tolerancia del 10 %
    'Cliente 12': 'MEDIO',
    'Cliente 23': 'MEDIO', // lotes hasta $30.000 (sin ubicación → nunca ALTO)
    'Cliente 26': 'MEDIO',
    'Cliente 31': 'MEDIO', // terrenos hasta $90.000 (sin ubicación)
    'Cliente 32': 'MEDIO', // pide plano y 5 min: es semiplano y está a 6 min
    'Cliente 36': 'MEDIO',
    'Cliente 43': 'MEDIO', // máximo 1.000 m² en Gualaceo; frutales sin confirmar
  },
  // Terreno 630 m² semiplano en Chiquintur, 5 min, $59.000.
  'Gual-Cercadelafundaciónvidaylibertadydeltirofijo-35': {
    'Cliente 12': 'MEDIO', // junto a vía principal: colinda con vía asfaltada
    'Cliente 26': 'MEDIO',
    'Cliente 31': 'MEDIO', // hasta $90.000, junto a la vía (sin ubicación)
    'Cliente 32': 'BAJO', // pide ≥ 700 m²: 630 dentro de la tolerancia
    'Cliente 43': 'MEDIO',
  },
  // Casa en Cuenca (Remigio Crespo), $160.000.
  'cuencremig-0011': {
    'Cliente 1': 'MEDIO',
    'Cliente 10': 'MEDIO',
    'Cliente 14': 'MEDIO', // centro sin confirmar
    'Cliente 15': 'MEDIO',
    'Cliente 30': 'MEDIO',
    'Cliente 42': 'MEDIO',
  },
};

describe('Batería real 2: otras 5 propiedades × 50 clientes', () => {
  const context2 = {
    cities: BATTERY_CITIES,
    sectors: BATTERY2_PROPERTIES.map((p) => p.sector),
  };
  const criteria2 = Object.fromEntries(
    Object.entries(BATTERY2_CLIENTS).map(([name, text]) => [
      name,
      parseClientCriteria(text, null, context2).criteria,
    ]),
  );

  it.each(BATTERY2_PROPERTIES.map((p) => [p.codigo, p] as const))(
    '%s: recomienda exactamente a los clientes esperados y con el nivel esperado',
    (codigo, property) => {
      const data = toData(property);
      const actual: Record<string, string> = {};
      for (const [name, criteria] of Object.entries(criteria2)) {
        const result = evaluateMatch(data, criteria);
        if (result) actual[name] = result.level;
      }
      expect(actual).toEqual(EXPECTED2[codigo]);
    },
  );

  it('no compradores: vendió, es dueño, compró o quiere vender', () => {
    expect(criteria2['Cliente 19'].intent).toBe('OTRO');
    expect(criteria2['Cliente 33'].intent).toBe('OTRO');
    expect(criteria2['Cliente 18'].intent).toBe('OTRO');
    expect(criteria2['Cliente 38'].intent).toBe('VENDE');
  });

  it('áreas escritas con "mil": 1mil cuadrados, 3mil metros, 1mil 500 metros', () => {
    expect(criteria2['Cliente 11'].minLandM2).toBe(1000);
    expect(criteria2['Cliente 20'].minLandM2).toBe(3000);
    expect(criteria2['Cliente 35'].minLandM2).toBe(1500);
  });

  it('datos que el formulario dejó en 0 se toman de la descripción del asesor', () => {
    const sanFrancisco = toData(BATTERY2_PROPERTIES[2]);
    expect(sanFrancisco).toMatchObject({ landArea: 993, cityTime: 6 });
    expect(toData(BATTERY2_PROPERTIES[0]).landArea).toBe(204);
  });
});
