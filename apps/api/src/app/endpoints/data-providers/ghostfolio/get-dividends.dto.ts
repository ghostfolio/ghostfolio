import { Granularity } from '@ghostfolio/common/types';

import { IsIn, IsISO8601, IsOptional } from 'class-validator';

export class GetDividendsDto {
  @IsISO8601()
  from: string;

  @IsIn(['day', 'month'] as Granularity[])
  @IsOptional()
  granularity: Granularity;

  @IsISO8601()
  to: string;
}
