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
  selector: 'gf-add-member-dialog',
  template: `
    <form
      class="d-flex flex-column h-100"
      [formGroup]="memberForm"
      (keyup.enter)="memberForm.valid && onSubmit()"
      (ngSubmit)="onSubmit()"
    >
      <h1 i18n mat-dialog-title>Add Member</h1>

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
            <mat-label i18n>Capital Commitment</mat-label>
            <input formControlName="capitalCommitment" matInput type="number" />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Capital Contributed</mat-label>
            <input
              formControlName="capitalContributed"
              matInput
              type="number"
            />
          </mat-form-field>
        </div>

        <div class="mb-3">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label i18n>Class Type</mat-label>
            <mat-select formControlName="classType">
              <mat-option value="GP">GP</mat-option>
              <mat-option value="LP">LP</mat-option>
              <mat-option value="CLASS_A">Class A</mat-option>
              <mat-option value="CLASS_B">Class B</mat-option>
            </mat-select>
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
      </div>

      <div class="justify-content-end" mat-dialog-actions>
        <button i18n mat-button type="button" (click)="onCancel()">
          Cancel
        </button>
        <button
          color="primary"
          mat-flat-button
          type="submit"
          [disabled]="!memberForm.valid"
        >
          Save
        </button>
      </div>
    </form>
  `
})
export class GfAddMemberDialogComponent implements OnInit {
  public memberForm: FormGroup;

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: { entities: any[] },
    public dialogRef: MatDialogRef<GfAddMemberDialogComponent>
  ) {}

  public ngOnInit() {
    this.memberForm = new FormGroup({
      entityId: new FormControl('', [Validators.required]),
      ownershipPercent: new FormControl(null, [
        Validators.required,
        Validators.min(0),
        Validators.max(100)
      ]),
      capitalCommitment: new FormControl(null),
      capitalContributed: new FormControl(null),
      classType: new FormControl('LP'),
      effectiveDate: new FormControl(new Date().toISOString().split('T')[0], [
        Validators.required
      ])
    });
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public onSubmit() {
    if (this.memberForm.valid) {
      this.dialogRef.close(this.memberForm.value);
    }
  }
}
