import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @IsObject()
  permissions: Record<string, Record<string, boolean>>;
}

export class UpdateProfileDto extends PartialType(CreateProfileDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
