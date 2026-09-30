import { RecommendationRunnerService } from './recommendation-runner.service';
import { buildRecommendationProperty, computeRecommendationHash } from './recommendation-payload';

const baseProperty = {
  id: 'p1',
  code: 'gualchilca-002',
  propertyType: 'Terreno',
  city: { name: 'Gualaceo' },
  referenceSector: 'Chilcapamba',
  landArea: '11500',
  price: '78000',
  features: 'Terreno amplio',
  advisor: { id: 'adv' },
  recommendationHash: null as string | null,
  recommendationRunAt: null as Date | null,
};

const client = (id: string, interest: string) => ({
  id,
  firstName: 'Cliente',
  lastName: id.toUpperCase(),
  interestDescription: interest,
  notes: null,
});

const setup = (property: typeof baseProperty, clients: ReturnType<typeof client>[]) => {
  const prisma = {
    property: {
      findFirst: jest.fn().mockResolvedValue(property),
      update: jest.fn().mockResolvedValue({ id: property.id }),
    },
    client: { findMany: jest.fn().mockResolvedValue(clients) },
  };
  const recommender = {
    recommendCandidates: jest.fn().mockResolvedValue({
      ok: true,
      calls: 1,
      candidates: clients.slice(0, 1).map((c) => ({
        client_id: c.id,
        name: '',
        interest_level: 'ALTO',
        reason: 'Coincide',
        score: 90,
      })),
    }),
  };
  const interests = {
    reconcileRecommendations: jest
      .fn()
      .mockResolvedValue({ summary: { created: 1, updated: 0, deleted: 0, discarded: 0 } }),
  };
  const runner = new RecommendationRunnerService(prisma as never, recommender as never, interests as never);
  return { runner, prisma, recommender, interests };
};

const currentHash = computeRecommendationHash(buildRecommendationProperty(baseProperty));

describe('RecommendationRunnerService', () => {
  it('modo full cuando la propiedad nunca se evaluó: todos los clientes, guarda la huella', async () => {
    const { runner, prisma, recommender, interests } = setup(baseProperty, [client('a', 'Busca terreno'), client('b', 'Busca casa')]);

    const result = await runner.run('p1', { trigger: 'update' });

    expect(result.mode).toBe('full');
    expect(result.status).toBe('applied');
    const where = prisma.client.findMany.mock.calls[0][0].where;
    expect(where.interestUpdatedAt).toBeUndefined();
    expect(where.interests).toEqual({ none: { propertyId: 'p1' } });
    expect(recommender.recommendCandidates.mock.calls[0][0].clients).toEqual([
      { id: 'a', i: 'Busca terreno' },
      { id: 'b', i: 'Busca casa' },
    ]);
    // Nombre completado desde la BD; nunca se borran interesados.
    expect(result.candidates[0].name).toBe('Cliente A');
    expect(interests.reconcileRecommendations.mock.calls[0][2]).toEqual({ removeMissing: false });
    expect(prisma.property.update.mock.calls[0][0].data.recommendationHash).toBe(currentHash);
  });

  it('se omite sin llamar a la IA si la propiedad no cambió y no hay clientes nuevos', async () => {
    const runAt = new Date('2026-09-30T10:00:00Z');
    const { runner, prisma, recommender } = setup(
      { ...baseProperty, recommendationHash: currentHash, recommendationRunAt: runAt },
      [],
    );

    const result = await runner.run('p1', { trigger: 'scheduler' });

    expect(result.status).toBe('skipped');
    expect(prisma.client.findMany.mock.calls[0][0].where.interestUpdatedAt).toEqual({ gt: runAt });
    expect(recommender.recommendCandidates).not.toHaveBeenCalled();
    expect(prisma.property.update).not.toHaveBeenCalled();
  });

  it('modo delta: propiedad igual, solo clientes con intereses nuevos', async () => {
    const runAt = new Date('2026-09-30T10:00:00Z');
    const { runner, recommender } = setup(
      { ...baseProperty, recommendationHash: currentHash, recommendationRunAt: runAt },
      [client('n', 'Busca terreno en Gualaceo')],
    );

    const result = await runner.run('p1', { trigger: 'scheduler' });

    expect(result.mode).toBe('delta');
    expect(recommender.recommendCandidates.mock.calls[0][0].clients).toEqual([{ id: 'n', i: 'Busca terreno en Gualaceo' }]);
  });

  it('el botón manual fuerza modo full aunque nada cambió', async () => {
    const { runner, prisma } = setup(
      { ...baseProperty, recommendationHash: currentHash, recommendationRunAt: new Date() },
      [client('a', 'Busca terreno')],
    );

    const result = await runner.run('p1', { trigger: 'manual' });

    expect(result.mode).toBe('full');
    expect(prisma.client.findMany.mock.calls[0][0].where.interestUpdatedAt).toBeUndefined();
  });

  it('si la IA falla no guarda la huella (se reintenta en la próxima ocasión)', async () => {
    const { runner, prisma, recommender, interests } = setup(baseProperty, [client('a', 'Busca terreno')]);
    recommender.recommendCandidates.mockResolvedValue({ ok: false, reason: 'no_credit', detail: '429' });

    const result = await runner.run('p1', { trigger: 'update' });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('crédito');
    expect(interests.reconcileRecommendations).not.toHaveBeenCalled();
    expect(prisma.property.update).not.toHaveBeenCalled();
  });

  it('descarta clientes sin texto útil antes de llamar a la IA', async () => {
    const { runner, recommender } = setup(baseProperty, [client('a', '   '), client('b', 'Busca casa')]);

    await runner.run('p1', { trigger: 'update' });

    expect(recommender.recommendCandidates.mock.calls[0][0].clients).toEqual([{ id: 'b', i: 'Busca casa' }]);
  });
});
