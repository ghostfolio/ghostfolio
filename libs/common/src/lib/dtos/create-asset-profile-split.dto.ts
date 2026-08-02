import { IsAfter1970Constraint } from '@ghostfolio/common/validator-constraints/is-after-1970';
import { IsSplitFactorConstraint } from '@ghostfolio/common/validator-constraints/is-split-factor';

import { IsISO8601, IsNumber, Validate } from 'class-validator';

export class CreateAssetProfileSplitDto {
  /**
   * The date the split becomes effective. Activities before this date are
   * adjusted by the factor.
   */
  @IsISO8601()
  @Validate(IsAfter1970Constraint)
  date: string;

  /**
   * The number of shares held after the split per 1 share held before, for
   * example 4 for a 4:1 split or 0.1 for a 1:10 reverse split.
   *
   * Only the quantity of activities is adjusted by this factor. Market data is
   * already split-adjusted by the data providers and must not be adjusted
   * again.
   */
  @IsNumber()
  @Validate(IsSplitFactorConstraint)
  factor: number;
}
