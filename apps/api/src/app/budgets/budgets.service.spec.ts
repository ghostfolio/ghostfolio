import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { ConflictException, ForbiddenException } from '@nestjs/common';

import { BudgetsService } from './budgets.service';

describe('BudgetsService', () => {
  const userId = 'user-1';
  const categoryId = 'category-1';
  const budgetId = 'budget-1';
  const createdAt = new Date('2026-06-23T00:00:00.000Z');
  const updatedAt = new Date('2026-06-23T00:00:00.000Z');

  let budgetsService: BudgetsService;
  let prismaService: {
    budget: {
      create: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    expense: {
      groupBy: jest.Mock;
    };
    expenseCategory: {
      findFirst: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      budget: {
        create: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
      },
      expense: {
        groupBy: jest.fn()
      },
      expenseCategory: {
        findFirst: jest.fn()
      }
    };

    budgetsService = new BudgetsService(
      prismaService as unknown as PrismaService
    );
  });

  it('lists budgets for a month and includes spent and remaining amounts', async () => {
    prismaService.budget.findMany.mockResolvedValue([
      {
        amount: 500,
        category: {
          color: '#0055aa',
          createdAt,
          id: categoryId,
          name: 'Groceries',
          updatedAt
        },
        categoryId,
        createdAt,
        currency: 'USD',
        id: budgetId,
        month: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt,
        userId
      }
    ]);
    prismaService.expense.groupBy.mockResolvedValue([
      {
        _sum: { amount: 125 },
        categoryId
      }
    ]);

    const response = await budgetsService.getBudgets({
      month: '2026-06',
      userId
    });

    expect(prismaService.budget.findMany).toHaveBeenCalledWith({
      include: { category: true },
      orderBy: { category: { name: 'asc' } },
      where: {
        month: new Date('2026-06-01T00:00:00.000Z'),
        userId
      }
    });
    expect(prismaService.expense.groupBy).toHaveBeenCalledWith({
      by: ['categoryId'],
      where: {
        categoryId: { in: [categoryId] },
        date: {
          gte: new Date('2026-06-01T00:00:00.000Z'),
          lt: new Date('2026-07-01T00:00:00.000Z')
        },
        userId
      },
      _sum: { amount: true }
    });
    expect(response).toEqual({
      budgets: [
        {
          amount: 500,
          category: {
            color: '#0055aa',
            createdAt,
            id: categoryId,
            name: 'Groceries',
            updatedAt
          },
          categoryId,
          createdAt,
          currency: 'USD',
          id: budgetId,
          month: '2026-06',
          remaining: 375,
          spent: 125,
          updatedAt
        }
      ],
      totalBudgeted: 500,
      totalRemaining: 375,
      totalSpent: 125
    });
  });

  it('creates a budget for a category owned by the current user', async () => {
    prismaService.expenseCategory.findFirst.mockResolvedValue({
      id: categoryId,
      userId
    });
    prismaService.budget.findFirst.mockResolvedValue(null);
    prismaService.budget.create.mockResolvedValue({
      amount: 250,
      category: {
        createdAt,
        id: categoryId,
        name: 'Transport',
        updatedAt
      },
      categoryId,
      createdAt,
      currency: 'USD',
      id: budgetId,
      month: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt,
      userId
    });

    const response = await budgetsService.createBudget({
      data: {
        amount: 250,
        categoryId,
        currency: 'USD',
        month: '2026-06'
      },
      userId
    });

    expect(prismaService.budget.create).toHaveBeenCalledWith({
      data: {
        amount: 250,
        category: { connect: { id: categoryId } },
        currency: 'USD',
        month: new Date('2026-06-01T00:00:00.000Z'),
        user: { connect: { id: userId } }
      },
      include: { category: true }
    });
    expect(response.remaining).toBe(250);
    expect(response.spent).toBe(0);
  });

  it('rejects duplicate budgets for the same category and month', async () => {
    prismaService.expenseCategory.findFirst.mockResolvedValue({
      id: categoryId,
      userId
    });
    prismaService.budget.findFirst.mockResolvedValue({
      id: budgetId
    });

    await expect(
      budgetsService.createBudget({
        data: {
          amount: 250,
          categoryId,
          currency: 'USD',
          month: '2026-06'
        },
        userId
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates only a budget owned by the current user', async () => {
    prismaService.expenseCategory.findFirst.mockResolvedValue({
      id: categoryId,
      userId
    });
    prismaService.budget.findFirst.mockResolvedValue({
      id: budgetId,
      userId
    });
    prismaService.budget.update.mockResolvedValue({
      amount: 300,
      category: {
        createdAt,
        id: categoryId,
        name: 'Transport',
        updatedAt
      },
      categoryId,
      createdAt,
      currency: 'USD',
      id: budgetId,
      month: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt,
      userId
    });

    const response = await budgetsService.updateBudget({
      data: {
        amount: 300,
        categoryId,
        currency: 'USD',
        id: budgetId,
        month: '2026-06'
      },
      id: budgetId,
      userId
    });

    expect(prismaService.budget.update).toHaveBeenCalledWith({
      data: {
        amount: 300,
        category: { connect: { id: categoryId } },
        currency: 'USD',
        month: new Date('2026-06-01T00:00:00.000Z')
      },
      include: { category: true },
      where: { id: budgetId }
    });
    expect(response.amount).toBe(300);
  });

  it('throws when updating a budget not owned by the current user', async () => {
    prismaService.budget.findFirst.mockResolvedValue(null);

    await expect(
      budgetsService.updateBudget({
        data: {
          amount: 300,
          categoryId,
          currency: 'USD',
          id: budgetId,
          month: '2026-06'
        },
        id: budgetId,
        userId
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deletes only a budget owned by the current user', async () => {
    prismaService.budget.findFirst.mockResolvedValue({
      id: budgetId,
      userId
    });
    prismaService.budget.delete.mockResolvedValue({
      id: budgetId
    });

    await budgetsService.deleteBudget({ id: budgetId, userId });

    expect(prismaService.budget.delete).toHaveBeenCalledWith({
      where: { id: budgetId }
    });
  });
});
