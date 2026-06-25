import { ExpenseCategoryResponse } from './expense-category-response.interface';

export interface BudgetAccountResponse {
  id: string;
  name?: string;
}

export type BudgetType =
  | 'CASH_SAVINGS'
  | 'EXPENSE'
  | 'INVESTMENT_SAVINGS'
  | 'LIABILITY_AUTOMATIC'
  | 'YEARLY_EXPENSE_AUTOMATIC';

export interface BudgetResponse {
  account?: BudgetAccountResponse;
  accountId?: string;
  amount: number;
  category: ExpenseCategoryResponse;
  categoryId: string;
  createdAt: Date;
  currency: string;
  id: string;
  month: string;
  name: string;
  remaining: number;
  spent: number;
  type: BudgetType;
  updatedAt: Date;
}

export interface BudgetsResponse {
  budgets: BudgetResponse[];
  totalBudgeted: number;
  totalMonthlySavings: number;
  totalPlannedSpend: number;
  totalRemaining: number;
  totalSpent: number;
}
