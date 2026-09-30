import { PropertyDescriptionAiService, PropertyDescriptionSource } from './property-description-ai.service';
import type { AiConfig } from './ai.config';

const buildConfig = (enabled = true): AiConfig => ({
  apiKey: 'test-key',
  model: 'test-model',
  temperature: 0,
  maxOutputTokens: 600,
  timeoutMs: 1000,
  maxRetries: 0,
  contactParser: { enabled, concurrency: 2, defaultCountry: 'EC' },
  propertyDescription: { enabled, temperature: 0.4, maxOutputTokens: 1500, autoGenerateOnSave: true },
  recommendation: { enabled, model: "test-model", temperature: 0, maxOutputTokens: 2000, batchSize: 120, minScore: 60, timeoutMs: 1000 },
});

const mockCompletions = (service: PropertyDescriptionAiService, ...contents: string[]) => {
  const create = jest.fn();
  for (const content of contents) create.mockResolvedValueOnce({ choices: [{ message: { content } }] });
  (service as unknown as { client: unknown }).client = { chat: { completions: { create } } };
  return create;
};

const property: PropertyDescriptionSource & Record<string, unknown> = {
  propertyType: 'Casa_y_terreno',
  cityName: 'Cuenca',
  referenceSector: 'Ricaurte',
  address: 'Vía a Ricaurte',
  zone: 'Urbanizacion',
  topography: 'Plano',
  landArea: '450.00',
  constructionArea: '180.50',
  constructionYears: 5,
  hasBasicServices: true,
  basicServices: ['Agua', 'Luz'],
  cityTime: 15,
  features: '3 dormitorios, 2 baños, patio amplio',
  observations: null,
  price: '125000',
  // Datos internos que NUNCA deben llegar a la IA
  minPrice: '110000',
  commission: '3',
  maxPrice: '130000',
  owner: 'Juan Pérez',
};

const output = (short: string, long: string) => JSON.stringify({ shortDescription: short, longDescription: long });

describe('PropertyDescriptionAiService', () => {
  it('no envía precio mínimo, comisión, precio máximo ni propietario a la IA', () => {
    const service = new PropertyDescriptionAiService(buildConfig());
    const data = service.buildPromptData(property);

    expect(JSON.stringify(data)).not.toMatch(/110000|130000|Juan|commission|minPrice|maxPrice/);
    expect(data).toMatchObject({
      tipo: 'Casa y terreno',
      zona: 'Urbanización',
      areaTerreno_m2: 450,
      areaConstruccion_m2: 180.5,
      precioVenta_usd: 125000,
      serviciosBasicos: ['Agua', 'Luz'],
      caracteristicas: '3 dormitorios, 2 baños, patio amplio',
    });
  });

  it('genera descripciones válidas', async () => {
    const service = new PropertyDescriptionAiService(buildConfig());
    const short =
      'Casa en venta en Ricaurte, Cuenca, con 450 m² de terreno y 180,50 m² de construcción. Precio: $125.000.';
    const long = 'Casa con 3 dormitorios y 2 baños en Ricaurte.\n\nA 15 minutos de la ciudad. Precio: $125.000.';
    mockCompletions(service, output(short, long));

    const result = await service.generate(property);

    expect(result.error).toBeNull();
    expect(result.descriptions).toEqual({ shortDescription: short, longDescription: long });
  });

  it('quita íconos y deja la descripción corta en un solo párrafo', async () => {
    const service = new PropertyDescriptionAiService(buildConfig());
    mockCompletions(
      service,
      output(
        '🏠 Casa en Ricaurte, Cuenca\n- 📐 450 m² de terreno\n💰 Precio: $125.000 ✅',
        '🏡 Casa amplia en Ricaurte.\n\nPrecio: $125.000.',
      ),
    );

    const result = await service.generate(property);

    expect(result.descriptions).toEqual({
      shortDescription: 'Casa en Ricaurte, Cuenca. 450 m² de terreno. Precio: $125.000.',
      longDescription: 'Casa amplia en Ricaurte.\n\nPrecio: $125.000.',
    });
  });

  it('quita llamados a la acción al final de la descripción corta', async () => {
    const service = new PropertyDescriptionAiService(buildConfig());
    mockCompletions(
      service,
      output('Casa en Ricaurte, Cuenca. Precio: $125.000. ¡Agenda tu visita! Contáctanos para más información.', 'Casa.'),
    );

    const result = await service.generate(property);

    expect(result.descriptions?.shortDescription).toBe('Casa en Ricaurte, Cuenca. Precio: $125.000.');
  });

  it('reintenta y luego rechaza si la IA inventa cifras (ej. el precio mínimo)', async () => {
    const service = new PropertyDescriptionAiService(buildConfig());
    const bad = output('Casa en Cuenca, $110.000', 'Casa con 4 baños.');
    const create = mockCompletions(service, bad, bad);

    const result = await service.generate(property);

    expect(create).toHaveBeenCalledTimes(2);
    expect(result.descriptions).toBeNull();
    expect(result.error).toContain('no está en los datos');
  });

  it('usa el reintento si la segunda respuesta es válida', async () => {
    const service = new PropertyDescriptionAiService(buildConfig());
    mockCompletions(
      service,
      output('Casa con 7 baños', 'x'),
      output('Casa en Cuenca, $125.000', 'Tres dormitorios y dos baños.'),
    );

    const result = await service.generate(property);

    expect(result.descriptions?.shortDescription).toBe('Casa en Cuenca, $125.000.');
  });

  it('acepta números escritos en letras en las características', () => {
    const service = new PropertyDescriptionAiService(buildConfig());
    const data = service.buildPromptData({ ...property, features: 'tres dormitorios y dos plantas' });

    expect(service.validate({ shortDescription: '3 dormitorios, 2 plantas', longDescription: 'ok' }, data)).not.toBeNull();
  });

  it('informa cuando OpenAI no tiene crédito y pausa la IA', async () => {
    const service = new PropertyDescriptionAiService(buildConfig());
    const create = jest.fn().mockRejectedValue(
      Object.assign(new Error('429'), { status: 429, code: 'credit_balance_exhausted', type: 'insufficient_quota' }),
    );
    (service as unknown as { client: unknown }).client = { chat: { completions: { create } } };

    const result = await service.generate(property);

    expect(result.error).toContain('no tiene crédito');
    expect(service.isEnabled()).toBe(false);
  });

  it('no llama a la IA si está deshabilitada', async () => {
    const service = new PropertyDescriptionAiService(buildConfig(false));
    const create = mockCompletions(service, output('a', 'b'));

    const result = await service.generate(property);

    expect(result.descriptions).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });
});
