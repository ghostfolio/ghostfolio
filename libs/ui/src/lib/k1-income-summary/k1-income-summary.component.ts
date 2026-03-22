import type { IActivityRow } from '@ghostfolio/common/interfaces';

import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CurrencyPipe, MatCardModule, MatIconModule],
  selector: 'gf-k1-income-summary',
  standalone: true,
  styles: [
    `
      :host {
        display: block;
      }

      .income-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 1rem;
      }

      .income-item {
        text-align: center;
        padding: 1rem 0.5rem;
      }

      .income-value {
        font-size: 24px;
        font-weight: 600;
        line-height: 1.2;
      }

      .income-label {
        font-size: 13px;
        color: rgba(var(--dark-primary-text), 0.6);
        margin-top: 4px;
      }

      .positive {
        color: #2e7d32;
      }

      .negative {
        color: #c62828;
      }

      .neutral {
        color: rgba(var(--dark-primary-text), 0.87);
      }

      .summary-header {
        display: flex;
        align-items: center;
        margin-bottom: 1rem;
      }

      .summary-header mat-icon {
        margin-right: 8px;
        color: rgba(var(--dark-primary-text), 0.6);
      }

      .summary-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
      }
    `
  ],
  template: `
    <mat-card appearance="outlined">
      <mat-card-content>
        <div class="summary-header">
          <mat-icon>receipt_long</mat-icon>
          <h3>K-1 Income Summary</h3>
        </div>
        <div class="income-grid">
          <div class="income-item">
            <div
              class="income-value"
              [ngClass]="getValueClass(totalOrdinaryIncome)"
            >
              {{ totalOrdinaryIncome | currency: 'USD' : 'symbol' : '1.0-0' }}
            </div>
            <div class="income-label">Total Ordinary Income</div>
          </div>
          <div class="income-item">
            <div
              class="income-value"
              [ngClass]="getValueClass(totalCapitalGains)"
            >
              {{ totalCapitalGains | currency: 'USD' : 'symbol' : '1.0-0' }}
            </div>
            <div class="income-label">Total Capital Gains</div>
          </div>
          <div class="income-item">
            <div
              class="income-value"
              [ngClass]="getValueClass(totalDistributions)"
            >
              {{ totalDistributions | currency: 'USD' : 'symbol' : '1.0-0' }}
            </div>
            <div class="income-label">Total Distributions</div>
          </div>
          <div class="income-item">
            <div
              class="income-value"
              [ngClass]="getValueClass(totalOtherAdjustments)"
            >
              {{
                totalOtherAdjustments | currency: 'USD' : 'symbol' : '1.0-0'
              }}
            </div>
            <div class="income-label">Total Other Adjustments</div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `
})
export class GfK1IncomeSummaryComponent {
  @Input() public rows: IActivityRow[] = [];

  public get totalOrdinaryIncome(): number {
    return this.rows.reduce(
      (sum, row) =>
        sum + (row.interest ?? 0) + (row.dividends ?? 0) + (row.remainingK1IncomeDed ?? 0),
      0
    );
  }

  public get totalCapitalGains(): number {
    return this.rows.reduce((sum, row) => sum + (row.capitalGains ?? 0), 0);
  }

  public get totalDistributions(): number {
    return this.rows.reduce((sum, row) => sum + (row.distributions ?? 0), 0);
  }

  public get totalOtherAdjustments(): number {
    return this.rows.reduce(
      (sum, row) => sum + (row.otherAdjustments ?? 0),
      0
    );
  }

  public getValueClass(value: number): string {
    if (value > 0) {
      return 'positive';
    }

    if (value < 0) {
      return 'negative';
    }

    return 'neutral';
  }
}
