import { IsISO8601, IsNumber, Validate } from 'class-validator';

import { IsSplitFactorConstraint } from '../validator-constraints/is-split-factor';

export class CreateAssetProfileSplitDto {
  @IsISO8601()
  date: string;

  @IsNumber()
  @Validate(IsSplitFactorConstraint)
  factor: number;
}
