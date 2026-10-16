import { DateRangeFilterDto } from '@ghostfolio/api/dtos/date-range-filter.dto';

import { Transform, TransformFnParams } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class GetDetailsDto extends DateRangeFilterDto {
  @IsBoolean()
  @Transform(({ value }: TransformFnParams) => {
    return value === 'true';
  })
  withMarkets? = false;
}
