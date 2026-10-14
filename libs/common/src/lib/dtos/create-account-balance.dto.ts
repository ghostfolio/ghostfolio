import { IsNotInTheFutureConstraint } from '@ghostfolio/common/validator-constraints/is-not-in-the-future';

import { IsISO8601, IsNumber, IsUUID, Validate } from 'class-validator';

export class CreateAccountBalanceDto {
  @IsUUID()
  accountId: string;

  @IsNumber()
  balance: number;

  @IsISO8601()
  @Validate(IsNotInTheFutureConstraint)
  date: string;
}
