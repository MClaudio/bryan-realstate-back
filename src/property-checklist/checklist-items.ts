import { ProcessType } from '@prisma/client';

export interface ChecklistItemDefinition {
  key: string;
  label: string;
}

// Single source of truth for the document checklist; the frontend renders
// whatever GET /properties/:id/checklist returns, in this order.
export const CHECKLIST_ITEMS: Record<ProcessType, ChecklistItemDefinition[]> = {
  Comprador: [
    { key: 'cedula_poder', label: 'Copia de cédula o poder' },
    { key: 'certificado_votacion', label: 'Certificado de votación' },
    { key: 'roles_pago', label: 'Roles de pago (si aplica a crédito)' },
    { key: 'identificacion_ny', label: 'Identificación NY (si aplica a crédito)' },
    {
      key: 'movimiento_cuenta_ny',
      label: 'Movimiento cuenta bancaria NY (si aplica a crédito)',
    },
    {
      key: 'certificado_trabajo_ny',
      label: 'Certificado de trabajo NY (si aplica a crédito)',
    },
    { key: 'colillas_cheques_ny', label: 'Colillas de cheques NY (si aplica)' },
    { key: 'certificado_giros_ny', label: 'Certificado de giros NY (si aplica)' },
    {
      key: 'no_adeudar_municipio',
      label: 'Certificado de no adeudar al municipio',
    },
  ],
  Vendedor: [
    { key: 'escrituras', label: 'Escrituras' },
    {
      key: 'inscripcion_registro',
      label: 'Inscripción en el Registro de la Propiedad',
    },
    { key: 'levantamiento_topografico', label: 'Levantamiento topográfico' },
    { key: 'cedula_poder', label: 'Copia de cédula o poder' },
    { key: 'certificado_gravamen', label: 'Certificado de gravamen' },
    { key: 'no_adeudar', label: 'Certificado de no adeudar' },
    { key: 'plano_lotizacion', label: 'Plano de lotización (si aplica)' },
    { key: 'posesion_efectiva', label: 'Posesión efectiva (si aplica)' },
    { key: 'impuesto_herencia', label: 'Impuesto a la herencia (si aplica)' },
    { key: 'certificado_votacion', label: 'Certificado de votación' },
    { key: 'llaves', label: 'Llaves (si aplica)' },
  ],
};

export function isValidItem(side: ProcessType, key: string): boolean {
  return CHECKLIST_ITEMS[side]?.some((item) => item.key === key) ?? false;
}
