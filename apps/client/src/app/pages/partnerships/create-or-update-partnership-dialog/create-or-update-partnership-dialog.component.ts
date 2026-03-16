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

import { CreateOrUpdatePartnershipDialogParams } from './interfaces/interfaces';

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
  selector: 'gf-create-or-update-partnership-dialog',
  template: `
    <form
      class="d-flex flex-column h-100"
      [formGroup]="partnershipForm"
      (keyup.enter)="partnershipForm.valid && onSubmit()"
      (ngSubmit)="onSubmit()"
    >
      @if (data.partnership.id) {
        <h1 i18n mat-dialog-title>Update Partnership</h1>
      } @else {
        <h1 i18n mat-dialog-title>Add Partnership</h1>
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
              <mat-option value="LP">LP</mat-option>
              <mat-option value="GP">GP</mat-option>
              <mat-option value="LLC">LLC</mat-option>
              <mat-option value="JOINT_VENTURE">Joint Venture</mat-option>
              <mat-option value="FUND">Fund</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        @if (!data.partnership.id) {
          <div class="mb-3">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label i18n>Inception Date</mat-label>
              <input
                formControlName="inceptionDate"
                matInput
                required
                type="date"
              />
            </mat-form-field>
          </div>
        }

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Currency</mat-label>
            <input formControlName="currency" matInput required />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Fiscal Year End (Month)</mat-label>
            <mat-select formControlName="fiscalYearEnd">
              @for (m of months; track m.value) {
                <mat-option [value]="m.value">{{ m.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <div class="justify-content-end" mat-dialog-actions>
        <button i18n mat-button type="button" (click)="onCancel()">
          {{ partnershipForm.dirty ? 'Cancel' : 'Close' }}
        </button>
        <button
          color="primary"
          mat-flat-button
          type="submit"
          [disabled]="!(partnershipForm.dirty && partnershipForm.valid)"
        >
          Save
        </button>
      </div>
    </form>
  `
})
export class GfCreateOrUpdatePartnershipDialogComponent implements OnInit {
  public months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];
  public partnershipForm: FormGroup;

  public constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: CreateOrUpdatePartnershipDialogParams,
    public dialogRef: MatDialogRef<GfCreateOrUpdatePartnershipDialogComponent>
  ) {}

  public ngOnInit() {
    this.partnershipForm = new FormGroup({
      name: new FormControl(this.data.partnership.name, [Validators.required]),
      type: new FormControl(this.data.partnership.type, [Validators.required]),
      currency: new FormControl(this.data.partnership.currency, [
        Validators.required
      ]),
      inceptionDate: new FormControl(this.data.partnership.inceptionDate),
      fiscalYearEnd: new FormControl(this.data.partnership.fiscalYearEnd)
    });
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public onSubmit() {
    if (this.partnershipForm.valid) {
      this.dialogRef.close(this.partnershipForm.value);
    }
  }
}
