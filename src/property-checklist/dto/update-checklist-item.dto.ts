import { IsBoolean, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ProcessType } from '@prisma/client';

export class UpdateChecklistItemDto {
  @IsEnum(ProcessType)
  side: ProcessType;

  @IsString()
  @IsNotEmpty()
  itemKey: string;

  @IsBoolean()
  checked: boolean;
}
