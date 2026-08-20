import { IsAfter1970Constraint } from '@ghostfolio/common/validator-constraints/is-after-1970';

import { IsISO8601, IsNumber, Min, Validate } from 'class-validator';

export class MarketDataDto {
  @IsISO8601({ strict: true, strictSeparator: true })
  @Validate(IsAfter1970Constraint)
  date: string;

  @IsNumber()
  @Min(0)
  marketPrice: number;
}
