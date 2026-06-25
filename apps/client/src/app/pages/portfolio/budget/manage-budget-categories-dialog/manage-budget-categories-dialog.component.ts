import { ExpenseCategoryResponse } from '@ghostfolio/common/interfaces';
import { DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline } from 'ionicons/icons';

@Component({
  imports: [
    CommonModule,
    IonIcon,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    ReactiveFormsModule
  ],
  selector: 'gf-manage-budget-categories-dialog',
  styleUrls: ['./manage-budget-categories-dialog.scss'],
  templateUrl: './manage-budget-categories-dialog.html'
})
export class GfManageBudgetCategoriesDialogComponent implements OnInit {
  public categoryForm = new FormGroup({
    color: new FormControl<string>('#0055aa', {
      nonNullable: true,
      validators: [Validators.pattern(/^#[0-9a-fA-F]{6}$/)]
    }),
    name: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });
  public dataSource = new MatTableDataSource<ExpenseCategoryResponse>([]);
  public displayedColumns = ['name', 'color', 'actions'];
  public editingCategory: ExpenseCategoryResponse | undefined;
  public isLoading = true;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private dialogRef: MatDialogRef<GfManageBudgetCategoriesDialogComponent>
  ) {
    addIcons({ createOutline, trashOutline });
  }

  public ngOnInit() {
    this.fetchCategories();
  }

  public onCancelEdit(formDirective?: FormGroupDirective) {
    this.editingCategory = undefined;

    const formValue = {
      color: '#0055aa',
      name: ''
    };

    if (formDirective) {
      formDirective.resetForm(formValue);
    } else {
      this.categoryForm.reset(formValue);
    }
  }

  public onClose() {
    this.dialogRef.close({ refresh: true });
  }

  public onDeleteCategory(id: string) {
    this.dataService
      .deleteExpenseCategory(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.fetchCategories();
      });
  }

  public onEditCategory(category: ExpenseCategoryResponse) {
    this.editingCategory = category;
    this.categoryForm.setValue({
      color: category.color ?? '',
      name: category.name
    });
    this.categoryForm.markAsPristine();
    this.categoryForm.markAsUntouched();
  }

  public onClearColor() {
    this.categoryForm.controls.color.setValue('');
  }

  public onSubmit(formDirective?: FormGroupDirective) {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const category = this.toCategoryPayload();

    if (this.editingCategory) {
      this.dataService
        .updateExpenseCategory({
          category: {
            ...category,
            id: this.editingCategory.id
          },
          id: this.editingCategory.id
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.onCancelEdit(formDirective);
          this.fetchCategories();
        });
    } else {
      this.dataService
        .createExpenseCategory(category)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.onCancelEdit(formDirective);
          this.fetchCategories();
        });
    }
  }

  private fetchCategories() {
    this.isLoading = true;

    this.dataService
      .fetchExpenseCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((categories) => {
        this.dataSource = new MatTableDataSource(categories);
        this.isLoading = false;
        this.changeDetectorRef.markForCheck();
      });
  }

  private toCategoryPayload() {
    const { color, name } = this.categoryForm.getRawValue();

    return {
      color: color || undefined,
      name
    };
  }
}
