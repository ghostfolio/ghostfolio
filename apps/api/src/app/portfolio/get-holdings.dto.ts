import { DateRangeFilterDto } from '@ghostfolio/api/dtos/date-range-filter.dto';
import { HoldingType } from '@ghostfolio/common/types';

import { IsIn, IsOptional, IsString } from 'class-validator';

export class GetHoldingsDto extends DateRangeFilterDto {
  @IsIn(['ACTIVE', 'CLOSED'] as HoldingType[])
  @IsOptional()
  holdingType?: HoldingType;

  @IsOptional()
  @IsString()
  query?: string;
}
