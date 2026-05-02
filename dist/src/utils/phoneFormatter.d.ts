export interface FormatPhoneResult {
    formatted: string;
    isValid: boolean;
}
export declare const formatPhoneNumber: (phoneNumber: string) => FormatPhoneResult;
export declare const validatePhoneNumber: (phoneNumber: string) => boolean;
export declare const getFormattedPhoneNumber: (phoneNumber: string) => string;
