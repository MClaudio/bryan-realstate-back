/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- argumentos de mocks de Prisma */
import { Prisma } from '@prisma/client';
import {
  MatchEngineService,
  propertyMatchHash,
  toPropertyMatchData,
} from './match-engine.service';
import { MATCH_RULES_VERSION } from './match-rules';

const propertyRow = {
  id: 'p1',
  status: 'Nuevo',
  deletedAt: null,
  propertyType: 'Terreno',
  referenceSector: 'San Antonio',
  address: 'Comunidad San Antonio',
  landArea: new Prisma.Decimal(862),
  constructionArea: new Prisma.Decimal(0),
  topography: 'Plano',
  zone: 'Urbano',
  basicServices: ['Agua', 'Luz', 'Agua de Riego'],
  hasBasicServices: true,
  cityTime: 12,
  price: new Prisma.Decimal(55000),
  features: 'Para construir tu quinta vacacional',
  observations: null,
  recommendationHash: null as string | null,
  advisorId: 'adv',
  code: 'GUA-01',
  city: { name: 'Gualaceo' },
};

const criteriaRow = (
  clientId: string,
  overrides: Record<string, unknown> = {},
) => ({
  clientId,
  intent: 'COMPRA',
  acceptedTypes: ['Terreno', 'Lote', 'Finca'],
  genericType: false,
  acceptedCities: ['Gualaceo'],
  excludedCities: [],
  acceptedSectors: [],
  maxMinutesCenter: null,
  nearCenter: false,
  minLandM2: null,
  maxLandM2: null,
  minConstructionM2: null,
  minBudgetUsd: null,
  maxBudgetUsd: new Prisma.Decimal(60000),
  topographies: ['Plano'],
  zones: [],
  requiredServices: [],
  uses: [],
  wantedFeatures: [],
  criteriaHash: `h-${clientId}`,
  ...overrides,
});

const setup = (
  candidates: unknown[],
  existing: unknown[] = [],
  row = propertyRow,
) => {
  const tx = {
    propertyMatch: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const prisma = {
    property: {
      findUnique: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue({}),
    },
    clientCriteria: {
      findMany: jest.fn().mockResolvedValue(candidates),
      count: jest.fn().mockResolvedValue(candidates.length),
    },
    propertyMatch: {
      findMany: jest.fn().mockResolvedValue(existing),
      deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
    },
    $transaction: jest
      .fn()
      .mockImplementation((fn: (t: typeof tx) => Promise<void>) => fn(tx)),
  };
  return { engine: new MatchEngineService(prisma as never), prisma, tx };
};

describe('MatchEngineService.recomputeProperty', () => {
  it('crea los que califican, borra los que dejaron de calificar y guarda la huella', async () => {
    const { engine, prisma, tx } = setup(
      [
        criteriaRow('ok'),
        criteriaRow('mixto', { topographies: ['Pendiente'] }),
      ],
      [
        {
          propertyId: 'p1',
          clientId: 'viejo',
          level: 'ALTO',
          score: 90,
          explanation: 'x',
          propertyVersion: 'v',
          clientVersion: 'c',
          rulesVersion: 'r',
        },
      ],
    );

    const summary = await engine.recomputeProperty('p1');

    expect(summary).toMatchObject({
      created: 1,
      updated: 0,
      deleted: 1,
      total: 1,
      newAlto: ['ok'],
    });
    expect(tx.propertyMatch.createMany.mock.calls[0][0].data[0]).toMatchObject({
      propertyId: 'p1',
      clientId: 'ok',
      level: 'ALTO',
      rulesVersion: MATCH_RULES_VERSION,
    });
    expect(tx.propertyMatch.deleteMany.mock.calls[0][0].where.OR).toEqual([
      { propertyId: 'p1', clientId: 'viejo' },
    ]);
    expect(
      prisma.property.update.mock.calls[0][0].data.recommendationHash,
    ).toBe(propertyMatchHash(toPropertyMatchData(propertyRow as never)));
  });

  it('idempotente: con los mismos datos no escribe nada', async () => {
    const first = setup([criteriaRow('ok')]);
    await first.engine.recomputeProperty('p1');
    const created = first.tx.propertyMatch.createMany.mock.calls[0][0].data[0];

    const { engine, tx } = setup([criteriaRow('ok')], [created]);
    const summary = await engine.recomputeProperty('p1');

    expect(summary).toMatchObject({
      created: 0,
      updated: 0,
      deleted: 0,
      total: 1,
    });
    expect(tx.propertyMatch.createMany).not.toHaveBeenCalled();
    expect(tx.propertyMatch.update).not.toHaveBeenCalled();
  });

  it('propiedad que salió de Nuevo: se quitan sus recomendaciones', async () => {
    const { engine, prisma } = setup([], [], {
      ...propertyRow,
      status: 'Vendido',
    });
    expect(await engine.recomputeProperty('p1')).toMatchObject({
      deleted: 3,
      total: 0,
    });
    expect(prisma.propertyMatch.deleteMany).toHaveBeenCalledWith({
      where: { propertyId: 'p1' },
    });
  });

  it('onlyIfChanged: no recalcula si la huella no cambió', async () => {
    const hash = propertyMatchHash(toPropertyMatchData(propertyRow as never));
    const { engine, prisma } = setup([criteriaRow('ok')], [], {
      ...propertyRow,
      recommendationHash: hash,
    });
    expect(
      await engine.recomputeProperty('p1', { onlyIfChanged: true }),
    ).toMatchObject({ total: 0, created: 0 });
    expect(prisma.clientCriteria.findMany).not.toHaveBeenCalled();
  });

  it('el filtro SQL exige tipo, ciudad (o sin ciudad), presupuesto y área compatibles', async () => {
    const { engine, prisma } = setup([]);
    await engine.recomputeProperty('p1');
    const where = prisma.clientCriteria.findMany.mock.calls[0][0].where;
    expect(where.intent).toBe('COMPRA');
    expect(where.AND).toEqual(
      expect.arrayContaining([
        { OR: [{ acceptedTypes: { has: 'Terreno' } }, { genericType: true }] },
        {
          OR: [
            { acceptedCities: { isEmpty: true } },
            { acceptedCities: { has: 'Gualaceo' } },
          ],
        },
        { NOT: { excludedCities: { has: 'Gualaceo' } } },
        { OR: [{ maxBudgetUsd: null }, { maxBudgetUsd: { gte: 55000 } }] },
      ]),
    );
  });
});
