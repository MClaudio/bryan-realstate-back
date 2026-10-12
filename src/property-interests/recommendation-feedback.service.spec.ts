import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FeedbackRating, FeedbackReason, InterestLevel } from '@prisma/client';
import { RecommendationFeedbackService } from './recommendation-feedback.service';

const interest = {
  id: 'i1',
  propertyId: 'p1',
  clientId: 'c1',
  interestLevel: InterestLevel.Alto,
  notes: 'Terreno en Gualaceo, 502m2, zona urbana.',
  client: { interestDescription: 'Busca terrenos en Gualaceo hasta 25mil dólares', notes: null },
  property: {
    propertyType: 'Terreno',
    city: { name: 'Gualaceo' },
    referenceSector: 'Nieves',
    landArea: '502',
    price: '50000',
    minPrice: '45000',
    owner: 'Clementina',
  },
};

const setup = () => {
  const tx = {
    recommendationFeedback: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'f1', ...data })),
    },
    propertyInterest: { delete: jest.fn().mockResolvedValue({ id: 'i1' }) },
  };
  const prisma = {
    propertyInterest: { findUnique: jest.fn().mockResolvedValue(interest) },
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1' }) },
    recommendationFeedback: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn().mockImplementation((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  return { service: new RecommendationFeedbackService(prisma as never), prisma, tx };
};

describe('RecommendationFeedbackService', () => {
  it('dislike: guarda el snapshot, quita al interesado y marca la calificación anterior como eliminada', async () => {
    const { service, tx } = setup();

    const result = await service.rate(
      'i1',
      { rating: FeedbackRating.dislike, reason: FeedbackReason.presupuesto, comment: ' Doble de su presupuesto ' },
      'u1',
    );

    expect(tx.recommendationFeedback.updateMany).toHaveBeenCalledWith({
      where: { propertyId: 'p1', clientId: 'c1', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
    const data = tx.recommendationFeedback.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      rating: 'dislike',
      reason: 'presupuesto',
      comment: 'Doble de su presupuesto',
      userId: 'u1',
      interestLevel: 'Alto',
      aiReason: interest.notes,
      clientInterest: 'Busca terrenos en Gualaceo hasta 25mil dólares',
    });
    // El snapshot de la propiedad no incluye datos internos.
    expect(data.propertySummary).toMatchObject({ tipo: 'Terreno', ciudad: 'Gualaceo', precio: 50000 });
    expect(JSON.stringify(data.propertySummary)).not.toMatch(/45000|Clementina/);
    expect(tx.propertyInterest.delete).toHaveBeenCalledWith({ where: { id: 'i1' } });
    expect(result.interestRemoved).toBe(true);
  });

  it('dislike sin motivo es rechazado', async () => {
    const { service } = setup();
    await expect(service.rate('i1', { rating: FeedbackRating.dislike }, 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('like: mantiene al interesado y no guarda motivo', async () => {
    const { service, tx } = setup();

    const result = await service.rate('i1', { rating: FeedbackRating.like, reason: FeedbackReason.tipo }, 'u1');

    expect(tx.propertyInterest.delete).not.toHaveBeenCalled();
    expect(tx.recommendationFeedback.create.mock.calls[0][0].data.reason).toBeNull();
    expect(result.interestRemoved).toBe(false);
  });

  it('si el autor no es un usuario del sistema, no se registra userId', async () => {
    const { service, prisma, tx } = setup();
    prisma.user.findUnique.mockResolvedValue(null);

    await service.rate('i1', { rating: FeedbackRating.like }, 'cliente-123');

    expect(tx.recommendationFeedback.create.mock.calls[0][0].data.userId).toBeNull();
  });

  it('clear hace eliminado lógico (no borra)', async () => {
    const { service, prisma } = setup();

    await service.clear('p1', 'c1');

    expect(prisma.recommendationFeedback.updateMany).toHaveBeenCalledWith({
      where: { propertyId: 'p1', clientId: 'c1', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('clear sin calificación activa responde 404', async () => {
    const { service, prisma } = setup();
    prisma.recommendationFeedback.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.clear('p1', 'c1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ejemplos de aprendizaje: solo activos, con límites y formato compacto', async () => {
    const { service, prisma } = setup();
    prisma.recommendationFeedback.findMany
      .mockResolvedValueOnce([
        {
          rating: 'dislike',
          reason: 'presupuesto',
          comment: 'Doble de su presupuesto',
          interestLevel: 'Alto',
          aiReason: 'Terreno en Gualaceo',
          clientInterest: 'Busca terrenos hasta 25mil',
          propertySummary: { tipo: 'Terreno', ciudad: 'Gualaceo', terreno_m2: 502, precio: 50000 },
        },
      ])
      .mockResolvedValueOnce([]);

    const examples = await service.getLearningExamples();

    const [dislikeQuery, likeQuery] = prisma.recommendationFeedback.findMany.mock.calls.map((c) => c[0]);
    expect(dislikeQuery).toMatchObject({ where: { rating: 'dislike', deletedAt: null }, take: 15 });
    expect(likeQuery).toMatchObject({ where: { rating: 'like', deletedAt: null }, take: 8 });
    expect(examples).toEqual({
      incorrectas: [
        {
          propiedad: 'Terreno, Gualaceo, 502 m², $50.000',
          busca: 'Busca terrenos hasta 25mil',
          ia: 'Alto: Terreno en Gualaceo',
          motivo: 'presupuesto',
          comentario: 'Doble de su presupuesto',
        },
      ],
      correctas: [],
    });
  });
});
