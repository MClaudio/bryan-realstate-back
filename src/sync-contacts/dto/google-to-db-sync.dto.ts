import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { GoogleContactSelectionDto } from './google-contact-selection.dto';

export class GoogleToDbSyncDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoogleContactSelectionDto)
  selectedContacts: GoogleContactSelectionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoogleContactSelectionDto)
  excludedContacts: GoogleContactSelectionDto[];

  @IsBoolean()
  @IsOptional()
  forceSync?: boolean;
}
