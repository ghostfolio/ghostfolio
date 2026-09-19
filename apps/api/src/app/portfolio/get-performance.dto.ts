import { DateRangeFilterDto } from '@ghostfolio/api/dtos/date-range-filter.dto';

import { Transform, TransformFnParams } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class GetPerformanceDto extends DateRangeFilterDto {
  @IsIn(['year'])
  @IsOptional()
  groupBy?: 'year';

  @IsBoolean()
  @Transform(({ value }: TransformFnParams) => {
    return value === 'true';
  })
  withExcludedAccounts? = false;
}
