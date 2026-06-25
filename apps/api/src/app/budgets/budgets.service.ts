import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import {
  CreateBudgetDto,
  CreateExpenseCategoryDto,
  UpdateBudgetDto,
  UpdateExpenseCategoryDto
} from '@ghostfolio/common/dtos';
import {
  BudgetResponse,
  type BudgetType,
  BudgetsResponse,
  ExpenseCategoryResponse
} from '@ghostfolio/common/interfaces';

import {
  ConflictException,
  ForbiddenException,
  Injectable
} from '@nestjs/common';
import type { Account } from '@prisma/client';

@Injectable()
export class BudgetsService {
  private static readonly SAVINGS_BUDGET_TYPES: BudgetType[] = [
    'CASH_SAVINGS',
    'INVESTMENT_SAVINGS'
  ];

  public constructor(private readonly prismaService: PrismaService) {}

  public async createCategory({
    data,
    userId
  }: {
    data: CreateExpenseCategoryDto;
    userId: string;
  }): Promise<ExpenseCategoryResponse> {
    await this.validateCategoryNameAvailable({
      name: data.name,
      userId
    });

    const category = await this.prismaService.expenseCategory.create({
      data: {
        color: data.color,
        name: data.name,
        user: { connect: { id: userId } }
      }
    });

    return this.toExpenseCategoryResponse(category);
  }

  public async createBudget({
    data,
    userId
  }: {
    data: CreateBudgetDto;
    userId: string;
  }): Promise<BudgetResponse> {
    await this.validateCategoryOwnership({
      categoryId: data.categoryId,
      userId
    });

    if (data.accountId) {
      await this.validateAccountOwnership({
        accountId: data.accountId,
        userId
      });
    }

    const month = this.parseBudgetMonth(data.month);

    const budget = await this.prismaService.budget.create({
      data: {
        ...(data.accountId
          ? {
              account: {
                connect: {
                  id_userId: { id: data.accountId, userId }
                }
              }
            }
          : {}),
        amount: data.amount,
        category: { connect: { id: data.categoryId } },
        currency: data.currency,
        month,
        name: data.name,
        type: data.type,
        user: { connect: { id: userId } }
      },
      include: { account: true, category: true }
    });

    return this.toBudgetResponse({ budget, spent: 0 });
  }

  public async deleteBudget({ id, userId }: { id: string; userId: string }) {
    await this.validateBudgetOwnership({ id, userId });

    return this.prismaService.budget.delete({
      where: { id }
    });
  }

  public async deleteCategory({ id, userId }: { id: string; userId: string }) {
    await this.validateCategoryOwnership({ categoryId: id, userId });

    return this.prismaService.expenseCategory.delete({
      where: { id }
    });
  }

  public async getBudget({
    id,
    userId
  }: {
    id: string;
    userId: string;
  }): Promise<BudgetResponse> {
    const budget = await this.prismaService.budget.findFirst({
      include: { account: true, category: true },
      where: { id, userId }
    });

    if (!budget) {
      throw new ForbiddenException();
    }

    const spent = await this.getSpentForBudget({
      categoryId: budget.categoryId,
      month: budget.month,
      userId
    });

    return this.toBudgetResponse({ budget, spent });
  }

  public async getCategories({
    userId
  }: {
    userId: string;
  }): Promise<ExpenseCategoryResponse[]> {
    const categories = await this.prismaService.expenseCategory.findMany({
      orderBy: { name: 'asc' },
      where: { userId }
    });

    return categories.map((category) =>
      this.toExpenseCategoryResponse(category)
    );
  }

  public async getBudgets({
    month,
    userId
  }: {
    month: string;
    userId: string;
  }): Promise<BudgetsResponse> {
    const budgetMonth = this.parseBudgetMonth(month);
    const nextMonth = this.getNextMonth(budgetMonth);

    const budgets = await this.prismaService.budget.findMany({
      include: { account: true, category: true },
      orderBy: { name: 'asc' },
      where: {
        month: budgetMonth,
        userId
      }
    });

    const categoryIds = Array.from(
      new Set(budgets.map(({ categoryId }) => categoryId))
    );
    const expenseSums = categoryIds.length
      ? await this.prismaService.expense.groupBy({
          by: ['categoryId'],
          where: {
            categoryId: { in: categoryIds },
            date: {
              gte: budgetMonth,
              lt: nextMonth
            },
            userId
          },
          _sum: { amount: true }
        })
      : [];

    const spentByCategoryId = new Map(
      expenseSums.map(({ _sum, categoryId }) => {
        return [categoryId, _sum.amount ?? 0];
      })
    );

    const budgetResponses = budgets.map((budget) => {
      const isExpenseBudget = this.isPlannedSpendBudgetType(budget.type);

      return this.toBudgetResponse({
        budget,
        spent: isExpenseBudget
          ? (spentByCategoryId.get(budget.categoryId) ?? 0)
          : 0
      });
    });

    return {
      budgets: budgetResponses,
      totalBudgeted: budgetResponses.reduce((sum, { amount }) => {
        return sum + amount;
      }, 0),
      totalMonthlySavings: budgetResponses.reduce((sum, { amount, type }) => {
        return BudgetsService.SAVINGS_BUDGET_TYPES.includes(type)
          ? sum + amount
          : sum;
      }, 0),
      totalPlannedSpend: budgetResponses.reduce((sum, { amount, type }) => {
        return this.isPlannedSpendBudgetType(type) ? sum + amount : sum;
      }, 0),
      totalRemaining: budgetResponses.reduce((sum, { remaining }) => {
        return sum + remaining;
      }, 0),
      totalSpent: budgetResponses.reduce((sum, { spent }) => {
        return sum + spent;
      }, 0)
    };
  }

