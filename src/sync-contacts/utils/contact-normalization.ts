import { createHash } from 'node:crypto';

export const normalizeEmail = (email?: string | null): string | null => {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

export const normalizePhone = (phone?: string | null): string | null => {
  if (!phone) return null;
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length > 0 ? digitsOnly : null;
};

export const splitFullName = (fullName?: string | null): { firstName: string; lastName: string } => {
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

const trimAndCollapseSpaces = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

export const normalizeNamePair = (
  rawFirstName?: string | null,
  rawLastName?: string | null,
  rawFullName?: string | null,
): { firstName: string; lastName: string } => {
  const firstName = rawFirstName?.trim() ?? '';
  const lastName = rawLastName?.trim() ?? '';
  const fullName = rawFullName?.trim() ?? '';

  if (!firstName && !lastName && !fullName) {
    return { firstName: 'Sin', lastName: 'Nombre' };
  }

  let workingFirst = firstName;
  let workingLast = lastName;

  if (!workingFirst || !workingLast) {
    const fromFull = splitFullName(fullName || `${workingFirst} ${workingLast}`);
    workingFirst = fromFull.firstName;
    workingLast = fromFull.lastName;
  }

  if (workingLast) {
    const suffix = ` ${workingLast}`;
    while (workingFirst.length > suffix.length && workingFirst.endsWith(suffix)) {
      workingFirst = workingFirst.slice(0, -suffix.length).trimEnd();
    }

    const suffixNoSpace = workingLast;
    if (
      workingFirst.length > suffixNoSpace.length &&
      workingFirst.endsWith(suffixNoSpace) &&
      !workingFirst.endsWith(` ${suffixNoSpace}`)
    ) {
      const candidate = workingFirst.slice(0, -suffixNoSpace.length).trimEnd();
      if (candidate.length > 0) {
        workingFirst = candidate;
      }
    }
  }

  if (fullName && (!workingFirst || !workingLast || workingLast === 'N/A')) {
    const reSplit = splitFullName(fullName);
    if (!workingFirst) workingFirst = reSplit.firstName;
    if (!workingLast || workingLast === 'N/A') workingLast = reSplit.lastName;
  }

  return {
    firstName: trimAndCollapseSpaces(workingFirst || 'Sin'),
    lastName: trimAndCollapseSpaces(workingLast || 'Nombre'),
  };
};

export const getContactUniqueKey = (email?: string | null, phone?: string | null): string | null => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);

  if (normalizedEmail) return `email:${normalizedEmail}`;
  if (normalizedPhone) return `phone:${normalizedPhone}`;

  return null;
};

export const buildCandidateId = (contact: {
  googleContactId?: string | null;
  email?: string | null;
  phone?: string | null;
}): string | null => {
  const googleContactId = contact.googleContactId?.trim();
  if (googleContactId) return `gid:${googleContactId}`;

  const uniqueKey = getContactUniqueKey(contact.email, contact.phone);
  if (!uniqueKey) return null;

  const hash = createHash('sha256').update(uniqueKey).digest('hex').slice(0, 32);
  return `cid:${hash}`;
};
