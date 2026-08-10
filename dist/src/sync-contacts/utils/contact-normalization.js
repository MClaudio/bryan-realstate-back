"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCandidateId = exports.getContactUniqueKey = exports.normalizeNamePair = exports.splitFullName = exports.normalizePhone = exports.normalizeEmail = void 0;
const node_crypto_1 = require("node:crypto");
const normalizeEmail = (email) => {
    if (!email)
        return null;
    const normalized = email.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
};
exports.normalizeEmail = normalizeEmail;
const normalizePhone = (phone) => {
    if (!phone)
        return null;
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length > 0 ? digitsOnly : null;
};
exports.normalizePhone = normalizePhone;
const splitFullName = (fullName) => {
    if (!fullName) {
        return { firstName: 'Sin', lastName: 'Nombre' };
    }
    const parts = fullName
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (parts.length === 0) {
        return { firstName: 'Sin', lastName: 'Nombre' };
    }
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: 'N/A' };
    }
    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
    };
};
exports.splitFullName = splitFullName;
const trimAndCollapseSpaces = (value) => value.replace(/\s+/g, ' ').trim();
const normalizeNamePair = (rawFirstName, rawLastName, rawFullName) => {
    const firstName = rawFirstName?.trim() ?? '';
    const lastName = rawLastName?.trim() ?? '';
    const fullName = rawFullName?.trim() ?? '';
    if (!firstName && !lastName && !fullName) {
        return { firstName: 'Sin', lastName: 'Nombre' };
    }
    let workingFirst = firstName;
    let workingLast = lastName;
    if (!workingFirst || !workingLast) {
        const fromFull = (0, exports.splitFullName)(fullName || `${workingFirst} ${workingLast}`);
        workingFirst = fromFull.firstName;
        workingLast = fromFull.lastName;
    }
    if (workingLast) {
        const suffix = ` ${workingLast}`;
        while (workingFirst.length > suffix.length && workingFirst.endsWith(suffix)) {
            workingFirst = workingFirst.slice(0, -suffix.length).trimEnd();
        }
        const suffixNoSpace = workingLast;
        if (workingFirst.length > suffixNoSpace.length &&
            workingFirst.endsWith(suffixNoSpace) &&
            !workingFirst.endsWith(` ${suffixNoSpace}`)) {
            const candidate = workingFirst.slice(0, -suffixNoSpace.length).trimEnd();
            if (candidate.length > 0) {
                workingFirst = candidate;
            }
        }
    }
    if (fullName && (!workingFirst || !workingLast || workingLast === 'N/A')) {
        const reSplit = (0, exports.splitFullName)(fullName);
        if (!workingFirst)
            workingFirst = reSplit.firstName;
        if (!workingLast || workingLast === 'N/A')
            workingLast = reSplit.lastName;
    }
    return {
        firstName: trimAndCollapseSpaces(workingFirst || 'Sin'),
        lastName: trimAndCollapseSpaces(workingLast || 'Nombre'),
    };
};
exports.normalizeNamePair = normalizeNamePair;
const getContactUniqueKey = (email, phone) => {
    const normalizedEmail = (0, exports.normalizeEmail)(email);
    const normalizedPhone = (0, exports.normalizePhone)(phone);
    if (normalizedEmail)
        return `email:${normalizedEmail}`;
    if (normalizedPhone)
        return `phone:${normalizedPhone}`;
    return null;
};
exports.getContactUniqueKey = getContactUniqueKey;
const buildCandidateId = (contact) => {
    const googleContactId = contact.googleContactId?.trim();
    if (googleContactId)
        return `gid:${googleContactId}`;
    const uniqueKey = (0, exports.getContactUniqueKey)(contact.email, contact.phone);
    if (!uniqueKey)
        return null;
    const hash = (0, node_crypto_1.createHash)('sha256').update(uniqueKey).digest('hex').slice(0, 32);
    return `cid:${hash}`;
};
exports.buildCandidateId = buildCandidateId;
//# sourceMappingURL=contact-normalization.js.map