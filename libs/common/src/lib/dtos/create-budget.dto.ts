import { IsCurrencyCode } from '@ghostfolio/common/validators/is-currency-code';

import { IsNumber, IsString, Matches, Min } from 'class-validator';

export class CreateBudgetDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  categoryId: string;

  @IsCurrencyCode()
  currency: string;

  @Matches(/^\d{4}-\d{2}$/)
  month: string;
}
