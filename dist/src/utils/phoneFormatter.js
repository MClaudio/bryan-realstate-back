"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFormattedPhoneNumber = exports.validatePhoneNumber = exports.formatPhoneNumber = void 0;
const COUNTRY_CODES = {
    EC: { code: '+593', pattern: /^593|^0/, leadingZero: true },
    US: { code: '+1', pattern: /^1/, leadingZero: false },
    CO: { code: '+57', pattern: /^57|^0/, leadingZero: true },
    PE: { code: '+51', pattern: /^51|^0/, leadingZero: true },
    BR: { code: '+55', pattern: /^55|^0/, leadingZero: true },
    MX: { code: '+52', pattern: /^52|^0/, leadingZero: true },
    AR: { code: '+54', pattern: /^54|^0/, leadingZero: true },
};
const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) {
        return { formatted: '', isValid: false };
    }
    let cleaned = phoneNumber.trim().replace(/[\s\-().]/g, '');
    if (!cleaned) {
        return { formatted: '', isValid: false };
    }
    if (cleaned.replace(/\D/g, '').length < 9) {
        return { formatted: cleaned, isValid: false };
    }
    if (cleaned.startsWith('+')) {
        const digitsOnly = cleaned.substring(1).replace(/\D/g, '');
        if (digitsOnly.length >= 7) {
            return { formatted: '+' + digitsOnly, isValid: true };
        }
        return { formatted: cleaned, isValid: false };
    }
    for (const [, config] of Object.entries(COUNTRY_CODES)) {
        if (cleaned.startsWith('0') && config.leadingZero) {
            const withoutLeadingZero = cleaned.substring(1);
            if (withoutLeadingZero.length >= 7) {
                return {
                    formatted: config.code + withoutLeadingZero,
                    isValid: true,
                };
            }
        }
        if (cleaned.startsWith(config.code.substring(1))) {
            if (cleaned.length >= config.code.substring(1).length + 7) {
                return {
                    formatted: config.code + cleaned.substring(config.code.substring(1).length),
                    isValid: true,
                };
            }
        }
    }
    if (cleaned.replace(/\D/g, '').length >= 9) {
        if (cleaned.startsWith('0')) {
            return {
                formatted: '+593' + cleaned.substring(1),
                isValid: true,
            };
        }
        return {
            formatted: '+593' + cleaned,
            isValid: true,
        };
    }
    return { formatted: cleaned, isValid: false };
};
exports.formatPhoneNumber = formatPhoneNumber;
const validatePhoneNumber = (phoneNumber) => {
    const { isValid } = (0, exports.formatPhoneNumber)(phoneNumber);
    return isValid;
};
exports.validatePhoneNumber = validatePhoneNumber;
const getFormattedPhoneNumber = (phoneNumber) => {
    const { formatted, isValid } = (0, exports.formatPhoneNumber)(phoneNumber);
    return isValid ? formatted : phoneNumber;
};
exports.getFormattedPhoneNumber = getFormattedPhoneNumber;
//# sourceMappingURL=phoneFormatter.js.map