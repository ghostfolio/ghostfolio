import { IsAfter1970Constraint } from '@ghostfolio/common/validator-constraints/is-after-1970';
import { IsSplitRatioConstraint } from '@ghostfolio/common/validator-constraints/is-split-ratio';

import { IsInt, IsISO8601, Validate } from 'class-validator';

export class CreateAssetProfileSplitDto {
  /**
   * The date the split becomes effective. Activities before this date are
   * adjusted by the ratio.
   */
  @IsISO8601()
  @Validate(IsAfter1970Constraint)
  date: string;

  /**
   * The number of shares held before the split, for example 1 for a 4:1 split
   * or 10 for a 1:10 reverse split.
   */
  @IsInt()
  denominator: number;

  /**
   * The number of shares held after the split, for example 4 for a 4:1 split
   * or 1 for a 1:10 reverse split.
   *
   * The resulting split factor is numerator / denominator. Both parts are kept
   * so that the ratio stays exact, for example 1/3 for a 1:3 reverse split.
   *
   * Only the quantity of activities is adjusted by this ratio. Market data is
   * already split-adjusted by the data providers and must not be adjusted
   * again.
   */
  @IsInt()
  @Validate(IsSplitRatioConstraint)
  numerator: number;
}
