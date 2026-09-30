import {
  buildRecommendationClient,
  buildRecommendationProperty,
  computeRecommendationHash,
  hasRecommendationText,
} from './recommendation-payload';

const property = {
  propertyType: 'Casa_y_terreno',
  city: { name: 'Gualaceo' },
  referenceSector: 'Chilcapamba',
  address: 'a 5 min de Nallig',
  zone: 'Rural',
  topography: 'Mixto',
  landArea: '11500',
  constructionArea: '0',
  constructionYears: 0,
  hasBasicServices: true,
  basicServices: ['Agua', 'Luz'],
  cityTime: 8,
  features: 'Terreno amplio  con vista',
  observations: '',
  price: '78000',
  // Datos que no deben llegar a la IA ni afectar la huella
  minPrice: '73000',
  commission: '3',
  owner: 'Paul',
  files: [{ file: { path: 'https://s3/firmada?X-Amz-Date=1' } }],
  publicShortDescription: 'x',
  updatedAt: new Date(),
};

describe('recommendation-payload', () => {
  it('construye la propiedad compacta sin datos internos ni vacíos', () => {
    const compact = buildRecommendationProperty(property);

    expect(compact).toEqual({
      tipo: 'Casa y terreno',
      ciudad: 'Gualaceo',
      sector: 'Chilcapamba',
      direccion: 'a 5 min de Nallig',
      zona: 'Rural',
      topografia: 'Mixto',
      terreno_m2: 11500,
      servicios: ['Agua', 'Luz'],
      min_ciudad: 8,
      caracteristicas: 'Terreno amplio con vista',
      precio: 78000,
    });
    expect(JSON.stringify(compact)).not.toMatch(/73000|Paul|s3|commission/);
  });

  it('la huella es estable y no depende del orden de las claves', () => {
    const a = computeRecommendationHash({ tipo: 'Casa', precio: 1, servicios: ['Agua'] });
    const b = computeRecommendationHash({ servicios: ['Agua'], precio: 1, tipo: 'Casa' });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('la huella no cambia con fotos, precio mínimo, comisión ni descripciones', () => {
    const base = computeRecommendationHash(buildRecommendationProperty(property));
    const other = computeRecommendationHash(
      buildRecommendationProperty({
        ...property,
        minPrice: '1',
        commission: '9',
        files: [],
        publicShortDescription: 'otra',
      } as typeof property),
    );
    expect(other).toBe(base);
  });

  it('la huella cambia si cambian las características o el precio', () => {
    const base = computeRecommendationHash(buildRecommendationProperty(property));
    expect(computeRecommendationHash(buildRecommendationProperty({ ...property, features: 'Otra cosa' }))).not.toBe(base);
    expect(computeRecommendationHash(buildRecommendationProperty({ ...property, price: '80000' }))).not.toBe(base);
  });

  it('el cliente se envía sin nombre ni teléfono y con textos recortados', () => {
    const payload = buildRecommendationClient({
      id: 'c1',
      interestDescription: 'Busca terreno '.repeat(50),
      notes: '  ',
    });
    expect(Object.keys(payload)).toEqual(['id', 'i']);
    expect(payload.i!.length).toBeLessThanOrEqual(300);
  });

  it('detecta clientes sin texto útil', () => {
    expect(hasRecommendationText({ id: 'x', interestDescription: '  ', notes: null })).toBe(false);
    expect(hasRecommendationText({ id: 'x', interestDescription: null, notes: 'llamar' })).toBe(true);
  });
});
