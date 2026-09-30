import { PropertyRecommendationAiService } from './property-recommendation-ai.service';
import type { AiConfig } from './ai.config';

const buildConfig = (overrides: Partial<AiConfig['recommendation']> = {}): AiConfig => ({
  apiKey: 'test-key',
  model: 'test-model',
  temperature: 0,
  maxOutputTokens: 600,
  timeoutMs: 1000,
  maxRetries: 0,
  contactParser: { enabled: true, concurrency: 2, defaultCountry: 'EC' },
  propertyDescription: { enabled: true, temperature: 0.4, maxOutputTokens: 1500, autoGenerateOnSave: true },
  recommendation: {
    enabled: true,
    model: 'test-model',
    temperature: 0,
    maxOutputTokens: 2000,
    batchSize: 120,
    minScore: 60,
    timeoutMs: 1000,
    ...overrides,
  },
});

const mockCreate = (service: PropertyRecommendationAiService, create: jest.Mock) => {
  (service as unknown as { client: unknown }).client = { chat: { completions: { create } } };
  return create;
};

const reply = (c: unknown[]) => ({ choices: [{ message: { content: JSON.stringify({ c }) } }] });

const property = { tipo: 'Terreno', ciudad: 'Gualaceo', precio: 78000 };
const clients = [
  { id: 'a', i: 'Busca terreno en Gualaceo' },
  { id: 'b', i: 'Busca casa en Cuenca' },
  { id: 'c', i: 'Busca terreno grande' },
];

describe('PropertyRecommendationAiService', () => {
  it('hace una sola llamada, filtra ids inventados y puntajes bajos', async () => {
    const service = new PropertyRecommendationAiService(buildConfig());
    const create = mockCreate(
      service,
      jest.fn().mockResolvedValue(
        reply([
          { id: 'a', l: 'ALTO', s: 92, r: 'Terreno en Gualaceo' },
          { id: 'c', l: 'MEDIO', s: 40, r: 'Afinidad baja' },
          { id: 'zzz', l: 'ALTO', s: 99, r: 'Inventado' },
        ]),
      ),
    );

    const result = await service.recommend(property, clients);

    expect(create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      calls: 1,
      matches: [{ client_id: 'a', interest_level: 'ALTO', reason: 'Terreno en Gualaceo', score: 92 }],
    });
    // Los clientes se envían compactos, sin nombre ni teléfono.
    const userMessage = create.mock.calls[0][0].messages[1].content as string;
    expect(JSON.parse(userMessage)).toEqual({ propiedad: property, clientes: clients });
  });

  it('divide en lotes y se queda con el mayor puntaje por cliente', async () => {
    const service = new PropertyRecommendationAiService(buildConfig({ batchSize: 2 }));
    const create = mockCreate(
      service,
      jest
        .fn()
        .mockResolvedValueOnce(reply([{ id: 'a', l: 'MEDIO', s: 70, r: 'Parcial' }]))
        .mockResolvedValueOnce(reply([{ id: 'c', l: 'ALTO', s: 85, r: 'Terreno grande' }])),
    );

    const result = await service.recommend(property, clients);

    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0].messages[1].content).toContain('"id":"c"');
    expect(result.ok && result.matches.map((m) => m.client_id)).toEqual(['c', 'a']);
  });

  it('no llama a la IA si no hay clientes', async () => {
    const service = new PropertyRecommendationAiService(buildConfig());
    const create = mockCreate(service, jest.fn());

    expect(await service.recommend(property, [])).toEqual({ ok: true, matches: [], calls: 0 });
    expect(create).not.toHaveBeenCalled();
  });

  it('falla (sin resultados parciales) si la respuesta no tiene el formato', async () => {
    const service = new PropertyRecommendationAiService(buildConfig());
    mockCreate(service, jest.fn().mockResolvedValue({ choices: [{ message: { content: '{"otra":1}' } }] }));

    const result = await service.recommend(property, clients);

    expect(result).toMatchObject({ ok: false, reason: 'unparseable' });
  });

  it('si la respuesta se corta por tokens, divide el lote en dos y reintenta', async () => {
    const service = new PropertyRecommendationAiService(buildConfig());
    const truncated = { choices: [{ finish_reason: 'length', message: { content: '{"c":[{"id":"a","l":"AL' } }] };
    const create = mockCreate(
      service,
      jest
        .fn()
        .mockResolvedValueOnce(truncated)
        .mockResolvedValueOnce(reply([{ id: 'a', l: 'ALTO', s: 90, r: 'Terreno en Gualaceo' }]))
        .mockResolvedValueOnce(reply([{ id: 'c', l: 'MEDIO', s: 75, r: 'Terreno grande' }])),
    );

    const result = await service.recommend(property, clients);

    expect(create).toHaveBeenCalledTimes(3);
    expect(JSON.parse(create.mock.calls[1][0].messages[1].content).clientes.map((c: { id: string }) => c.id)).toEqual(['a', 'b']);
    expect(JSON.parse(create.mock.calls[2][0].messages[1].content).clientes.map((c: { id: string }) => c.id)).toEqual(['c']);
    expect(result).toEqual({
      ok: true,
      calls: 3,
      matches: [
        { client_id: 'a', interest_level: 'ALTO', reason: 'Terreno en Gualaceo', score: 90 },
        { client_id: 'c', interest_level: 'MEDIO', reason: 'Terreno grande', score: 75 },
      ],
    });
  });

  it('falla indicando el motivo si un lote de un solo cliente sigue truncado', async () => {
    const service = new PropertyRecommendationAiService(buildConfig());
    mockCreate(
      service,
      jest.fn().mockResolvedValue({ choices: [{ finish_reason: 'length', message: { content: '{"c":[' } }] }),
    );

    const result = await service.recommend(property, [clients[0]]);

    expect(result).toMatchObject({ ok: false, reason: 'unparseable' });
    expect(!result.ok && result.detail).toContain('finish_reason=length');
  });

  it('detecta falta de crédito y pausa la IA', async () => {
    const service = new PropertyRecommendationAiService(buildConfig());
    const create = mockCreate(
      service,
      jest.fn().mockRejectedValue(
        Object.assign(new Error('429'), { status: 429, code: 'credit_balance_exhausted', type: 'insufficient_quota' }),
      ),
    );

    expect(await service.recommend(property, clients)).toMatchObject({ ok: false, reason: 'no_credit' });
    expect(await service.recommend(property, clients)).toMatchObject({ ok: false, reason: 'no_credit' });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('respeta la desactivación', async () => {
    const service = new PropertyRecommendationAiService(buildConfig({ enabled: false }));
    const create = mockCreate(service, jest.fn());

    expect(await service.recommend(property, clients)).toMatchObject({ ok: false, reason: 'disabled' });
    expect(create).not.toHaveBeenCalled();
  });
});
