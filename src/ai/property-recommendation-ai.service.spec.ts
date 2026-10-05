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
          { id: 'c', l: 'BAJO', s: 45, r: 'Afinidad baja' },
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

  describe('regla de presupuesto (aplicada en código)', () => {
    const guaimincay = { tipo: 'Terreno', ciudad: 'Gualaceo', terreno_m2: 502, precio: 50000 };
    const run = async (budgetText: string, aiBudget: number | null, level = 'ALTO', score = 90) => {
      const service = new PropertyRecommendationAiService(buildConfig({ minScore: 40 }));
      mockCreate(
        service,
        jest.fn().mockResolvedValue(
          reply([{ id: 'x', l: level, s: score, b: aiBudget, r: 'Terreno en Gualaceo, 502m2, zona urbana.' }]),
        ),
      );
      const result = await service.recommend(guaimincay, [{ id: 'x', i: budgetText }]);
      return result.ok ? result.matches : [];
    };

    it('caso Guaimincay: $50.000 frente a hasta $25.000 (el doble) → BAJO con motivo', async () => {
      const [match] = await run('Busca terrenos en Gualaceo hasta 25mil dólares', 25000);
      expect(match).toEqual({
        client_id: 'x',
        interest_level: 'BAJO',
        score: 59,
        reason: 'Terreno en Gualaceo, 502m2, zona urbana. Precio $50.000 supera su presupuesto de $25.000.',
      });
    });

    it('más del doble del presupuesto → no se recomienda', async () => {
      expect(await run('Busca terreno hasta $20mil', 20000)).toEqual([]);
    });

    it('entre 10 % y 30 % por encima → como máximo MEDIO', async () => {
      const [match] = await run('Busca terreno con presupuesto de 42mil', 42000);
      expect(match.interest_level).toBe('MEDIO');
      expect(match.score).toBe(79);
      expect(match.reason).toContain('supera su presupuesto de $42.000');
    });

    it('hasta 10 % por encima → sin penalización', async () => {
      const [match] = await run('Busca terreno de unos 46mil dólares', 46000);
      expect(match.interest_level).toBe('ALTO');
      expect(match.reason).not.toContain('supera');
    });

    it('si el presupuesto no está en el texto del cliente, se ignora', async () => {
      const [match] = await run('Busca terreno en Gualaceo', 25000);
      expect(match.interest_level).toBe('ALTO');
    });

    it('un nivel que ya era BAJO no se sube y el puntaje queda en su banda', async () => {
      const [match] = await run('Busca terreno hasta 60mil', 60000, 'BAJO', 95);
      expect(match).toMatchObject({ interest_level: 'BAJO', score: 59 });
    });
  });

  it('envía el aprendizaje entre el system prompt y los datos; sin ejemplos no lo envía', async () => {
    const service = new PropertyRecommendationAiService(buildConfig());
    const create = mockCreate(service, jest.fn().mockResolvedValue(reply([])));
    const learning = {
      incorrectas: [{ propiedad: 'Terreno, Gualaceo, $50.000', busca: 'hasta 25mil', ia: 'ALTO: x', motivo: 'presupuesto' }],
      correctas: [],
    };

    await service.recommend(property, clients, learning);
    const withLearning = create.mock.calls[0][0].messages;
    expect(withLearning).toHaveLength(3);
    expect(withLearning[0].role).toBe('system');
    expect(JSON.parse(withLearning[1].content)).toEqual({ aprendizaje: learning });
    expect(JSON.parse(withLearning[2].content).clientes).toBeDefined();

    await service.recommend(property, clients, { incorrectas: [], correctas: [] });
    expect(create.mock.calls[1][0].messages).toHaveLength(2);
  });

  it('respeta la desactivación', async () => {
    const service = new PropertyRecommendationAiService(buildConfig({ enabled: false }));
    const create = mockCreate(service, jest.fn());

    expect(await service.recommend(property, clients)).toMatchObject({ ok: false, reason: 'disabled' });
    expect(create).not.toHaveBeenCalled();
  });
});
