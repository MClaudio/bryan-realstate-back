/** Etiquetas legibles de los enums de propiedad (Casa_y_terreno → "Casa y terreno"). */
const ENUM_LABELS: Record<string, string> = {
  Casa_y_terreno: 'Casa y terreno',
  Urbanizacion: 'Urbanización',
};

export const propertyEnumLabel = (value?: string | null): string | undefined =>
  value ? (ENUM_LABELS[value] ?? value.replace(/_/g, ' ')) : undefined;

export type NumberLike = number | string | { toString(): string } | null | undefined;

export const toFiniteNumber = (value: NumberLike): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

/** Número > 0 o undefined (áreas en 0, años vacíos, etc. no aportan información). */
export const positiveNumber = (value: NumberLike): number | undefined => {
  const n = toFiniteNumber(value);
  return n !== null && n > 0 ? n : undefined;
};

export const cleanText = (value?: string | null): string | undefined => {
  const text = value?.replace(/\s+/g, ' ').trim();
  return text ? text : undefined;
};

export const stringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
    : [];
