import { IsArray, IsOptional, IsString } from 'class-validator';

export class GoogleContactSelectionDto {
  @IsString()
  @IsOptional()
  candidateId?: string;

  @IsString()
  @IsOptional()
  biography?: string;

  @IsString()
  @IsOptional()
  googleContactId?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  // Contexto crudo de Google usado por la normalización con IA
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  phones?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  emails?: string[];

  @IsString()
  @IsOptional()
  birthday?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  organization?: string;
}
