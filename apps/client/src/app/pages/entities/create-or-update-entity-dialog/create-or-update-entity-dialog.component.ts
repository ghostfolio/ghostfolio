import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { CreateOrUpdateEntityDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  selector: 'gf-create-or-update-entity-dialog',
  template: `
    <form
      class="d-flex flex-column h-100"
      [formGroup]="entityForm"
      (keyup.enter)="entityForm.valid && onSubmit()"
      (ngSubmit)="onSubmit()"
    >
      @if (data.entity.id) {
        <h1 i18n mat-dialog-title>Update Entity</h1>
      } @else {
        <h1 i18n mat-dialog-title>Add Entity</h1>
      }

      <div class="flex-grow-1 py-3" mat-dialog-content>
        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Name</mat-label>
            <input formControlName="name" matInput required />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Type</mat-label>
            <mat-select formControlName="type" required>
              <mat-option value="INDIVIDUAL">Individual</mat-option>
              <mat-option value="TRUST">Trust</mat-option>
              <mat-option value="LLC">LLC</mat-option>
              <mat-option value="LP">LP</mat-option>
              <mat-option value="CORPORATION">Corporation</mat-option>
              <mat-option value="FOUNDATION">Foundation</mat-option>
              <mat-option value="ESTATE">Estate</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Tax ID</mat-label>
            <input formControlName="taxId" matInput placeholder="Optional" />
          </mat-form-field>
        </div>
      </div>

      <div class="justify-content-end" mat-dialog-actions>
        <button i18n mat-button type="button" (click)="onCancel()">
          {{ entityForm.dirty ? 'Cancel' : 'Close' }}
        </button>
        <button
          color="primary"
          mat-flat-button
          type="submit"
          [disabled]="!(entityForm.dirty && entityForm.valid)"
        >
          Save
        </button>
      </div>
    </form>
  `
})
export class GfCreateOrUpdateEntityDialogComponent implements OnInit {
  public entityForm: FormGroup;

  public constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: CreateOrUpdateEntityDialogParams,
    public dialogRef: MatDialogRef<GfCreateOrUpdateEntityDialogComponent>
  ) {}

  public ngOnInit() {
    this.entityForm = new FormGroup({
      name: new FormControl(this.data.entity.name, [Validators.required]),
      type: new FormControl(this.data.entity.type, [Validators.required]),
      taxId: new FormControl(this.data.entity.taxId)
    });
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public onSubmit() {
    if (this.entityForm.valid) {
      this.dialogRef.close(this.entityForm.value);
    }
  }
}
