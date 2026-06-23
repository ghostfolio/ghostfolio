import { getPermissions, permissions } from './permissions';

describe('permissions', () => {
  it('grants budget and expense permissions to users and admins only', () => {
    const featurePermissions = [
      permissions.createBudget,
      permissions.createExpense,
      permissions.createExpenseCategory,
      permissions.deleteBudget,
      permissions.deleteExpense,
      permissions.deleteExpenseCategory,
      permissions.readBudgets,
      permissions.readExpenses,
      permissions.readExpenseCategories,
      permissions.updateBudget,
      permissions.updateExpense,
      permissions.updateExpenseCategory
    ];

    expect(getPermissions('ADMIN')).toEqual(
      expect.arrayContaining(featurePermissions)
    );
    expect(getPermissions('USER')).toEqual(
      expect.arrayContaining(featurePermissions)
    );

    for (const permission of featurePermissions) {
      expect(getPermissions('DEMO')).not.toContain(permission);
    }
  });
});
