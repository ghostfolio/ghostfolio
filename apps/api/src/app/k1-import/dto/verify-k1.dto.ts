import { IsArray, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import {
  K1ExtractedFieldDto,
  K1UnmappedItemDto
} from '@ghostfolio/common/dtos';

/**
 * DTO for verifying K-1 import session.
 * Re-exports shared VerifyK1ImportDto for route-level validation.
 */
export class VerifyK1Dto {
  @IsInt()
  @Min(1900)
  taxYear: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => K1ExtractedFieldDto)
  fields: K1ExtractedFieldDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => K1UnmappedItemDto)
  unmappedItems?: K1UnmappedItemDto[];
}