  public async updateBudget({
    data,
    id,
    userId
  }: {
    data: UpdateBudgetDto;
    id: string;
    userId: string;
  }): Promise<BudgetResponse> {
    await this.validateBudgetOwnership({ id, userId });
    await this.validateCategoryOwnership({
      categoryId: data.categoryId,
      userId
    });

    if (data.accountId) {
      await this.validateAccountOwnership({
        accountId: data.accountId,
        userId
      });
    }

    const month = this.parseBudgetMonth(data.month);

    const budget = await this.prismaService.budget.update({
      data: {
        account: data.accountId
          ? {
              connect: {
                id_userId: { id: data.accountId, userId }
              }
            }
          : { disconnect: true },
        amount: data.amount,
        category: { connect: { id: data.categoryId } },
        currency: data.currency,
        month,
        name: data.name,
        type: data.type
      },
      include: { account: true, category: true },
      where: { id }
    });

    return this.toBudgetResponse({ budget, spent: 0 });
  }

  public async updateCategory({
    data,
    id,
    userId
  }: {
    data: UpdateExpenseCategoryDto;
    id: string;
    userId: string;
  }): Promise<ExpenseCategoryResponse> {
    await this.validateCategoryOwnership({ categoryId: id, userId });
    await this.validateCategoryNameAvailable({
      categoryId: id,
      name: data.name,
      userId
    });

    const category = await this.prismaService.expenseCategory.update({
      data: {
        color: data.color,
        name: data.name
      },
      where: { id }
    });

    return this.toExpenseCategoryResponse(category);
  }

  private formatBudgetMonth(month: Date): string {
    return month.toISOString().slice(0, 7);
  }

  private getNextMonth(month: Date): Date {
    return new Date(
      Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1)
    );
  }

  private isPlannedSpendBudgetType(type: BudgetType) {
    return [
      'EXPENSE',
      'LIABILITY_AUTOMATIC',
      'YEARLY_EXPENSE_AUTOMATIC'
    ].includes(type);
  }

  private async getSpentForBudget({
    categoryId,
    month,
    userId
  }: {
    categoryId: string;
    month: Date;
    userId: string;
  }) {
    const [expenseSum] = await this.prismaService.expense.groupBy({
      by: ['categoryId'],
      where: {
        categoryId: { in: [categoryId] },
        date: {
          gte: month,
          lt: this.getNextMonth(month)
        },
        userId
      },
      _sum: { amount: true }
    });

    return expenseSum?._sum.amount ?? 0;
  }

  private parseBudgetMonth(month: string): Date {
    return new Date(`${month}-01T00:00:00.000Z`);
  }

  private toBudgetResponse({
    budget,
    spent
  }: {
    budget: {
      amount: number;
      account?: Account | null;
      accountId?: string | null;
      category: {
        color?: string;
        createdAt: Date;
        id: string;
        name: string;
        updatedAt: Date;
      };
      categoryId: string;
      createdAt: Date;
      currency: string;
      id: string;
      month: Date;
      name: string;
      type: BudgetType;
      updatedAt: Date;
    };
    spent: number;
  }): BudgetResponse {
    return {
      account: budget.account ?? undefined,
      accountId: budget.accountId ?? undefined,
      amount: budget.amount,
      category: budget.category,
      categoryId: budget.categoryId,
      createdAt: budget.createdAt,
      currency: budget.currency,
      id: budget.id,
      month: this.formatBudgetMonth(budget.month),
      name: budget.name || budget.category.name,
      remaining: budget.amount - spent,
      spent,
      type: budget.type,
      updatedAt: budget.updatedAt
    };
  }

  private toExpenseCategoryResponse({
    color,
    createdAt,
    id,
    name,
    updatedAt
  }: {
    color?: string;
    createdAt: Date;
    id: string;
    name: string;
    updatedAt: Date;
  }): ExpenseCategoryResponse {
    return { color, createdAt, id, name, updatedAt };
  }

  private async validateBudgetOwnership({
    id,
    userId
  }: {
    id: string;
    userId: string;
  }) {
    const budget = await this.prismaService.budget.findFirst({
      where: { id, userId }
    });

    if (!budget) {
      throw new ForbiddenException();
    }
  }

  private async validateAccountOwnership({
    accountId,
    userId
  }: {
    accountId: string;
    userId: string;
  }) {
    const account = await this.prismaService.account.findFirst({
      where: {
        id: accountId,
        userId
      }
    });

    if (!account) {
      throw new ForbiddenException();
    }
  }

  private async validateCategoryOwnership({
    categoryId,
    userId
  }: {
    categoryId: string;
    userId: string;
  }) {
    const category = await this.prismaService.expenseCategory.findFirst({
      where: {
        id: categoryId,
        userId
      }
    });

    if (!category) {
      throw new ForbiddenException();
    }
  }

  private async validateCategoryNameAvailable({
    categoryId,
    name,
    userId
  }: {
    categoryId?: string;
    name: string;
    userId: string;
  }) {
    const existingCategory = await this.prismaService.expenseCategory.findFirst(
      {
        where: {
          name,
          userId
        }
      }
    );

    if (existingCategory && existingCategory.id !== categoryId) {
      throw new ConflictException();
    }
  }
}
