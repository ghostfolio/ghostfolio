import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { ConflictException, ForbiddenException } from '@nestjs/common';

import { BudgetsService } from './budgets.service';

describe('BudgetsService', () => {
  const userId = 'user-1';
  const accountId = 'account-1';
  const categoryId = 'category-1';
  const budgetId = 'budget-1';
  const createdAt = new Date('2026-06-23T00:00:00.000Z');
  const updatedAt = new Date('2026-06-23T00:00:00.000Z');

  let budgetsService: BudgetsService;
  let prismaService: {
    account: {
      findFirst: jest.Mock;
    };
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
      create: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      account: {
        findFirst: jest.fn()
      },
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
        create: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
      }
    };

    budgetsService = new BudgetsService(
      prismaService as unknown as PrismaService
    );
  });

  it('lists budgets for a month and includes spent and remaining amounts', async () => {
    prismaService.budget.findMany.mockResolvedValue([
      {
        account: {
          balance: 0,
          createdAt,
          id: accountId,
          isExcluded: false,
          name: 'Checking',
          updatedAt,
          userId
        },
        accountId,
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
        name: 'Food shop',
        type: 'EXPENSE',
        updatedAt,
        userId
      },
      {
        account: null,
        accountId: null,
        amount: 200,
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
        id: 'budget-2',
        month: new Date('2026-06-01T00:00:00.000Z'),
        name: 'Emergency fund',
        type: 'CASH_SAVINGS',
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
      include: { account: true, category: true },
      orderBy: { name: 'asc' },
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
          account: {
            balance: 0,
            createdAt,
            id: accountId,
            isExcluded: false,
            name: 'Checking',
            updatedAt,
            userId
          },
          accountId,
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
          name: 'Food shop',
          remaining: 375,
          spent: 125,
          type: 'EXPENSE',
          updatedAt
        },
        {
          amount: 200,
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
          id: 'budget-2',
          month: '2026-06',
          name: 'Emergency fund',
          remaining: 200,
          spent: 0,
          type: 'CASH_SAVINGS',
          updatedAt
        }
      ],
      totalBudgeted: 700,
      totalMonthlySavings: 200,
      totalPlannedSpend: 500,
      totalRemaining: 575,
      totalSpent: 125
    });
  });

  it('lists expense categories for the current user', async () => {
    prismaService.expenseCategory.findMany.mockResolvedValue([
      {
        color: '#0055aa',
        createdAt,
        id: categoryId,
        name: 'Groceries',
        updatedAt,
        userId
      }
    ]);

    const response = await budgetsService.getCategories({ userId });

    expect(prismaService.expenseCategory.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      where: { userId }
    });
    expect(response).toEqual([
      {
        color: '#0055aa',
        createdAt,
        id: categoryId,
        name: 'Groceries',
        updatedAt
      }
    ]);
  });

  it('creates an expense category for the current user', async () => {
    prismaService.expenseCategory.findFirst.mockResolvedValue(null);
    prismaService.expenseCategory.create.mockResolvedValue({
      color: '#0055aa',
      createdAt,
      id: categoryId,
      name: 'Groceries',
      updatedAt,
      userId
    });

    const response = await budgetsService.createCategory({
      data: {
        color: '#0055aa',
        name: 'Groceries'
      },
      userId
    });

    expect(prismaService.expenseCategory.findFirst).toHaveBeenCalledWith({
      where: {
        name: 'Groceries',
        userId
      }
    });
    expect(prismaService.expenseCategory.create).toHaveBeenCalledWith({
      data: {
        color: '#0055aa',
        name: 'Groceries',
        user: { connect: { id: userId } }
      }
    });
    expect(response).toEqual({
      color: '#0055aa',
      createdAt,
      id: categoryId,
      name: 'Groceries',
      updatedAt
    });
  });

  it('rejects duplicate category names for the current user', async () => {
    prismaService.expenseCategory.findFirst.mockResolvedValue({
      id: categoryId,
      name: 'Groceries',
      userId
    });

    await expect(
      budgetsService.createCategory({
        data: {
          name: 'Groceries'
        },
        userId
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates only categories owned by the current user', async () => {
    prismaService.expenseCategory.findFirst
      .mockResolvedValueOnce({
        id: categoryId,
        userId
      })
      .mockResolvedValueOnce(null);
    prismaService.expenseCategory.update.mockResolvedValue({
      color: '#aa5500',
      createdAt,
      id: categoryId,
      name: 'Food',
      updatedAt,
      userId
    });

    const response = await budgetsService.updateCategory({
      data: {
        color: '#aa5500',
        id: categoryId,
        name: 'Food'
      },
      id: categoryId,
      userId
    });

    expect(prismaService.expenseCategory.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        id: categoryId,
        userId
      }
    });
    expect(prismaService.expenseCategory.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        name: 'Food',
        userId
      }
    });
    expect(prismaService.expenseCategory.update).toHaveBeenCalledWith({
      data: {
        color: '#aa5500',
        name: 'Food'
      },
      where: { id: categoryId }
    });
    expect(response).toEqual({
      color: '#aa5500',
      createdAt,
      id: categoryId,
      name: 'Food',
      updatedAt
    });
  });

  it('deletes only categories owned by the current user', async () => {
    prismaService.expenseCategory.findFirst.mockResolvedValue({
      id: categoryId,
      userId
    });
    prismaService.expenseCategory.delete.mockResolvedValue({
      id: categoryId
    });

    await budgetsService.deleteCategory({ id: categoryId, userId });

    expect(prismaService.expenseCategory.delete).toHaveBeenCalledWith({
      where: { id: categoryId }
    });
  });

  it('creates a budget for a category owned by the current user', async () => {
    prismaService.expenseCategory.findFirst.mockResolvedValue({
      id: categoryId,
      userId
    });
    prismaService.account.findFirst.mockResolvedValue({
      id: accountId,
      userId
    });
    prismaService.budget.create.mockResolvedValue({
      account: {
        balance: 0,
        createdAt,
        id: accountId,
        isExcluded: false,
        name: 'Checking',
        updatedAt,
        userId
      },
      accountId,
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
      name: 'Train pass',
      type: 'EXPENSE',
      updatedAt,
      userId
    });

    const response = await budgetsService.createBudget({
      data: {
        accountId,
        amount: 250,
        categoryId,
        currency: 'USD',
        month: '2026-06',
        name: 'Train pass',
        type: 'EXPENSE'
      },
      userId
    });

    expect(prismaService.account.findFirst).toHaveBeenCalledWith({
      where: {
        id: accountId,
        userId
      }
    });
    expect(prismaService.budget.create).toHaveBeenCalledWith({
      data: {
        account: {
          connect: {
            id_userId: { id: accountId, userId }
          }
        },
        amount: 250,
        category: { connect: { id: categoryId } },
        currency: 'USD',
        month: new Date('2026-06-01T00:00:00.000Z'),
        name: 'Train pass',
        type: 'EXPENSE',
        user: { connect: { id: userId } }
      },
      include: { account: true, category: true }
    });
    expect(response.remaining).toBe(250);
    expect(response.spent).toBe(0);
  });

  it('rejects a budget account not owned by the current user', async () => {
    prismaService.expenseCategory.findFirst.mockResolvedValue({
      id: categoryId,
      userId
    });
    prismaService.account.findFirst.mockResolvedValue(null);

    await expect(
      budgetsService.createBudget({
        data: {
          accountId,
          amount: 250,
          categoryId,
          currency: 'USD',
          month: '2026-06',
          name: 'Train pass',
          type: 'EXPENSE'
        },
        userId
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
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
      account: null,
      accountId: null,
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
      name: 'Train pass',
      type: 'EXPENSE',
      updatedAt,
      userId
    });

    const response = await budgetsService.updateBudget({
      data: {
        amount: 300,
        categoryId,
        currency: 'USD',
        id: budgetId,
        month: '2026-06',
        name: 'Train pass',
        type: 'EXPENSE'
      },
      id: budgetId,
      userId
    });

    expect(prismaService.budget.update).toHaveBeenCalledWith({
      data: {
        account: { disconnect: true },
        amount: 300,
        category: { connect: { id: categoryId } },
        currency: 'USD',
        month: new Date('2026-06-01T00:00:00.000Z'),
        name: 'Train pass',
        type: 'EXPENSE'
      },
      include: { account: true, category: true },
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
          month: '2026-06',
          name: 'Train pass',
          type: 'EXPENSE'
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
