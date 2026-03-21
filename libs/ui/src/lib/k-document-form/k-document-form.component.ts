import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

// ── Field types ──────────────────────────────────────────────────────────
type FieldType = 'currency' | 'percent' | 'text' | 'checkbox';

interface K1FieldDef {
  boxNumber: string;
  label: string;
  type: FieldType;
}

interface K1Section {
  title: string;
  description?: string;
  fields: K1FieldDef[];
  collapsed?: boolean;
}

// ── Section definitions matching the real IRS Schedule K-1 ───────────────
const K1_SECTIONS: K1Section[] = [
  {
    title: 'Header / Metadata',
    fields: [
      { boxNumber: 'K1_DOCUMENT_ID', label: 'K-1 Document ID', type: 'text' },
      { boxNumber: 'TAX_YEAR', label: 'Tax Year', type: 'text' },
      { boxNumber: 'FINAL_K1', label: 'Final K-1', type: 'checkbox' },
      { boxNumber: 'AMENDED_K1', label: 'Amended K-1', type: 'checkbox' }
    ],
    collapsed: true
  },
  {
    title: 'Part I — Partnership Information',
    fields: [
      { boxNumber: 'A', label: "A — Partnership's EIN", type: 'text' },
      { boxNumber: 'B', label: "B — Partnership's name / address", type: 'text' },
      { boxNumber: 'C', label: 'C — IRS center where return filed', type: 'text' },
      { boxNumber: 'D', label: 'D — Publicly traded partnership', type: 'checkbox' }
    ],
    collapsed: true
  },
  {
    title: 'Part II — Partner Information',
    fields: [
      { boxNumber: 'E', label: "E — Partner's identifying number", type: 'text' },
      { boxNumber: 'F', label: "F — Partner's name / address", type: 'text' },
      { boxNumber: 'G_GENERAL', label: 'G — General partner / LLC member-manager', type: 'checkbox' },
      { boxNumber: 'G_LIMITED', label: 'G — Limited partner / other LLC member', type: 'checkbox' },
      { boxNumber: 'H1_DOMESTIC', label: 'H1 — Domestic partner', type: 'checkbox' },
      { boxNumber: 'H1_FOREIGN', label: 'H1 — Foreign partner', type: 'checkbox' },
      { boxNumber: 'H2', label: 'H2 — Disregarded entity', type: 'checkbox' },
      { boxNumber: 'H2_TIN', label: 'H2 — DE taxpayer ID', type: 'text' },
      { boxNumber: 'I1', label: 'I1 — Type of entity', type: 'text' },
      { boxNumber: 'I2', label: 'I2 — IRA / SEP / Keogh', type: 'checkbox' }
    ],
    collapsed: true
  },
  {
    title: "Section J — Partner's Share of Profit, Loss & Capital",
    fields: [
      { boxNumber: 'J_PROFIT_BEGIN', label: 'Profit — Beginning', type: 'percent' },
      { boxNumber: 'J_PROFIT_END', label: 'Profit — Ending', type: 'percent' },
      { boxNumber: 'J_LOSS_BEGIN', label: 'Loss — Beginning', type: 'percent' },
      { boxNumber: 'J_LOSS_END', label: 'Loss — Ending', type: 'percent' },
      { boxNumber: 'J_CAPITAL_BEGIN', label: 'Capital — Beginning', type: 'percent' },
      { boxNumber: 'J_CAPITAL_END', label: 'Capital — Ending', type: 'percent' },
      { boxNumber: 'J_SALE', label: 'Decrease due to sale', type: 'checkbox' },
      { boxNumber: 'J_EXCHANGE', label: 'Exchange of partnership interest', type: 'checkbox' }
    ]
  },
  {
    title: "Section K — Partner's Share of Liabilities",
    fields: [
      { boxNumber: 'K_NONRECOURSE_BEGIN', label: 'Nonrecourse — Beginning', type: 'currency' },
      { boxNumber: 'K_NONRECOURSE_END', label: 'Nonrecourse — Ending', type: 'currency' },
      { boxNumber: 'K_QUAL_NONRECOURSE_BEGIN', label: 'Qualified nonrecourse — Beginning', type: 'currency' },
      { boxNumber: 'K_QUAL_NONRECOURSE_END', label: 'Qualified nonrecourse — Ending', type: 'currency' },
      { boxNumber: 'K_RECOURSE_BEGIN', label: 'Recourse — Beginning', type: 'currency' },
      { boxNumber: 'K_RECOURSE_END', label: 'Recourse — Ending', type: 'currency' },
      { boxNumber: 'K2', label: 'Includes lower-tier partnership liabilities', type: 'checkbox' },
      { boxNumber: 'K3', label: 'Liability subject to guarantees', type: 'checkbox' }
    ]
  },
  {
    title: "Section L — Partner's Capital Account",
    fields: [
      { boxNumber: 'L_BEG_CAPITAL', label: 'Beginning capital account', type: 'currency' },
      { boxNumber: 'L_CONTRIBUTED', label: 'Capital contributed during year', type: 'currency' },
      { boxNumber: 'L_CURR_YR_INCOME', label: 'Current year net income (loss)', type: 'currency' },
      { boxNumber: 'L_OTHER', label: 'Other increase (decrease)', type: 'currency' },
      { boxNumber: 'L_WITHDRAWALS', label: 'Withdrawals & distributions', type: 'currency' },
      { boxNumber: 'L_END_CAPITAL', label: 'Ending capital account', type: 'currency' }
    ]
  },
  {
    title: 'Sections M & N',
    fields: [
      { boxNumber: 'M_YES', label: 'M — Contributed property: Yes', type: 'checkbox' },
      { boxNumber: 'M_NO', label: 'M — Contributed property: No', type: 'checkbox' },
      { boxNumber: 'N_BEGINNING', label: 'N — Net 704(c) gain/loss: Beginning', type: 'currency' },
      { boxNumber: 'N_ENDING', label: 'N — Net 704(c) gain/loss: Ending', type: 'currency' }
    ]
  },
  {
    title: 'Part III — Income & Gains (Boxes 1–11)',
    fields: [
      { boxNumber: '1', label: '1 — Ordinary business income (loss)', type: 'currency' },
      { boxNumber: '2', label: '2 — Net rental real estate income (loss)', type: 'currency' },
      { boxNumber: '3', label: '3 — Other net rental income (loss)', type: 'currency' },
      { boxNumber: '4', label: '4 — Guaranteed payments for services', type: 'currency' },
      { boxNumber: '4a', label: '4a — Guaranteed payments for capital', type: 'currency' },
      { boxNumber: '4b', label: '4b — Total guaranteed payments', type: 'currency' },
      { boxNumber: '5', label: '5 — Interest income', type: 'currency' },
      { boxNumber: '6a', label: '6a — Ordinary dividends', type: 'currency' },
      { boxNumber: '6b', label: '6b — Qualified dividends', type: 'currency' },
      { boxNumber: '6c', label: '6c — Dividend equivalents', type: 'currency' },
      { boxNumber: '7', label: '7 — Royalties', type: 'currency' },
      { boxNumber: '8', label: '8 — Net short-term capital gain (loss)', type: 'currency' },
      { boxNumber: '9a', label: '9a — Net long-term capital gain (loss)', type: 'currency' },
      { boxNumber: '9b', label: '9b — Collectibles (28%) gain (loss)', type: 'currency' },
      { boxNumber: '9c', label: '9c — Unrecaptured §1250 gain', type: 'currency' },
      { boxNumber: '10', label: '10 — Net §1231 gain (loss)', type: 'currency' },
      { boxNumber: '11', label: '11 — Other income (loss)', type: 'currency' }
    ]
  },
  {
    title: 'Part III — Deductions & Credits (Boxes 12–18)',
    fields: [
      { boxNumber: '12', label: '12 — §179 deduction', type: 'currency' },
      { boxNumber: '13', label: '13 — Other deductions', type: 'currency' },
      { boxNumber: '14', label: '14 — Self-employment earnings (loss)', type: 'currency' },
      { boxNumber: '15', label: '15 — Credits', type: 'currency' },
      { boxNumber: '16', label: '16 — Foreign transactions', type: 'currency' },
      { boxNumber: '16_K3', label: '16 — Schedule K-3 attached', type: 'checkbox' },
      { boxNumber: '17', label: '17 — AMT items', type: 'currency' },
      { boxNumber: '18', label: '18 — Tax-exempt income / nondeductible expenses', type: 'currency' }
    ]
  },
  {
    title: 'Part III — Distributions & Other (Boxes 19–23)',
    fields: [
      { boxNumber: '19', label: '19 — Distributions', type: 'currency' },
      { boxNumber: '19a', label: '19a — Cash & marketable securities', type: 'currency' },
      { boxNumber: '19b', label: '19b — Other property', type: 'currency' },
      { boxNumber: '20A', label: '20A — Other information: Code A', type: 'currency' },
      { boxNumber: '20B', label: '20B — Other information: Code B', type: 'currency' },
      { boxNumber: '20V', label: '20V — Other information: Code V', type: 'currency' },
      { boxNumber: '20_WILDCARD', label: '20 — Other information: Other codes', type: 'currency' },
      { boxNumber: '21', label: '21 — Foreign taxes paid or accrued', type: 'currency' },
      { boxNumber: '22', label: '22 — At-risk: more than one activity', type: 'checkbox' },
      { boxNumber: '23', label: '23 — Passive: more than one activity', type: 'checkbox' }
    ]
  }
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule
  ],
  selector: 'gf-k-document-form',
  standalone: true,
  styles: [
    `
      :host {
        display: block;
      }

      .form-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 20px;
      }

      /* Collapsible sections */
      .k1-section {
        margin-bottom: 12px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 8px;
        overflow: hidden;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: rgba(0, 0, 0, 0.03);
        cursor: pointer;
        user-select: none;
        font-weight: 500;
        font-size: 14px;
        transition: background 0.15s;
      }

      .section-header:hover {
        background: rgba(0, 0, 0, 0.06);
      }

      .section-header mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        transition: transform 0.2s;
      }

      .section-header mat-icon.expanded {
        transform: rotate(90deg);
      }

      .section-header .section-desc {
        font-weight: 400;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.5);
        margin-left: auto;
      }

      .section-body {
        padding: 12px 16px 4px;
      }

      /* Two-column grid */
      .fields-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2px 24px;
      }

      @media (max-width: 700px) {
        .fields-grid {
          grid-template-columns: 1fr;
        }
      }

      /* Field rows */
      .field-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
        min-height: 34px;
      }

      .field-label {
        flex: 1 1 auto;
        font-size: 13px;
        color: rgba(0, 0, 0, 0.72);
        line-height: 1.3;
        min-width: 0;
      }

      .field-input {
        flex: 0 0 140px;
        display: flex;
        align-items: center;
      }

      .field-input input {
        width: 100%;
        box-sizing: border-box;
        padding: 5px 8px;
        font-size: 13px;
        font-family: 'Roboto Mono', monospace;
        border: 1px solid rgba(0, 0, 0, 0.18);
        border-radius: 4px;
        background: transparent;
        outline: none;
        text-align: right;
        transition: border-color 0.15s;
      }

      .field-input input:focus {
        border-color: #1976d2;
        box-shadow: 0 0 0 1px #1976d2;
      }

      .field-input input.text-input {
        text-align: left;
        font-family: inherit;
      }

      .field-input .unit-suffix {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.45);
        margin-left: 3px;
        flex-shrink: 0;
      }

      .field-input .unit-prefix {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.45);
        margin-right: 3px;
        flex-shrink: 0;
      }

      .field-input input.is-zero {
        color: rgba(0, 0, 0, 0.3);
      }

      /* Checkbox row */
      .field-row-checkbox {
        cursor: pointer;
      }

      .field-row-checkbox .cb-label {
        font-size: 13px;
        color: rgba(0, 0, 0, 0.72);
      }

      /* Footer */
      .form-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 20px;
        padding-top: 12px;
        border-top: 1px solid rgba(0, 0, 0, 0.08);
      }
    `
  ],
  template: `
    <div class="form-header">
      <mat-form-field style="min-width: 180px">
        <mat-label>Filing Status</mat-label>
        <mat-select [(ngModel)]="filingStatusValue">
          <mat-option value="DRAFT">Draft</mat-option>
          <mat-option value="ESTIMATED">Estimated</mat-option>
          <mat-option value="FINAL">Final</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    @for (section of sections; track section.title) {
      <div class="k1-section">
        <div class="section-header" (click)="section.collapsed = !section.collapsed">
          <mat-icon [class.expanded]="!section.collapsed">chevron_right</mat-icon>
          <span>{{ section.title }}</span>
          @if (section.description) {
            <span class="section-desc">{{ section.description }}</span>
          }
        </div>
        @if (!section.collapsed) {
          <div class="section-body">
            <div class="fields-grid">
              @for (field of section.fields; track field.boxNumber) {
                @if (field.type === 'checkbox') {
                  <div class="field-row field-row-checkbox">
                    <mat-checkbox
                      [checked]="isChecked(field.boxNumber)"
                      (change)="setCheckbox(field.boxNumber, $event.checked)">
                      <span class="cb-label">{{ field.label }}</span>
                    </mat-checkbox>
                  </div>
                } @else if (field.type === 'text') {
                  <div class="field-row">
                    <span class="field-label">{{ field.label }}</span>
                    <div class="field-input">
                      <input class="text-input"
                        [value]="getTextValue(field.boxNumber)"
                        (input)="setTextValue(field.boxNumber, $event)"
                        placeholder="—" />
                    </div>
                  </div>
                } @else if (field.type === 'percent') {
                  <div class="field-row">
                    <span class="field-label">{{ field.label }}</span>
                    <div class="field-input">
                      <input type="number" step="any"
                        [value]="getNumericDisplay(field.boxNumber)"
                        [class.is-zero]="isZero(field.boxNumber)"
                        (input)="setNumericValue(field.boxNumber, $event)"
                        placeholder="0" />
                      <span class="unit-suffix">%</span>
                    </div>
                  </div>
                } @else {
                  <div class="field-row">
                    <span class="field-label">{{ field.label }}</span>
                    <div class="field-input">
                      <span class="unit-prefix">$</span>
                      <input type="number" step="any"
                        [value]="getNumericDisplay(field.boxNumber)"
                        [class.is-zero]="isZero(field.boxNumber)"
                        (input)="setNumericValue(field.boxNumber, $event)"
                        placeholder="0" />
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        }
      </div>
    }

    <div class="form-footer">
      <button mat-button type="button" (click)="cancelled.emit()">Cancel</button>
      <button mat-flat-button color="primary" (click)="onSubmit()">
        {{ isEditMode ? 'Update' : 'Create' }}
      </button>
    </div>
  `
})
export class GfKDocumentFormComponent implements OnChanges {
  @Input() public data: Record<string, number | string | null> | null = null;
  @Input() public filingStatus: string = 'DRAFT';
  @Input() public isEditMode: boolean = false;

