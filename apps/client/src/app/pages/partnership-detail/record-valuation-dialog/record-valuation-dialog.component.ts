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
  selector: 'gf-record-valuation-dialog',
  template: `
    <form
      class="d-flex flex-column h-100"
      [formGroup]="valuationForm"
      (keyup.enter)="valuationForm.valid && onSubmit()"
      (ngSubmit)="onSubmit()"
    >
      <h1 i18n mat-dialog-title>Record Valuation</h1>

      <div class="flex-grow-1 py-3" mat-dialog-content>
        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Date</mat-label>
            <input formControlName="date" matInput required type="date" />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>NAV</mat-label>
            <input formControlName="nav" matInput required type="number" />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Source</mat-label>
            <mat-select formControlName="source" required>
              <mat-option value="STATEMENT">Statement</mat-option>
              <mat-option value="MANUAL">Manual Entry</mat-option>
              <mat-option value="AUDITOR">Auditor</mat-option>
              <mat-option value="FUND_ADMIN">Fund Admin</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Notes</mat-label>
            <input formControlName="notes" matInput placeholder="Optional" />
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
          [disabled]="!valuationForm.valid"
        >
          Save
        </button>
      </div>
    </form>
  `
})
export class GfRecordValuationDialogComponent implements OnInit {
  public valuationForm: FormGroup;

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<GfRecordValuationDialogComponent>
  ) {}

  public ngOnInit() {
    this.valuationForm = new FormGroup({
      date: new FormControl(new Date().toISOString().split('T')[0], [
        Validators.required
      ]),
      nav: new FormControl(null, [Validators.required, Validators.min(0)]),
      source: new FormControl('STATEMENT', [Validators.required]),
      notes: new FormControl('')
    });
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public onSubmit() {
    if (this.valuationForm.valid) {
      this.dialogRef.close(this.valuationForm.value);
    }
  }
}
