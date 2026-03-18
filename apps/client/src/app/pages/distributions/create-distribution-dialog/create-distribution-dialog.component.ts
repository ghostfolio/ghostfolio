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

import { CreateDistributionDialogParams } from './interfaces/interfaces';

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
  selector: 'gf-create-distribution-dialog',
  template: `
    <form
      class="d-flex flex-column h-100"
      [formGroup]="distributionForm"
      (keyup.enter)="distributionForm.valid && onSubmit()"
      (ngSubmit)="onSubmit()"
    >
      <h1 i18n mat-dialog-title>Record Distribution</h1>

      <div class="flex-grow-1 py-3" mat-dialog-content>
        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Entity</mat-label>
            <mat-select formControlName="entityId" required>
              @for (entity of data.entities; track entity.id) {
                <mat-option [value]="entity.id">{{ entity.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Partnership (Optional)</mat-label>
            <mat-select formControlName="partnershipId">
              <mat-option [value]="null">None</mat-option>
              @for (p of data.partnerships; track p.id) {
                <mat-option [value]="p.id">{{ p.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Type</mat-label>
            <mat-select formControlName="type" required>
              <mat-option value="RETURN_OF_CAPITAL"
                >Return of Capital</mat-option
              >
              <mat-option value="INCOME">Income</mat-option>
              <mat-option value="CAPITAL_GAIN">Capital Gain</mat-option>
              <mat-option value="DIVIDEND">Dividend</mat-option>
              <mat-option value="INTEREST">Interest</mat-option>
              <mat-option value="OTHER">Other</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Amount</mat-label>
            <input formControlName="amount" matInput required type="number" />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Currency</mat-label>
            <input formControlName="currency" matInput required />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Date</mat-label>
            <input formControlName="date" matInput required type="date" />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Tax Withheld (Optional)</mat-label>
            <input formControlName="taxWithheld" matInput type="number" />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Notes (Optional)</mat-label>
            <input formControlName="notes" matInput />
          </mat-form-field>
        </div>
      </div>

      <div class="justify-content-end" mat-dialog-actions>
        <button i18n mat-button type="button" (click)="onCancel()">
          Cancel
        </button>
        <button
          color="primary"
          mat-flat-button
          type="submit"
          [disabled]="!distributionForm.valid"
        >
          Save
        </button>
      </div>
    </form>
  `
})
export class GfCreateDistributionDialogComponent implements OnInit {
  public distributionForm: FormGroup;

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: CreateDistributionDialogParams,
    public dialogRef: MatDialogRef<GfCreateDistributionDialogComponent>
  ) {}

  public ngOnInit() {
    this.distributionForm = new FormGroup({
      entityId: new FormControl(null, [Validators.required]),
      partnershipId: new FormControl(null),
      type: new FormControl('INCOME', [Validators.required]),
      amount: new FormControl(null, [Validators.required, Validators.min(0)]),
      currency: new FormControl('USD', [Validators.required]),
      date: new FormControl(new Date().toISOString().split('T')[0], [
        Validators.required
      ]),
      taxWithheld: new FormControl(null),
      notes: new FormControl('')
    });
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public onSubmit() {
    if (this.distributionForm.valid) {
      this.dialogRef.close(this.distributionForm.value);
    }
  }
}
