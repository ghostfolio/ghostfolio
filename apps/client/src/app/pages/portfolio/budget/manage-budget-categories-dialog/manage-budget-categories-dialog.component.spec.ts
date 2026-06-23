import { DataService } from '@ghostfolio/ui/services';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { GfManageBudgetCategoriesDialogComponent } from './manage-budget-categories-dialog.component';

describe('GfManageBudgetCategoriesDialogComponent', () => {
  const createdAt = new Date('2026-06-01');
  const updatedAt = new Date('2026-06-01');

  let component: GfManageBudgetCategoriesDialogComponent;
  let dataService: jest.Mocked<
    Pick<
      DataService,
      | 'createExpenseCategory'
      | 'deleteExpenseCategory'
      | 'fetchExpenseCategories'
      | 'updateExpenseCategory'
    >
  >;
  let dialogRef: jest.Mocked<
    Pick<MatDialogRef<GfManageBudgetCategoriesDialogComponent>, 'close'>
  >;
  let fixture: ComponentFixture<GfManageBudgetCategoriesDialogComponent>;

  beforeEach(async () => {
    dataService = {
      createExpenseCategory: jest.fn().mockReturnValue(
        of({
          color: '#0055aa',
          createdAt,
          id: 'category-2',
          name: 'Transport',
          updatedAt
        })
      ),
      deleteExpenseCategory: jest.fn().mockReturnValue(of(undefined)),
      fetchExpenseCategories: jest.fn().mockReturnValue(
        of([
          {
            color: '#0055aa',
            createdAt,
            id: 'category-1',
            name: 'Groceries',
            updatedAt
          }
        ])
      ),
      updateExpenseCategory: jest.fn().mockReturnValue(
        of({
          color: '#aa5500',
          createdAt,
          id: 'category-1',
          name: 'Food',
          updatedAt
        })
      )
    };
    dialogRef = {
      close: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [GfManageBudgetCategoriesDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: DataService,
          useValue: dataService
        },
        {
          provide: MatDialogRef,
          useValue: dialogRef
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GfManageBudgetCategoriesDialogComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges();
  });

  it('loads expense categories', async () => {
    await fixture.whenStable();

    expect(dataService.fetchExpenseCategories).toHaveBeenCalled();
    expect(component.dataSource.data).toEqual([
      {
        color: '#0055aa',
        createdAt,
        id: 'category-1',
        name: 'Groceries',
        updatedAt
      }
    ]);
  });

  it('creates an expense category and reloads categories', async () => {
    await fixture.whenStable();

    component.categoryForm.setValue({
      color: '#0055aa',
      name: 'Transport'
    });

    component.onSubmit();
    await fixture.whenStable();

    expect(dataService.createExpenseCategory).toHaveBeenCalledWith({
      color: '#0055aa',
      name: 'Transport'
    });
    expect(dataService.fetchExpenseCategories).toHaveBeenCalledTimes(2);
  });

  it('updates an expense category and reloads categories', async () => {
    await fixture.whenStable();

    component.onEditCategory({
      color: '#0055aa',
      createdAt,
      id: 'category-1',
      name: 'Groceries',
      updatedAt
    });
    component.categoryForm.setValue({
      color: '#aa5500',
      name: 'Food'
    });

    component.onSubmit();
    await fixture.whenStable();

    expect(dataService.updateExpenseCategory).toHaveBeenCalledWith({
      category: {
        color: '#aa5500',
        id: 'category-1',
        name: 'Food'
      },
      id: 'category-1'
    });
    expect(dataService.fetchExpenseCategories).toHaveBeenCalledTimes(2);
  });

  it('deletes an expense category and reloads categories', async () => {
    await fixture.whenStable();

    component.onDeleteCategory('category-1');
    await fixture.whenStable();

    expect(dataService.deleteExpenseCategory).toHaveBeenCalledWith(
      'category-1'
    );
    expect(dataService.fetchExpenseCategories).toHaveBeenCalledTimes(2);
  });

  it('closes with a refresh result', () => {
    component.onClose();

    expect(dialogRef.close).toHaveBeenCalledWith({ refresh: true });
  });
});
