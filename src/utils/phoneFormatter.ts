import { parsePhoneNumberFromString } from 'libphonenumber-js';

const MIN_PHONE_DIGITS = 9;
const DEFAULT_COUNTRY = 'EC' as const;

export interface FormatPhoneResult {
  formatted: string;
  isValid: boolean;
}

export const formatPhoneNumber = (phoneNumber: string): FormatPhoneResult => {
  if (!phoneNumber) {
    return { formatted: '', isValid: false };
  }

  const cleaned = phoneNumber.trim().replace(/[^\d+]/g, '');
  const digitCount = cleaned.replace(/\D/g, '').length;

  // Ignorar números cortos: operadora, emergencia, etc.
  if (!cleaned || digitCount < MIN_PHONE_DIGITS) {
    return { formatted: cleaned, isValid: false };
  }

  const candidates = cleaned.startsWith('+')
    ? [cleaned, cleaned.replace('+', '')]
    : [cleaned, `+${cleaned}`];

  for (const candidate of candidates) {
    const parsed = candidate.startsWith('+')
      ? parsePhoneNumberFromString(candidate)
      : parsePhoneNumberFromString(candidate, DEFAULT_COUNTRY);

    if (parsed?.isValid()) {
      return { formatted: parsed.number, isValid: true };
    }
  }

  // Fallback local EC cuando viene en formato nacional con 0 inicial
  if (cleaned.startsWith('0')) {
    const parsedEc = parsePhoneNumberFromString(cleaned, DEFAULT_COUNTRY);
    if (parsedEc?.isValid()) {
      return { formatted: parsedEc.number, isValid: true };
    }
  }

  return { formatted: cleaned, isValid: false };
};

export const validatePhoneNumber = (phoneNumber: string): boolean => {
  const { isValid } = formatPhoneNumber(phoneNumber);
  return isValid;
};

export const getFormattedPhoneNumber = (phoneNumber: string): string => {
  const { formatted, isValid } = formatPhoneNumber(phoneNumber);
  return isValid ? formatted : phoneNumber;
};
