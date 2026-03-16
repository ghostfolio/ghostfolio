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

import { AddOwnershipDialogParams } from './interfaces/interfaces';

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
  selector: 'gf-add-ownership-dialog',
  template: `
    <form
      class="d-flex flex-column h-100"
      [formGroup]="ownershipForm"
      (keyup.enter)="ownershipForm.valid && onSubmit()"
      (ngSubmit)="onSubmit()"
    >
      <h1 i18n mat-dialog-title>Add Account Ownership</h1>

      <div class="flex-grow-1 py-3" mat-dialog-content>
        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Account</mat-label>
            <mat-select formControlName="accountId" required>
              @for (account of data.accounts; track account.id) {
                <mat-option [value]="account.id">{{ account.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Ownership %</mat-label>
            <input
              formControlName="ownershipPercent"
              matInput
              max="100"
              min="0"
              required
              type="number"
            />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Effective Date</mat-label>
            <input
              formControlName="effectiveDate"
              matInput
              required
              type="date"
            />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Acquisition Date</mat-label>
            <input
              formControlName="acquisitionDate"
              matInput
              placeholder="Optional"
              type="date"
            />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Cost Basis</mat-label>
            <input
              formControlName="costBasis"
              matInput
              placeholder="Optional"
              type="number"
            />
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
          [disabled]="!ownershipForm.valid"
        >
          Save
        </button>
      </div>
    </form>
  `
})
export class GfAddOwnershipDialogComponent implements OnInit {
  public ownershipForm: FormGroup;

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: AddOwnershipDialogParams,
    public dialogRef: MatDialogRef<GfAddOwnershipDialogComponent>
  ) {}

  public ngOnInit() {
    this.ownershipForm = new FormGroup({
      accountId: new FormControl('', [Validators.required]),
      ownershipPercent: new FormControl(100, [
        Validators.required,
        Validators.min(0),
        Validators.max(100)
      ]),
      effectiveDate: new FormControl(new Date().toISOString().split('T')[0], [
        Validators.required
      ]),
      acquisitionDate: new FormControl(''),
      costBasis: new FormControl(null)
    });
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public onSubmit() {
    if (this.ownershipForm.valid) {
      const val = this.ownershipForm.value;
      this.dialogRef.close({
        accountId: val.accountId,
        ownershipPercent: val.ownershipPercent,
        effectiveDate: val.effectiveDate,
        ...(val.acquisitionDate
          ? { acquisitionDate: val.acquisitionDate }
          : {}),
        ...(val.costBasis != null ? { costBasis: val.costBasis } : {})
      });
    }
  }
}
