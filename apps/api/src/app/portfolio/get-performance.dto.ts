import { DateRangeFilterDto } from '@ghostfolio/api/dtos/date-range-filter.dto';
import { GroupBy } from '@ghostfolio/common/types';

import { Transform, TransformFnParams } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class GetPerformanceDto extends DateRangeFilterDto {
  @IsIn(['year'] as GroupBy[])
  @IsOptional()
  groupBy?: Extract<GroupBy, 'year'>;

  @IsBoolean()
  @Transform(({ value }: TransformFnParams) => {
    return value === 'true';
  })
  withExcludedAccounts? = false;
}
