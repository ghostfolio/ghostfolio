import type { K1Data } from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

const K1_FIELD_CONFIG: {
  key: keyof K1Data;
  label: string;
  section: string;
}[] = [
  {
    key: 'ordinaryIncome',
    label: 'Ordinary Income (Box 1)',
    section: 'Income'
  },
  {
    key: 'netRentalIncome',
    label: 'Net Rental Income (Box 2)',
    section: 'Income'
  },
  {
    key: 'otherRentalIncome',
    label: 'Other Rental Income (Box 3)',
    section: 'Income'
  },
  {
    key: 'guaranteedPayments',
    label: 'Guaranteed Payments (Box 4)',
    section: 'Income'
  },
  {
    key: 'interestIncome',
    label: 'Interest Income (Box 5)',
    section: 'Income'
  },
  { key: 'dividends', label: 'Dividends (Box 6a)', section: 'Income' },
  {
    key: 'qualifiedDividends',
    label: 'Qualified Dividends (Box 6b)',
    section: 'Income'
  },
  { key: 'royalties', label: 'Royalties (Box 7)', section: 'Income' },
  {
    key: 'capitalGainLossShortTerm',
    label: 'Short-Term Capital Gain/Loss (Box 8)',
    section: 'Capital'
  },
  {
    key: 'capitalGainLossLongTerm',
    label: 'Long-Term Capital Gain/Loss (Box 9a)',
    section: 'Capital'
  },
  {
    key: 'unrecaptured1250Gain',
    label: 'Unrecaptured Section 1250 Gain (Box 9b)',
    section: 'Capital'
  },
  {
    key: 'section1231GainLoss',
    label: 'Section 1231 Gain/Loss (Box 10)',
    section: 'Capital'
  },
  { key: 'otherIncome', label: 'Other Income (Box 11)', section: 'Capital' },
  {
    key: 'section179Deduction',
    label: 'Section 179 Deduction (Box 12)',
    section: 'Deductions'
  },
  {
    key: 'otherDeductions',
    label: 'Other Deductions (Box 13)',
    section: 'Deductions'
  },
  {
    key: 'selfEmploymentEarnings',
    label: 'Self-Employment Earnings (Box 14)',
    section: 'Other'
  },
  {
    key: 'foreignTaxesPaid',
    label: 'Foreign Taxes Paid (Box 16)',
    section: 'Other'
  },
  {
    key: 'alternativeMinimumTaxItems',
    label: 'AMT Items (Box 17)',
    section: 'Other'
  },
  {
    key: 'distributionsCash',
    label: 'Cash Distributions (Box 19a)',
    section: 'Distributions'
  },
  {
    key: 'distributionsProperty',
    label: 'Property Distributions (Box 19b)',
    section: 'Distributions'
  }
];

const SECTIONS = ['Income', 'Capital', 'Deductions', 'Other', 'Distributions'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  selector: 'gf-k-document-form',
  standalone: true,
  styles: [
    `
      :host {
        display: block;
      }

      .section-title {
        font-size: 14px;
        font-weight: 500;
        color: rgba(var(--dark-primary-text), 0.7);
        margin: 16px 0 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid rgba(var(--dark-dividers), 0.12);
      }

      .fields-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 0 16px;
      }

      .status-row {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
      }
    `
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="status-row">
        <mat-form-field>
          <mat-label>Filing Status</mat-label>
          <mat-select formControlName="filingStatus">
            <mat-option value="DRAFT">Draft</mat-option>
            <mat-option value="ESTIMATED">Estimated</mat-option>
            <mat-option value="FINAL">Final</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      @for (section of sections; track section) {
        <div class="section-title">{{ section }}</div>
        <div class="fields-grid">
          @for (field of getFieldsForSection(section); track field.key) {
            <mat-form-field>
              <mat-label>{{ field.label }}</mat-label>
              <input matInput type="number" [formControlName]="field.key" />
            </mat-form-field>
          }
        </div>
      }

      <div class="actions">
        <button mat-button type="button" (click)="cancelled.emit()">
          Cancel
        </button>
        <button
          color="primary"
          mat-flat-button
          type="submit"
          [disabled]="!form.valid"
        >
          {{ isEditMode ? 'Update' : 'Create' }}
        </button>
      </div>
    </form>
  `
})
export class GfKDocumentFormComponent implements OnChanges {
  @Input() public data: K1Data | null = null;
  @Input() public filingStatus: string = 'DRAFT';
  @Input() public isEditMode: boolean = false;

  @Output() public cancelled = new EventEmitter<void>();
  @Output() public submitted = new EventEmitter<{
    filingStatus: string;
    data: Record<string, number>;
  }>();

  public form: FormGroup;
  public sections = SECTIONS;

  public constructor() {
    const controls: Record<string, FormControl> = {
      filingStatus: new FormControl('DRAFT', Validators.required)
    };

    for (const field of K1_FIELD_CONFIG) {
      controls[field.key] = new FormControl(0);
    }

    this.form = new FormGroup(controls);
  }

  public ngOnChanges(): void {
    if (this.data) {
      const patchData: Record<string, unknown> = {
        filingStatus: this.filingStatus
      };

      for (const field of K1_FIELD_CONFIG) {
        patchData[field.key] = this.data[field.key] ?? 0;
      }

      this.form.patchValue(patchData);
    }
  }

  public getFieldsForSection(
    section: string
  ): { key: keyof K1Data; label: string; section: string }[] {
    return K1_FIELD_CONFIG.filter((f) => f.section === section);
  }

  public onSubmit(): void {
    if (this.form.valid) {
      const value = this.form.value;
      const data: Record<string, number> = {};

      for (const field of K1_FIELD_CONFIG) {
        data[field.key] = Number(value[field.key]) || 0;
      }

      this.submitted.emit({
        data,
        filingStatus: value.filingStatus
      });
    }
  }
}
