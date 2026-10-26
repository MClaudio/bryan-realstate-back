import { parseClientCriteria } from './criteria-parser';
import type { PropertyMatchData } from './criteria.types';
import { evaluateMatch } from './match-rules';

const context = {
  cities: ['Gualaceo', 'Paute', 'Chordeleg', 'Cuenca'],
  sectors: ['San Antonio', 'Pirincay', 'El Progreso', 'Chiquintur'],
};
const criteriaOf = (text: string) =>
  parseClientCriteria(text, null, context).criteria;
const match = (property: PropertyMatchData, text: string) =>
  evaluateMatch(property, criteriaOf(text));

const pirincay: PropertyMatchData = {
  id: 'pirincay',
  type: 'Terreno',
  city: 'Paute',
  sector: 'Pirincay',
  landArea: 1045,
  constructionArea: null,
  topography: 'Mixto',
  zone: 'Urbano',
  services: ['agua', 'alcantarillado', 'luz'],
  cityTime: 5,
  price: 88000,
  text: 'Terreno con topografía plana y semiplanas, vía asfaltada, agua potable y alcantarillado',
};
const sanAntonio: PropertyMatchData = {
  id: 'san-antonio',
  type: 'Terreno',
  city: 'Gualaceo',
  sector: 'San Antonio',
  landArea: 862,
  constructionArea: null,
  topography: 'Plano',
  zone: 'Urbano',
  services: ['agua', 'luz', 'riego'],
  cityTime: 12,
  price: 55000,
  text: 'Junto a la vía que conduce a San Juan. Para construir tu quinta vacacional con espacios verdes. Perímetro delimitado.',
};
const elProgreso: PropertyMatchData = {
  id: 'el-progreso',
  type: 'Terreno',
  city: 'Gualaceo',
  sector: 'El Progreso',
  landArea: 462,
  constructionArea: null,
  topography: 'Mixto',
  zone: 'Urbano',
  services: ['agua', 'luz'],
  cityTime: 3,
  price: 35000,
  text: 'Topografía mixta con dos terraplanes. A 3 minutos del centro cantonal.',
};

describe('evaluateMatch: casos reales', () => {
  describe('Paute (Pirincay) frente a clientes de Gualaceo', () => {
    it('Erika (Gualaceo, plano) → sin match', () => {
      expect(
        match(
          pirincay,
          'Busca terrenos planos de 700m2 en adelante en gualaceo o a unos 5 minutos del centro de gualaceo',
        ),
      ).toBeNull();
    });

    it('Ángel Villa (más de 900 m² en Gualaceo) → sin match', () => {
      expect(
        match(
          pirincay,
          'Busca un terreno grande más de 900 metros cuadrados en Gualaceo',
        ),
      ).toBeNull();
    });

    it('cliente que acepta Gualaceo y Paute → match', () => {
      const result = match(
        pirincay,
        'Busco un terreno de más de 900 m² en Gualaceo, aunque también acepto Paute',
      );
      expect(result).not.toBeNull();
      expect(result?.matched).toEqual(
        expect.arrayContaining(['tipo', 'ubicación', 'área']),
      );
    });
  });

  it('Elizabeth (plano, 900 m², $35mil) frente a 462 m² mixto → sin match', () => {
    expect(
      match(
        elProgreso,
        'Busca invertir en un terreno plano puede ser de 900m2 en adelante y cuenta con un presupuesto de $35mil dólares',
      ),
    ).toBeNull();
  });

  it('vendedor de El Progreso → sin match', () => {
    expect(
      match(
        elProgreso,
        'Tiene un terreno para vender por el sector de el progreso en gualaceo',
      ),
    ).toBeNull();
  });

  it('"Interesado en una casa" frente a un terreno → sin match', () => {
    expect(match(sanAntonio, 'Interesado en una casa')).toBeNull();
  });

  it('San Antonio: el tipo sale del formulario (registrada como Casa coincide con quien busca casa)', () => {
    const asHouse: PropertyMatchData = { ...sanAntonio, type: 'Casa' };
    const text = 'Busca casa con terreno en Gualaceo hasta 80mil';
    expect(match(asHouse, text)).not.toBeNull();
    expect(match(sanAntonio, text)).toBeNull();
  });

  it('ALTO solo si todo está confirmado (tipo, ubicación, área, presupuesto, topografía)', () => {
    const result = match(
      sanAntonio,
      'Busca terreno plano en Gualaceo desde 700m2 hasta $60mil',
    );
    expect(result).toMatchObject({ level: 'ALTO', unconfirmed: [] });
    expect(result?.explanation).toBe(
      'Coincide en: tipo (Terreno), ubicación (San Antonio, Gualaceo), área (862 m² ≥ 700 m²), presupuesto ($55.000 ≤ $60.000), topografía (Plano).',
    );
  });

  it('sin presupuesto nunca es ALTO', () => {
    const result = match(sanAntonio, 'Busca terreno en Gualaceo');
    expect(result?.level).toBe('MEDIO');
    expect(result?.explanation).toContain(
      'Sin confirmar: presupuesto (el cliente no lo indica)',
    );
  });

  it('sin ubicación: MEDIO o BAJO, nunca ALTO', () => {
    const result = match(sanAntonio, 'Busca terreno plano hasta 60mil');
    expect(result?.level).toBe('MEDIO');
    expect(result?.unconfirmed).toContain('ubicación');
  });

  it('presupuesto estricto: $50mil no alcanza para $55.000', () => {
    expect(
      match(sanAntonio, 'Busca terreno en Gualaceo hasta 50mil'),
    ).toBeNull();
  });

  it('área hasta 10 % por debajo → BAJO; más abajo → sin match', () => {
    expect(
      match(sanAntonio, 'Busca terreno en Gualaceo de 900m2 hasta 60mil')
        ?.level,
    ).toBe('BAJO');
    expect(
      match(sanAntonio, 'Busca terreno de 2000 m2 en Gualaceo'),
    ).toBeNull();
  });

  it('pide plano y es semiplano → MEDIO; mixto → sin match', () => {
    expect(
      match(
        { ...sanAntonio, topography: 'Semiplano' },
        'Busca terreno plano en Gualaceo hasta 60mil',
      )?.level,
    ).toBe('MEDIO');
    expect(match(elProgreso, 'Busca terreno plano en Gualaceo')).toBeNull();
  });

  it('"propiedades sobre 600 m²" (tipo genérico) → MEDIO', () => {
    const result = match(
      sanAntonio,
      'Busca propiedades sobre 600m2 cerca de zona urbana de Gualaceo',
    );
    expect(result?.level).toBe('MEDIO');
    expect(result?.unconfirmed).toContain('tipo');
  });

  it('otro cantón → sin match', () => {
    expect(
      match(
        sanAntonio,
        'Busca terrenos en Chordeleg junto a vía principal hasta $45mil',
      ),
    ).toBeNull();
  });

  it('sector pedido distinto → sin match; mismo sector → match', () => {
    expect(match(sanAntonio, 'Busca terreno en Pirincay')).toBeNull();
    expect(
      match(sanAntonio, 'Busca terreno en San Antonio de Gualaceo'),
    ).not.toBeNull();
  });
});
