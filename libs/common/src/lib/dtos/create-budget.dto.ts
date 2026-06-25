import { IsCurrencyCode } from '@ghostfolio/common/validators/is-currency-code';

import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min
} from 'class-validator';

export const MANUAL_BUDGET_TYPES = [
  'EXPENSE',
  'CASH_SAVINGS',
  'INVESTMENT_SAVINGS'
] as const;

export type ManualBudgetType = (typeof MANUAL_BUDGET_TYPES)[number];

export class CreateBudgetDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  categoryId: string;

  @IsCurrencyCode()
  currency: string;

  @Matches(/^\d{4}-\d{2}$/)
  month: string;

  @IsString()
  name: string;

  @IsIn(MANUAL_BUDGET_TYPES)
  type: ManualBudgetType;
}
