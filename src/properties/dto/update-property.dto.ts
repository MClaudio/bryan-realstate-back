import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  IsArray,
  IsUUID,
  IsNumber,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PropertyStatus,
  PropertyType,
  Topography,
  Zone,
} from '@prisma/client';

export class UpdatePropertyDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  locationUrl?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  constructionArea?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  landArea?: number;

  @IsBoolean()
  @IsOptional()
  hasBasicServices?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  basicServices?: string[];

  @IsString()
  @IsOptional()
  features?: string;

  @IsEnum(PropertyType)
  @IsOptional()
  propertyType?: PropertyType;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  constructionYears?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @IsEnum(Topography)
  @IsOptional()
  topography?: Topography;

  @IsEnum(Zone)
  @IsOptional()
  zone?: Zone;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  cityTime?: number;

  @IsString()
  @IsOptional()
  observations?: string;

  @IsEnum(PropertyStatus)
  @IsOptional()
  status?: PropertyStatus;

  @IsUUID()
  @IsOptional()
  advisorId?: string;

  @IsString()
  @IsOptional()
  owner?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  commission?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  salePrice?: number;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsUrl({}, { message: 'facebookUrl must be a valid URL address' })
  @IsOptional()
  @ValidateIf((obj, value) => value !== '' && value !== null && value !== undefined)
  facebookUrl?: string;

  @IsUrl({}, { message: 'tiktokUrl must be a valid URL address' })
  @IsOptional()
  @ValidateIf((obj, value) => value !== '' && value !== null && value !== undefined)
  tiktokUrl?: string;

  @IsUrl({}, { message: 'instagramUrl must be a valid URL address' })
  @IsOptional()
  @ValidateIf((obj, value) => value !== '' && value !== null && value !== undefined)
  instagramUrl?: string;

  @IsUrl({}, { message: 'youtubeUrl must be a valid URL address' })
  @IsOptional()
  @ValidateIf((obj, value) => value !== '' && value !== null && value !== undefined)
  youtubeUrl?: string;

  @IsArray()
  @IsOptional()
  fileIds?: string[];

  @IsArray()
  @IsOptional()
  documentFileIds?: string[];
}