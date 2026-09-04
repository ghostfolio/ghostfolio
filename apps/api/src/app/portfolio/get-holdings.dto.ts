import { DateRangeFilterDto } from '@ghostfolio/api/dtos/date-range-filter.dto';
import { SEARCH_QUERY_MAXIMUM_LENGTH } from '@ghostfolio/common/config';
import { HoldingType } from '@ghostfolio/common/types';

import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class GetHoldingsDto extends DateRangeFilterDto {
  @IsIn(['ACTIVE', 'CLOSED'] as HoldingType[])
  @IsOptional()
  holdingType?: HoldingType;

  @IsOptional()
  @IsString()
  @MaxLength(SEARCH_QUERY_MAXIMUM_LENGTH)
  query?: string;
}
