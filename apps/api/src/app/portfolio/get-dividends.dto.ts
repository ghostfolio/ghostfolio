import { DateRangeFilterDto } from '@ghostfolio/api/dtos/date-range-filter.dto';
import { GroupBy } from '@ghostfolio/common/types';

import { IsIn, IsOptional } from 'class-validator';

export class GetDividendsDto extends DateRangeFilterDto {
  @IsIn(['month', 'year'] as GroupBy[])
  @IsOptional()
  groupBy?: GroupBy;
}
