"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFormattedPhoneNumber = exports.validatePhoneNumber = exports.formatPhoneNumber = void 0;
const libphonenumber_js_1 = require("libphonenumber-js");
const MIN_PHONE_DIGITS = 9;
const DEFAULT_COUNTRY = 'EC';
const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) {
        return { formatted: '', isValid: false };
    }
    const cleaned = phoneNumber.trim().replace(/[^\d+]/g, '');
    const digitCount = cleaned.replace(/\D/g, '').length;
    if (!cleaned || digitCount < MIN_PHONE_DIGITS) {
        return { formatted: cleaned, isValid: false };
    }
    const candidates = cleaned.startsWith('+')
        ? [cleaned, cleaned.replace('+', '')]
        : [cleaned, `+${cleaned}`];
    for (const candidate of candidates) {
        const parsed = candidate.startsWith('+')
            ? (0, libphonenumber_js_1.parsePhoneNumberFromString)(candidate)
            : (0, libphonenumber_js_1.parsePhoneNumberFromString)(candidate, DEFAULT_COUNTRY);
        if (parsed?.isValid()) {
            return { formatted: parsed.number, isValid: true };
        }
    }
    if (cleaned.startsWith('0')) {
        const parsedEc = (0, libphonenumber_js_1.parsePhoneNumberFromString)(cleaned, DEFAULT_COUNTRY);
        if (parsedEc?.isValid()) {
            return { formatted: parsedEc.number, isValid: true };
        }
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