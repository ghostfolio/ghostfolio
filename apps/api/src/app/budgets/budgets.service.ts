import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { CreateBudgetDto, UpdateBudgetDto } from '@ghostfolio/common/dtos';
import {
  BudgetResponse,
  BudgetsResponse,
  ExpenseCategoryResponse
} from '@ghostfolio/common/interfaces';

import {
  ConflictException,
  ForbiddenException,
  Injectable
} from '@nestjs/common';

@Injectable()
export class BudgetsService {
  public constructor(private readonly prismaService: PrismaService) {}

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

    const month = this.parseBudgetMonth(data.month);

    const existingBudget = await this.prismaService.budget.findFirst({
      where: {
        categoryId: data.categoryId,
        month,
        userId
      }
    });

    if (existingBudget) {
      throw new ConflictException();
    }

    const budget = await this.prismaService.budget.create({
      data: {
        amount: data.amount,
        category: { connect: { id: data.categoryId } },
        currency: data.currency,
        month,
        user: { connect: { id: userId } }
      },
      include: { category: true }
    });

    return this.toBudgetResponse({ budget, spent: 0 });
  }

  public async deleteBudget({ id, userId }: { id: string; userId: string }) {
    await this.validateBudgetOwnership({ id, userId });

    return this.prismaService.budget.delete({
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
      include: { category: true },
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

    return categories.map(({ color, createdAt, id, name, updatedAt }) => {
      return { color, createdAt, id, name, updatedAt };
    });
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
      include: { category: true },
      orderBy: { category: { name: 'asc' } },
      where: {
        month: budgetMonth,
        userId
      }
    });

    const categoryIds = budgets.map(({ categoryId }) => categoryId);
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
      return this.toBudgetResponse({
        budget,
        spent: spentByCategoryId.get(budget.categoryId) ?? 0
      });
    });

    return {
      budgets: budgetResponses,
      totalBudgeted: budgetResponses.reduce((sum, { amount }) => {
        return sum + amount;
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

    const month = this.parseBudgetMonth(data.month);

    const budget = await this.prismaService.budget.update({
      data: {
        amount: data.amount,
        category: { connect: { id: data.categoryId } },
        currency: data.currency,
        month
      },
      include: { category: true },
      where: { id }
    });

    return this.toBudgetResponse({ budget, spent: 0 });
  }

  private formatBudgetMonth(month: Date): string {
    return month.toISOString().slice(0, 7);
  }

  private getNextMonth(month: Date): Date {
    return new Date(
      Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1)
    );
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
      updatedAt: Date;
    };
    spent: number;
  }): BudgetResponse {
    return {
      amount: budget.amount,
      category: budget.category,
      categoryId: budget.categoryId,
      createdAt: budget.createdAt,
      currency: budget.currency,
      id: budget.id,
      month: this.formatBudgetMonth(budget.month),
      remaining: budget.amount - spent,
      spent,
      updatedAt: budget.updatedAt
    };
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
}
