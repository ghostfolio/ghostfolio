import { IsValidAccountBalanceDateConstraint } from '@ghostfolio/common/validator-constraints/is-valid-account-balance-date';

import { IsISO8601, IsNumber, IsUUID, Validate } from 'class-validator';

export class CreateAccountBalanceDto {
  @IsUUID()
  accountId: string;

  @IsNumber()
  balance: number;

  @IsISO8601()
  @Validate(IsValidAccountBalanceDateConstraint)
  date: string;
}
