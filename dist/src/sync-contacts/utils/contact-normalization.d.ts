export declare const normalizeEmail: (email?: string | null) => string | null;
export declare const normalizePhone: (phone?: string | null) => string | null;
export declare const splitFullName: (fullName?: string | null) => {
    firstName: string;
    lastName: string;
};
export declare const getContactUniqueKey: (email?: string | null, phone?: string | null) => string | null;
export declare const buildCandidateId: (contact: {
    googleContactId?: string | null;
    email?: string | null;
    phone?: string | null;
}) => string | null;
