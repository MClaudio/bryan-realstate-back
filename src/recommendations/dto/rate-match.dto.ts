import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { FeedbackRating, FeedbackReason } from '@prisma/client';

export class RateMatchDto {
  @IsEnum(FeedbackRating)
  rating: FeedbackRating;

  /** Obligatorio en un dislike: permite revisar en qué se equivocan las reglas. */
  @ValidateIf((o: RateMatchDto) => o.rating === FeedbackRating.dislike)
  @IsEnum(FeedbackReason, { message: 'Indica el motivo del dislike' })
  reason?: FeedbackReason;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  comment?: string;
}
