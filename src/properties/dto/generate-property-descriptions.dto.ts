import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform, Type } from 'class-transformer';

const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' || value === null ? undefined : value);

/**
 * Datos del formulario usados para generar las descripciones públicas.
 * No incluye precio mínimo, precio máximo, comisión ni datos del propietario.
 */
export class GeneratePropertyDescriptionsDto {
  @IsString()
  @IsOptional()
  propertyType?: string;

  @Transform(emptyToUndefined)
  @IsUUID()
  @IsOptional()
  cityId?: string;

  @IsString()
  @IsOptional()
  referenceSector?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  zone?: string;

  @IsString()
  @IsOptional()
  topography?: string;

  @Transform(emptyToUndefined)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  landArea?: number;

  @Transform(emptyToUndefined)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  constructionArea?: number;

  @Transform(emptyToUndefined)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  constructionYears?: number;

  @IsBoolean()
  @IsOptional()
  hasBasicServices?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  basicServices?: string[];

  @Transform(emptyToUndefined)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  cityTime?: number;

  @IsString()
  @IsOptional()
  features?: string;

  @IsString()
  @IsOptional()
  observations?: string;

  @Transform(emptyToUndefined)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  price?: number;
}
