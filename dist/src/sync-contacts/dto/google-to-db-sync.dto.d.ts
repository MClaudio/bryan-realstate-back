import { GoogleContactSelectionDto } from './google-contact-selection.dto';
export declare class GoogleToDbSyncDto {
    selectedContacts: GoogleContactSelectionDto[];
    excludedContacts: GoogleContactSelectionDto[];
    forceSync?: boolean;
}
