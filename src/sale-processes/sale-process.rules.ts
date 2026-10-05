import { PaymentMethod, RegistryStatus, SaleStage } from '@prisma/client';

// Single source of truth for the sale process: which stages apply to each
// payment method, when a stage counts as complete and how progress is computed.
// The frontend only renders what the API returns.

export const STAGE_ORDER: SaleStage[] = [
  SaleStage.Sena,
  SaleStage.Cooperativa,
  SaleStage.Municipio,
  SaleStage.Notaria,
  SaleStage.Registro,
];

/** Nested Prisma create for a brand-new process with all its stages. */
export const newSaleProcessCreate = {
  stages: { create: STAGE_ORDER.map((stage) => ({ stage })) },
};

export const STAGES_BY_METHOD: Record<PaymentMethod, SaleStage[]> = {
  Credito: STAGE_ORDER,
  Efectivo: STAGE_ORDER.filter((s) => s !== SaleStage.Cooperativa),
};

/** Stages completed by hand (checkbox) instead of by their data. */
export const MANUAL_STAGES: SaleStage[] = [SaleStage.Cooperativa, SaleStage.Municipio];

export const STAGE_LABELS: Record<SaleStage, string> = {
  Sena: 'Seña',
  Cooperativa: 'Cooperativa',
  Municipio: 'Municipio',
  Notaria: 'Notaría',
  Registro: 'Registro de la Propiedad',
};

/** Fields each stage accepts on update (anything else is rejected). */
export const STAGE_FIELDS: Record<SaleStage, string[]> = {
  Sena: ['observation', 'totalValue', 'depositAmount'],
  Cooperativa: ['observation', 'completed'],
  Municipio: ['observation', 'completed'],
  Notaria: ['observation'],
  Registro: ['observation', 'registryStatus'],
};

export interface StageValues {
  observation: string | null;
  totalValue: number | null;
  depositAmount: number | null;
  registryStatus: RegistryStatus | null;
  /** Only meaningful for Cooperativa and Municipio, the stages completed by hand. */
  manualCompleted: boolean;
}

export function isStageComplete(stage: SaleStage, v: StageValues): boolean {
  switch (stage) {
    case SaleStage.Sena:
      return (v.depositAmount ?? 0) > 0;
    case SaleStage.Notaria:
      return !!v.observation?.trim();
    case SaleStage.Cooperativa:
    case SaleStage.Municipio:
      return v.manualCompleted;
    case SaleStage.Registro:
      return v.registryStatus === RegistryStatus.Inscrita;
  }
}

/** Something was entered, even if the stage is not complete yet. */
export function stageHasData(v: StageValues): boolean {
  return (
    !!v.observation?.trim() ||
    (v.depositAmount ?? 0) > 0 ||
    v.registryStatus !== null ||
    v.manualCompleted
  );
}

export function computeProgress(
  method: PaymentMethod,
  stages: Array<{ stage: SaleStage; completed: boolean }>,
): number {
  const applicable = STAGES_BY_METHOD[method];
  const done = stages.filter(
    (s) => s.completed && applicable.includes(s.stage),
  ).length;
  return Math.round((done / applicable.length) * 100);
}
