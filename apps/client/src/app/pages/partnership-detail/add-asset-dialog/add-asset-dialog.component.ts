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
  selector: 'gf-add-asset-dialog',
  template: `
    <form
      class="d-flex flex-column h-100"
      [formGroup]="assetForm"
      (keyup.enter)="assetForm.valid && onSubmit()"
      (ngSubmit)="onSubmit()"
    >
      <h1 i18n mat-dialog-title>Add Asset</h1>

      <div class="flex-grow-1 py-3" mat-dialog-content>
        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Name</mat-label>
            <input formControlName="name" matInput required />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Asset Type</mat-label>
            <mat-select formControlName="assetType" required>
              <mat-option value="REAL_ESTATE">Real Estate</mat-option>
              <mat-option value="PRIVATE_EQUITY">Private Equity</mat-option>
              <mat-option value="VENTURE_CAPITAL">Venture Capital</mat-option>
              <mat-option value="HEDGE_FUND">Hedge Fund</mat-option>
              <mat-option value="FIXED_INCOME">Fixed Income</mat-option>
              <mat-option value="COMMODITY">Commodity</mat-option>
              <mat-option value="OTHER">Other</mat-option>
            </mat-select>
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
            <mat-label i18n>Acquisition Date</mat-label>
            <input formControlName="acquisitionDate" matInput type="date" />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Acquisition Cost</mat-label>
            <input formControlName="acquisitionCost" matInput type="number" />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Current Value</mat-label>
            <input formControlName="currentValue" matInput type="number" />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Description</mat-label>
            <input formControlName="description" matInput />
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
          [disabled]="!assetForm.valid"
        >
          Save
        </button>
      </div>
    </form>
  `
})
export class GfAddAssetDialogComponent implements OnInit {
  public assetForm: FormGroup;

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: { currency: string },
    public dialogRef: MatDialogRef<GfAddAssetDialogComponent>
  ) {}

  public ngOnInit() {
    this.assetForm = new FormGroup({
      name: new FormControl('', [Validators.required]),
      assetType: new FormControl('REAL_ESTATE', [Validators.required]),
      currency: new FormControl(this.data.currency || 'USD', [
        Validators.required
      ]),
      acquisitionDate: new FormControl(''),
      acquisitionCost: new FormControl(null),
      currentValue: new FormControl(null),
      description: new FormControl('')
    });
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public onSubmit() {
    if (this.assetForm.valid) {
      this.dialogRef.close(this.assetForm.value);
    }
  }
}
