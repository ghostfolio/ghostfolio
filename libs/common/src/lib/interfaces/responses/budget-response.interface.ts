import { ExpenseCategoryResponse } from './expense-category-response.interface';

export interface BudgetResponse {
  amount: number;
  category: ExpenseCategoryResponse;
  categoryId: string;
  createdAt: Date;
  currency: string;
  id: string;
  month: string;
  remaining: number;
  spent: number;
  updatedAt: Date;
}

export interface BudgetsResponse {
  budgets: BudgetResponse[];
  totalBudgeted: number;
  totalRemaining: number;
  totalSpent: number;
}
