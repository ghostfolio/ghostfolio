import { DataService } from '@ghostfolio/ui/services';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { GfManageBudgetCategoriesDialogComponent } from './manage-budget-categories-dialog.component';

jest.mock('@ionic/angular/standalone', () => {
  const { Component, Input } = require('@angular/core');

  @Component({
    selector: 'ion-icon',
    template: ''
  })
  class IonIcon {
    @Input() public name: string;
  }

  return { IonIcon };
});

jest.mock('ionicons', () => {
  return {
    addIcons: jest.fn()
  };
});

jest.mock('ionicons/icons', () => {
  return {
    createOutline: {},
    trashOutline: {}
  };
});

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

    expect(
      fixture.nativeElement.querySelector(
        '[aria-label="Edit category"] ion-icon'
      )
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[aria-label="Delete category"] ion-icon'
      )
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('editdelete');
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

  it('resets the category form interaction state after creating a category', async () => {
    await fixture.whenStable();

    component.categoryForm.setValue({
      color: '#0055aa',
      name: 'Transport'
    });
    component.categoryForm.markAllAsTouched();

    component.onSubmit();
    await fixture.whenStable();

    expect(component.categoryForm.controls.name.value).toBe('');
    expect(component.categoryForm.controls.name.touched).toBe(false);
    expect(component.categoryForm.controls.name.dirty).toBe(false);
  });

  it('does not show the name field as invalid after creating a category', async () => {
    await fixture.whenStable();

    component.categoryForm.setValue({
      color: '#0055aa',
      name: 'Transport'
    });

    const form: HTMLFormElement =
      fixture.nativeElement.querySelector('.category-form');

    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(
        '.category-name-field.mat-form-field-invalid'
      )
    ).toBeNull();
  });

  it('updates the color form value from the color picker', async () => {
    await fixture.whenStable();

    const colorInput: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[type="color"]'
    );

    colorInput.value = '#aa5500';
    colorInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.categoryForm.controls.color.value).toBe('#aa5500');
    expect(fixture.nativeElement.textContent).toContain('#aa5500');
  });

  it('clears the selected category color', async () => {
    await fixture.whenStable();

    component.onClearColor();

    expect(component.categoryForm.controls.color.value).toBe('');
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
