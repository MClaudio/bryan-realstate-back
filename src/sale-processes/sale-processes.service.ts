import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, Prisma, SaleStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSaleStageDto } from './dto/update-sale-process.dto';
import {
  STAGE_FIELDS,
  STAGE_LABELS,
  STAGE_ORDER,
  STAGES_BY_METHOD,
  StageValues,
  computeProgress,
  isStageComplete,
  newSaleProcessCreate,
  stageHasData,
} from './sale-process.rules';

const stageInclude = {
  completedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.SaleProcessStageInclude;

const processInclude = {
  stages: { include: stageInclude },
} satisfies Prisma.SaleProcessInclude;

const propertySelect = {
  id: true,
  code: true,
  address: true,
  price: true,
  salePrice: true,
  city: { select: { name: true } },
} satisfies Prisma.PropertySelect;

type StageRow = Prisma.SaleProcessStageGetPayload<{ include: typeof stageInclude }>;
type ProcessRow = Prisma.SaleProcessGetPayload<{ include: typeof processInclude }>;
type PropertyRow = Prisma.PropertyGetPayload<{ select: typeof propertySelect }>;

const toNumber = (v: Prisma.Decimal | null) => (v === null ? null : Number(v));

const valuesOf = (row: StageRow): StageValues => ({
  observation: row.observation,
  totalValue: toNumber(row.totalValue),
  depositAmount: toNumber(row.depositAmount),
  registryStatus: row.registryStatus,
  manualCompleted: row.stage === SaleStage.Municipio && row.completed,
});

@Injectable()
export class SaleProcessesService {
  constructor(private prisma: PrismaService) {}

  private serialize(property: PropertyRow, process: ProcessRow) {
    const applicable = STAGES_BY_METHOD[process.paymentMethod];
    const byStage = new Map(process.stages.map((s) => [s.stage, s]));

    const stages = STAGE_ORDER.map((stage) => {
      const row = byStage.get(stage)!;
      const v = valuesOf(row);
      return {
        stage,
        label: STAGE_LABELS[stage],
        applies: applicable.includes(stage),
        completed: row.completed,
        completedAt: row.completedAt,
        completedBy: row.completedBy,
        hasData: stageHasData(v),
        observation: v.observation,
        totalValue: v.totalValue,
        depositAmount: v.depositAmount,
        balance:
          v.totalValue !== null ? v.totalValue - (v.depositAmount ?? 0) : null,
        registryStatus: v.registryStatus,
      };
    });

    return {
      propertyId: property.id,
      code: property.code,
      address: property.address,
      cityName: property.city?.name ?? null,
      // Seña's total value is prefilled with the sale price, else the price.
      suggestedTotalValue: Number(property.salePrice ?? property.price),
      paymentMethod: process.paymentMethod,
      progress: computeProgress(process.paymentMethod, process.stages),
      stages,
    };
  }

  private async getProperty(propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      select: propertySelect,
    });
    if (!property) throw new NotFoundException('Propiedad no encontrada');
    return property;
  }

  /** Returns the property's process, creating it (and any missing stage) if needed. */
  private async ensureProcess(propertyId: string): Promise<ProcessRow> {
    const existing = await this.prisma.saleProcess.findUnique({
      where: { propertyId },
      include: processInclude,
    });
    if (!existing) {
      return this.prisma.saleProcess.create({
        data: { propertyId, ...newSaleProcessCreate },
        include: processInclude,
      });
    }
    if (existing.stages.length === STAGE_ORDER.length) return existing;

    await this.prisma.saleProcessStage.createMany({
      data: STAGE_ORDER.map((stage) => ({ saleProcessId: existing.id, stage })),
      skipDuplicates: true,
    });
    return this.prisma.saleProcess.findUniqueOrThrow({
      where: { id: existing.id },
      include: processInclude,
    });
  }

  async findAll() {
    const properties = await this.prisma.property.findMany({
      where: { deletedAt: null },
      select: { ...propertySelect, saleProcess: { include: processInclude } },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      properties.map(async ({ saleProcess, ...property }) => {
        const process =
          saleProcess && saleProcess.stages.length === STAGE_ORDER.length
            ? saleProcess
            : await this.ensureProcess(property.id);
        return this.serialize(property, process);
      }),
    );
  }

  async findOne(propertyId: string) {
    const property = await this.getProperty(propertyId);
    return this.serialize(property, await this.ensureProcess(propertyId));
  }

  async updatePaymentMethod(propertyId: string, paymentMethod: PaymentMethod) {
    const property = await this.getProperty(propertyId);
    const process = await this.ensureProcess(propertyId);
    const updated = await this.prisma.saleProcess.update({
      where: { id: process.id },
      data: { paymentMethod },
      include: processInclude,
    });
    return this.serialize(property, updated);
  }

  async updateStage(
    propertyId: string,
    stage: SaleStage,
    dto: UpdateSaleStageDto,
    userId: string,
  ) {
    const sent = Object.keys(dto).filter(
      (k) => dto[k as keyof UpdateSaleStageDto] !== undefined,
    );
    const invalid = sent.filter((k) => !STAGE_FIELDS[stage].includes(k));
    if (invalid.length) {
      throw new BadRequestException(
        `${STAGE_LABELS[stage]} no acepta: ${invalid.join(', ')}`,
      );
    }

    const property = await this.getProperty(propertyId);
    const process = await this.ensureProcess(propertyId);
    const row = process.stages.find((s) => s.stage === stage)!;
    const current = valuesOf(row);

    const pick = <T>(incoming: T | undefined, fallback: T) =>
      incoming === undefined ? fallback : incoming;
    const observation = pick(dto.observation, current.observation);
    const next: StageValues = {
      observation: observation?.trim() ? observation.trim() : null,
      totalValue: pick(dto.totalValue, current.totalValue),
      depositAmount: pick(dto.depositAmount, current.depositAmount),
      registryStatus: pick(dto.registryStatus, current.registryStatus),
      manualCompleted: pick(dto.completed, current.manualCompleted),
    };

    if (
      next.totalValue !== null &&
      next.depositAmount !== null &&
      next.depositAmount > next.totalValue
    ) {
      throw new BadRequestException(
        'La seña no puede ser mayor que el valor total',
      );
    }

    const completed = isStageComplete(stage, next);
    const completion = completed
      ? row.completed
        ? {} // already complete: keep who/when
        : { completedAt: new Date(), completedById: userId }
      : { completedAt: null, completedById: null };

    await this.prisma.saleProcessStage.update({
      where: { id: row.id },
      data: {
        observation: next.observation,
        totalValue: next.totalValue,
        depositAmount: next.depositAmount,
        registryStatus: next.registryStatus,
        completed,
        ...completion,
      },
    });

    const refreshed = await this.prisma.saleProcess.findUniqueOrThrow({
      where: { id: process.id },
      include: processInclude,
    });
    return this.serialize(property, refreshed);
  }
}
