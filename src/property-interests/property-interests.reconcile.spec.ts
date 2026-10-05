import { FeedbackRating, InterestLevel, InterestSource } from '@prisma/client';
import { PropertyInterestsService } from './property-interests.service';

const C1 = '11111111-1111-1111-1111-111111111111'; // IA, se mantiene en la lista
const C2 = '22222222-2222-2222-2222-222222222222'; // IA, ya no viene → se borra con replaceAi
const C3 = '33333333-3333-3333-3333-333333333333'; // manual, no viene → nunca se borra
const C4 = '44444444-4444-4444-4444-444444444444'; // manual, viene de la IA → no se modifica
const C5 = '55555555-5555-5555-5555-555555555555'; // nuevo → se crea como IA

const existing = [
  {
    id: 'i1',
    clientId: C1,
    interestLevel: InterestLevel.Alto,
    interestDate: new Date(),
    notes: 'viejo',
    source: InterestSource.ia,
  },
  {
    id: 'i2',
    clientId: C2,
    interestLevel: InterestLevel.Alto,
    interestDate: new Date(),
    notes: 'x',
    source: InterestSource.ia,
  },
  {
    id: 'i3',
    clientId: C3,
    interestLevel: InterestLevel.Medio,
    interestDate: new Date(),
    notes: 'a mano',
    source: InterestSource.manual,
  },
  {
    id: 'i4',
    clientId: C4,
    interestLevel: InterestLevel.Alto,
    interestDate: new Date(),
    notes: 'whatsapp',
    source: InterestSource.manual,
  },
];

const setup = (feedback: Array<{ clientId: string; rating: FeedbackRating }> = []) => {
  const tx = {
    propertyInterest: {
      create: jest.fn().mockResolvedValue({ id: 'new' }),
      update: jest.fn().mockResolvedValue({ id: 'upd' }),
      delete: jest.fn().mockResolvedValue({ id: 'del' }),
    },
  };
  const prisma = {
    property: {
      findFirst: jest.fn().mockResolvedValue({ id: 'p1', code: '01' }),
    },
    client: {
      findMany: jest
        .fn()
        .mockImplementation(({ where }) =>
          Promise.resolve((where.id.in as string[]).map((id) => ({ id }))),
        ),
    },
    propertyInterest: {
      findMany: jest.fn().mockResolvedValueOnce(existing).mockResolvedValue([]),
    },
    recommendationFeedback: { findMany: jest.fn().mockResolvedValue(feedback) },
    $transaction: jest
      .fn()
      .mockImplementation((fn: (t: typeof tx) => Promise<void>) => fn(tx)),
  };
  const service = new PropertyInterestsService(prisma as never);
  return { service, tx };
};

const recommendations = [
  {
    client_id: C1,
    interest_level: 'BAJO',
    reason: 'Precio supera su presupuesto',
  },
  { client_id: C4, interest_level: 'BAJO', reason: 'IA quiere cambiarlo' },
  { client_id: C5, interest_level: 'MEDIO', reason: 'Nuevo' },
];

describe('PropertyInterestsService.reconcileRecommendations', () => {
  it('replaceAi: borra solo los de la IA que no vienen; los manuales quedan intactos', async () => {
    const { service, tx } = setup();

    const { summary, clientChanges } = await service.reconcileRecommendations(
      'p1',
      recommendations,
      {
        mode: 'replaceAi',
      },
    );

    expect(tx.propertyInterest.delete).toHaveBeenCalledTimes(1);
    expect(tx.propertyInterest.delete).toHaveBeenCalledWith({
      where: { id: 'i2' },
    });
    // C1 (IA) se actualiza; C4 (manual) no se toca aunque la IA lo recomiende.
    expect(tx.propertyInterest.update).toHaveBeenCalledTimes(1);
    expect(tx.propertyInterest.update.mock.calls[0][0].where).toEqual({
      id: 'i1',
    });
    // C5 se crea marcado como IA.
    expect(tx.propertyInterest.create.mock.calls[0][0].data.source).toBe(
      InterestSource.ia,
    );
    expect(summary).toMatchObject({ created: 1, updated: 1, deleted: 1 });
    expect(clientChanges.keptManual).toEqual([C4]);
  });

  it('merge: nunca borra', async () => {
    const { service, tx } = setup();

    await service.reconcileRecommendations('p1', recommendations, {
      mode: 'merge',
    });

    expect(tx.propertyInterest.delete).not.toHaveBeenCalled();
  });

  it('replaceAi con lista vacía quita todas las recomendaciones IA y conserva las manuales', async () => {
    const { service, tx } = setup();

    await service.reconcileRecommendations('p1', [], { mode: 'replaceAi' });

    const deletedIds = tx.propertyInterest.delete.mock.calls.map(
      (c) => c[0].where.id,
    );
    expect(deletedIds).toEqual(['i1', 'i2']);
  });

  it('no recrea clientes con dislike activo y no borra los que tienen like', async () => {
    const { service, tx } = setup([
      { clientId: C5, rating: FeedbackRating.dislike },
      { clientId: C2, rating: FeedbackRating.like },
    ]);

    const { clientChanges } = await service.reconcileRecommendations('p1', recommendations, {
      mode: 'replaceAi',
    });

    // C5 está bloqueado por dislike: no se crea.
    expect(tx.propertyInterest.create).not.toHaveBeenCalled();
    expect(clientChanges.skippedByFeedback).toEqual([C5]);
    // C2 (IA) no viene en la lista pero tiene like: se conserva.
    expect(tx.propertyInterest.delete).not.toHaveBeenCalled();
  });
});
