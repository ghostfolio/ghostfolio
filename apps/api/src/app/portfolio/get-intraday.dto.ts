import { Transform, TransformFnParams } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

import type { IntradayDateRange } from './intraday/intraday.helper';

export class GetIntradayDto {
  /** Comma-separated ids of the asset profiles of the benchmarks */
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @Transform(({ value }: TransformFnParams) => {
    return typeof value === 'string'
      ? value.split(',').filter((id) => {
          return id.length > 0;
        })
      : value;
  })
  benchmarks?: string[];

  @IsIn(['1d', 'mtd', 'wtd'] as IntradayDateRange[])
  range: IntradayDateRange;
}
