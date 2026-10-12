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

/** Coincidencia tal como la devuelve la IA: por defecto tipo y ubicación coinciden y no pide nada más. */
const hit = (id: string, s: number, r: string, extra: Record<string, unknown> = {}) => ({
  id,
  t: 'SI',
  u: 'SI',
  am: null,
  a: 'ND',
  p: 'ND',
  b: null,
  s,
  r,
  ...extra,
});

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
          hit('a', 92, 'Terreno en Gualaceo'),
          hit('c', 70, 'Terreno grande', { u: 'ND', p: 'PARCIAL' }),
          hit('zzz', 99, 'Inventado'),
        ]),
      ),
    );

    const result = await service.recommend(property, clients);

    expect(create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      calls: 1,
      matches: [
        {
          client_id: 'a',
          interest_level: 'ALTO',
          reason: 'Coincide en: tipo, ubicación. Terreno en Gualaceo.',
          score: 92,
        },
        {
          client_id: 'c',
          interest_level: 'MEDIO',
          reason: 'Coincide en: tipo. Terreno grande. Algunas características no se pueden confirmar.',
          score: 70,
        },
      ],
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
        .mockResolvedValueOnce(reply([hit('a', 70, 'Parcial', { p: 'PARCIAL' })]))
        .mockResolvedValueOnce(reply([hit('c', 85, 'Terreno grande')])),
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
        .mockResolvedValueOnce(reply([hit('a', 90, 'Terreno en Gualaceo')]))
        .mockResolvedValueOnce(reply([hit('c', 75, 'Terreno grande', { u: 'ND' })])),
    );

    const result = await service.recommend(property, clients);

    expect(create).toHaveBeenCalledTimes(3);
    expect(JSON.parse(create.mock.calls[1][0].messages[1].content).clientes.map((c: { id: string }) => c.id)).toEqual(['a', 'b']);
    expect(JSON.parse(create.mock.calls[2][0].messages[1].content).clientes.map((c: { id: string }) => c.id)).toEqual(['c']);
    expect(result).toEqual({
      ok: true,
      calls: 3,
      matches: [
        { client_id: 'a', interest_level: 'ALTO', reason: 'Coincide en: tipo, ubicación. Terreno en Gualaceo.', score: 90 },
        { client_id: 'c', interest_level: 'MEDIO', reason: 'Coincide en: tipo. Terreno grande.', score: 75 },
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

  describe('reglas aplicadas en código', () => {
    // Terreno real de El Progreso, Gualaceo: 462 m², topografía mixta, $35.000.
    const elProgreso = { tipo: 'Terreno', ciudad: 'Gualaceo', topografia: 'Mixto', terreno_m2: 462, precio: 35000 };
    const run = async (
      clientText: string,
      extra: Record<string, unknown>,
      target: Record<string, unknown> = elProgreso,
      score = 90,
    ) => {
      const service = new PropertyRecommendationAiService(buildConfig({ minScore: 40 }));
      mockCreate(service, jest.fn().mockResolvedValue(reply([hit('x', score, 'Terreno en Gualaceo', extra)])));
      const result = await service.recommend(target, [{ id: 'x', i: clientText }]);
      return result.ok ? result.matches : [];
    };

    it('caso Elizabeth: pide 900 m² en adelante y el terreno tiene 462 m² → no se recomienda aunque el precio coincida', async () => {
      const text =
        'Busca invertir en un terreno plano puede ser de 900m2 en adelante y cuenta con un presupuesto de $35mil dólares';
      expect(await run(text, { am: 900, a: 'SI', p: 'SI', b: 35000 })).toEqual([]);
    });

    it('pide 2000 m² y el terreno tiene 400 m² → no se recomienda', async () => {
      const target = { ...elProgreso, terreno_m2: 400 };
      expect(await run('Busca terreno de 2000 m2 en Gualaceo para construcción', { am: 2000, a: 'SI' }, target)).toEqual([]);
    });

    it('área hasta 10 % por debajo del mínimo → BAJO con la tolerancia explicada', async () => {
      const target = { ...elProgreso, terreno_m2: 850 };
      const [match] = await run('Busca terreno de 900m2 en adelante en Gualaceo', { am: 900, a: 'SI' }, target);
      expect(match).toEqual({
        client_id: 'x',
        interest_level: 'BAJO',
        score: 59,
        reason:
          'Coincide en: tipo, ubicación. Terreno en Gualaceo. Área 850 m² está dentro de la tolerancia del 10 % del mínimo pedido (900 m²).',
      });
    });

    it('área que cumple el mínimo cuenta como coincidencia', async () => {
      const [match] = await run('Busca terreno desde 400 m2 en Gualaceo', { am: 400, a: 'SI' });
      expect(match.interest_level).toBe('ALTO');
      expect(match.reason).toMatch(/^Coincide en: tipo, ubicación, área\./);
    });

    it('presupuesto estricto: hasta $35.000 no admite un terreno de $36.000 ni de $40.000', async () => {
      const text = 'Busca terreno en Gualaceo hasta 35000';
      expect(await run(text, { b: 35000 }, { ...elProgreso, precio: 36000 })).toEqual([]);
      expect(await run(text, { b: 35000 }, { ...elProgreso, precio: 40000 })).toEqual([]);
    });

    it('precio dentro del presupuesto ($30.000 con hasta $35mil) → recomendado y coincide en precio', async () => {
      const [match] = await run(
        'Busca terreno plano en Gualaceo hasta 35mil',
        { b: 35000, p: 'SI' },
        { ...elProgreso, topografia: 'Plano', precio: 30000 },
      );
      expect(match.interest_level).toBe('ALTO');
      expect(match.reason).toBe('Coincide en: tipo, ubicación, características, precio. Terreno en Gualaceo.');
    });

    it('ubicación, tipo, área o preferencias en NO → no se recomienda (el precio no basta)', async () => {
      const text = 'Busca terreno en Chordeleg hasta 35mil';
      expect(await run(text, { u: 'NO', b: 35000 })).toEqual([]);
      expect(await run(text, { t: 'NO', b: 35000 })).toEqual([]);
      expect(await run(text, { a: 'NO', b: 35000 })).toEqual([]);
      expect(await run(text, { p: 'NO', b: 35000 })).toEqual([]);
    });

    it('sin evaluación válida de tipo o ubicación → no se recomienda', async () => {
      expect(await run('Busca terreno', { t: undefined })).toEqual([]);
      expect(await run('Busca terreno', { u: 'quizas' })).toEqual([]);
    });

    it('cifras que no están en el texto del cliente (área o presupuesto inventados) se ignoran', async () => {
      const [match] = await run('Busca terreno en Gualaceo', { am: 900, b: 20000 });
      expect(match.interest_level).toBe('ALTO');
      expect(match.reason).toBe('Coincide en: tipo, ubicación. Terreno en Gualaceo.');
    });

    it('cliente sin ubicación indicada → como máximo MEDIO', async () => {
      const [match] = await run('Busca terreno', { u: 'ND' }, elProgreso, 95);
      expect(match).toMatchObject({ interest_level: 'MEDIO', score: 79 });
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