  @Output() public cancelled = new EventEmitter<void>();
  @Output() public submitted = new EventEmitter<{
    filingStatus: string;
    data: Record<string, number | string | null>;
  }>();

  public filingStatusValue = 'DRAFT';
  public sections: K1Section[] = [];

  /** Internal data store keyed by boxNumber */
  private values: Record<string, number | string | null> = {};

  public constructor() {
    this.sections = K1_SECTIONS.map((s) => ({
      ...s,
      fields: [...s.fields],
      collapsed: s.collapsed ?? false
    }));
  }

  public ngOnChanges(): void {
    this.filingStatusValue = this.filingStatus || 'DRAFT';

    if (this.data) {
      this.values = { ...this.data };
    } else {
      this.values = {};
    }
  }

  // ── Value accessors ────────────────────────────────────────────────────

  public isChecked(boxNumber: string): boolean {
    const v = this.values[boxNumber];
    return v === 'true' || v === 1 || v === '1';
  }

  public setCheckbox(boxNumber: string, checked: boolean): void {
    this.values[boxNumber] = checked ? 'true' : 'false';
  }

  public getTextValue(boxNumber: string): string {
    const v = this.values[boxNumber];
    return v != null ? String(v) : '';
  }

  public setTextValue(boxNumber: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.values[boxNumber] = input.value || null;
  }

  public getNumericDisplay(boxNumber: string): string {
    const v = this.values[boxNumber];
    if (v == null || v === '') {
      return '';
    }
    const n = Number(v);
    return isNaN(n) ? '' : String(n);
  }

  public isZero(boxNumber: string): boolean {
    const v = this.values[boxNumber];
    return v === 0 || v === '0';
  }

  public setNumericValue(boxNumber: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value;
    if (raw === '' || raw == null) {
      this.values[boxNumber] = null;
    } else {
      const n = parseFloat(raw);
      this.values[boxNumber] = isNaN(n) ? null : n;
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────

  public onSubmit(): void {
    const data: Record<string, number | string | null> = {};

    for (const section of this.sections) {
      for (const field of section.fields) {
        const v = this.values[field.boxNumber];
        if (v != null && v !== '') {
          data[field.boxNumber] = v;
        }
      }
    }

    this.submitted.emit({
      data,
      filingStatus: this.filingStatusValue
    });
  }
}
