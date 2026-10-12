import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { FeedbackRating, FeedbackReason } from '@prisma/client';

export class RateRecommendationDto {
  @IsEnum(FeedbackRating)
  rating: FeedbackRating;

  /** Obligatorio en un dislike: es lo que permite a la IA generalizar el error. */
  @ValidateIf((o: RateRecommendationDto) => o.rating === FeedbackRating.dislike)
  @IsEnum(FeedbackReason, { message: 'Indica el motivo del dislike' })
  reason?: FeedbackReason;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  comment?: string;
}
