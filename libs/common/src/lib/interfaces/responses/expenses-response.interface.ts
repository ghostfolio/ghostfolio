import { Account, Tag } from '@prisma/client';

export interface ExpenseResponse {
  account?: Account;
  accountId?: string;
  amount: number;
  categoryId?: string;
  comment?: string;
  createdAt: Date;
  currency: string;
  date: Date;
  id: string;
  merchant?: string;
  tags: Tag[];
  updatedAt: Date;
}

export interface ExpensesResponse {
  count: number;
  expenses: ExpenseResponse[];
}
