import { DataService } from '@ghostfolio/ui/services';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import {
  CreateOrUpdateBudgetDialogData,
  GfCreateOrUpdateBudgetDialogComponent
} from './create-or-update-budget-dialog.component';

(global as any).$localize = (
  messageParts: TemplateStringsArray,
  ...expressions: any[]
) => {
  return String.raw({ raw: messageParts }, ...expressions);
};

describe('GfCreateOrUpdateBudgetDialogComponent', () => {
  let component: GfCreateOrUpdateBudgetDialogComponent;
  let dataService: jest.Mocked<
    Pick<
      DataService,
      | 'createBudget'
      | 'fetchAccounts'
      | 'fetchExpenseCategories'
      | 'updateBudget'
    >
  >;
  let dialogRef: jest.Mocked<
    Pick<MatDialogRef<GfCreateOrUpdateBudgetDialogComponent>, 'close'>
  >;
  let fixture: ComponentFixture<GfCreateOrUpdateBudgetDialogComponent>;

  const setup = async (dialogData: CreateOrUpdateBudgetDialogData) => {
    dataService = {
      createBudget: jest.fn().mockReturnValue(
        of({
          accountId: 'checking',
          amount: 500,
          categoryId: 'food',
          id: 'budget-1',
          month: '2026-06',
          name: 'Food shop',
          remaining: 500,
          spent: 0,
          type: 'EXPENSE'
        })
      ),
      fetchAccounts: jest.fn().mockReturnValue(
        of({
          accounts: [
            {
              balance: 0,
              createdAt: new Date('2026-06-01'),
              id: 'checking',
              isExcluded: false,
              name: 'Checking',
              updatedAt: new Date('2026-06-01'),
              userId: 'user-1'
            }
          ]
        })
      ),
      fetchExpenseCategories: jest.fn().mockReturnValue(
        of([
          {
            color: '#0055aa',
            createdAt: new Date('2026-06-01'),
            id: 'food',
            name: 'Food',
            updatedAt: new Date('2026-06-01')
          }
        ])
      ),
      updateBudget: jest.fn().mockReturnValue(
        of({
          accountId: 'checking',
          amount: 650,
          categoryId: 'food',
          id: 'budget-1',
          month: '2026-06',
          name: 'Food shop',
          remaining: 650,
          spent: 0,
          type: 'EXPENSE'
        })
      )
    };
    dialogRef = {
      close: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [GfCreateOrUpdateBudgetDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: DataService,
          useValue: dataService
        },
        {
          provide: MatDialogRef,
          useValue: dialogRef
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: dialogData
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GfCreateOrUpdateBudgetDialogComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges();
  };

  it('creates a budget and closes with refresh', async () => {
    await setup({
      budget: undefined,
      currency: 'USD',
      month: '2026-06'
    });

    component.budgetForm.setValue({
      accountId: 'checking',
      amount: 500,
      categoryId: 'food',
      month: '2026-06',
      name: 'Food shop',
      type: 'EXPENSE'
    });

    component.onSubmit();
    await fixture.whenStable();

    expect(dataService.fetchExpenseCategories).toHaveBeenCalled();
    expect(dataService.fetchAccounts).toHaveBeenCalled();
    expect(dataService.createBudget).toHaveBeenCalledWith({
      accountId: 'checking',
      amount: 500,
      categoryId: 'food',
      currency: 'USD',
      month: '2026-06',
      name: 'Food shop',
      type: 'EXPENSE'
    });
    expect(dialogRef.close).toHaveBeenCalledWith({ refresh: true });
  });

  it('updates a budget and closes with refresh', async () => {
    await setup({
      budget: {
        accountId: 'checking',
        amount: 500,
        category: {
          id: 'food',
          name: 'Food'
        },
        categoryId: 'food',
        createdAt: new Date('2026-06-01'),
        currency: 'USD',
        id: 'budget-1',
        month: '2026-06',
        name: 'Food shop',
        remaining: 500,
        spent: 0,
        type: 'EXPENSE',
        updatedAt: new Date('2026-06-01')
      },
      currency: 'USD',
      month: '2026-06'
    });

    component.budgetForm.setValue({
      accountId: '',
      amount: 650,
      categoryId: 'food',
      month: '2026-06',
      name: 'Food shop',
      type: 'EXPENSE'
    });

    component.onSubmit();
    await fixture.whenStable();

    expect(dataService.updateBudget).toHaveBeenCalledWith({
      budget: {
        amount: 650,
        categoryId: 'food',
        currency: 'USD',
        id: 'budget-1',
        month: '2026-06',
        name: 'Food shop',
        type: 'EXPENSE'
      },
      id: 'budget-1'
    });
    expect(dialogRef.close).toHaveBeenCalledWith({ refresh: true });
  });
});
