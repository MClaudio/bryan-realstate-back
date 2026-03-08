import { PartialType } from '@nestjs/mapped-types';
import { CreatePropertyInterestDto } from './create-property-interest.dto';

export class UpdatePropertyInterestDto extends PartialType(CreatePropertyInterestDto) {}
