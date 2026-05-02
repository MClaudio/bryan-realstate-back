/**
 * Formatea números telefónicos con código de país
 * Reglas:
 * - (593978961341) → (+593978961341)
 * - (0978961341) → (+593978961341) - cambia 0 por +593
 * - (+593978961341) → (+593978961341) - sin cambios
 * - (097 896 1341) → (+593978961341) - elimina espacios y formatea
 * - Detecta códigos de país conocidos, si no existe asume +593 (Ecuador)
 */

interface CountryCode {
  code: string;
  pattern: RegExp;
  leadingZero: boolean;
}

const COUNTRY_CODES: Record<string, CountryCode> = {
  EC: { code: '+593', pattern: /^593|^0/, leadingZero: true },
  US: { code: '+1', pattern: /^1/, leadingZero: false },
  CO: { code: '+57', pattern: /^57|^0/, leadingZero: true },
  PE: { code: '+51', pattern: /^51|^0/, leadingZero: true },
  BR: { code: '+55', pattern: /^55|^0/, leadingZero: true },
  MX: { code: '+52', pattern: /^52|^0/, leadingZero: true },
  AR: { code: '+54', pattern: /^54|^0/, leadingZero: true },
};

export interface FormatPhoneResult {
  formatted: string;
  isValid: boolean;
}

export const formatPhoneNumber = (phoneNumber: string): FormatPhoneResult => {
  if (!phoneNumber) {
    return { formatted: '', isValid: false };
  }

  // Eliminar espacios y caracteres especiales excepto + y dígitos
  let cleaned = phoneNumber.trim().replace(/[\s\-().]/g, '');

  if (!cleaned) {
    return { formatted: '', isValid: false };
  }

  // Ignorar números muy cortos (emergencias, operadoras, etc. con menos de 9 caracteres totales)
  if (cleaned.replace(/\D/g, '').length < 9) {
    return { formatted: cleaned, isValid: false };
  }

  // Si ya comienza con +, verificar que sea válido
  if (cleaned.startsWith('+')) {
    // Extraer solo dígitos después del +
    const digitsOnly = cleaned.substring(1).replace(/\D/g, '');
    if (digitsOnly.length >= 7) {
      return { formatted: '+' + digitsOnly, isValid: true };
    }
    return { formatted: cleaned, isValid: false };
  }

  // Intentar detectar código de país
  for (const [, config] of Object.entries(COUNTRY_CODES)) {
    // Si empieza con 0 (formato local Ecuador, Colombia, Perú, etc.)
    if (cleaned.startsWith('0') && config.leadingZero) {
      const withoutLeadingZero = cleaned.substring(1);
      if (withoutLeadingZero.length >= 7) {
        return {
          formatted: config.code + withoutLeadingZero,
          isValid: true,
        };
      }
    }

    // Si empieza con el código de país sin +
    if (cleaned.startsWith(config.code.substring(1))) {
      if (cleaned.length >= config.code.substring(1).length + 7) {
        return {
          formatted: config.code + cleaned.substring(config.code.substring(1).length),
          isValid: true,
        };
      }
    }
  }

  // Por defecto, asumir Ecuador (+593) si no se detectó otro código
  if (cleaned.replace(/\D/g, '').length >= 9) {
    // Si empieza con 0, reemplazarlo por 593
    if (cleaned.startsWith('0')) {
      return {
        formatted: '+593' + cleaned.substring(1),
        isValid: true,
      };
    }
    // Si no tiene código, asumir 593
    return {
      formatted: '+593' + cleaned,
      isValid: true,
    };
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
