import { DataService } from '@ghostfolio/ui/services';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { GfCreateOrUpdateBudgetDialogComponent } from './create-or-update-budget-dialog.component';

describe('GfCreateOrUpdateBudgetDialogComponent', () => {
  let component: GfCreateOrUpdateBudgetDialogComponent;
  let dataService: jest.Mocked<
    Pick<DataService, 'createBudget' | 'updateBudget'>
  >;
  let dialogRef: jest.Mocked<
    Pick<MatDialogRef<GfCreateOrUpdateBudgetDialogComponent>, 'close'>
  >;
  let fixture: ComponentFixture<GfCreateOrUpdateBudgetDialogComponent>;

  beforeEach(async () => {
    dataService = {
      createBudget: jest.fn().mockReturnValue(
        of({
          amount: 500,
          categoryId: 'food',
          id: 'budget-1',
          month: '2026-06',
          remaining: 500,
          spent: 0
        })
      ),
      updateBudget: jest.fn().mockReturnValue(
        of({
          amount: 650,
          categoryId: 'food',
          id: 'budget-1',
          month: '2026-06',
          remaining: 650,
          spent: 0
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
          useValue: {
            budget: undefined,
            month: '2026-06'
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GfCreateOrUpdateBudgetDialogComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges();
  });

  it('creates a budget and closes with refresh', async () => {
    component.budgetForm.setValue({
      amount: 500,
      categoryId: 'food',
      month: '2026-06'
    });

    component.onSubmit();
    await fixture.whenStable();

    expect(dataService.createBudget).toHaveBeenCalledWith({
      amount: 500,
      categoryId: 'food',
      month: '2026-06'
    });
    expect(dialogRef.close).toHaveBeenCalledWith({ refresh: true });
  });
});
