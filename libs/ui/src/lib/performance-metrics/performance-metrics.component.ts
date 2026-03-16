import { CommonModule, DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DecimalPipe,
    MatCardModule,
    MatIconModule,
    PercentPipe
  ],
  selector: 'gf-performance-metrics',
  standalone: true,
  styles: [
    `
      :host {
        display: block;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
      }

      .metric-card {
        text-align: center;
      }

      .metric-value {
        font-size: 28px;
        font-weight: 600;
        line-height: 1.2;
      }

      .metric-label {
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

      .metric-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        margin-right: 4px;
        vertical-align: middle;
      }

      .returns-chart {
        margin-top: 1.5rem;
      }

      .bar-container {
        display: flex;
        align-items: center;
        margin-bottom: 4px;
        font-size: 12px;
      }

      .bar-label {
        width: 90px;
        text-align: right;
        padding-right: 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .bar-track {
        flex: 1;
        height: 20px;
        background: rgba(var(--dark-dividers), 0.06);
        border-radius: 2px;
        position: relative;
        overflow: hidden;
      }

      .bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.3s ease;
      }

      .bar-fill.positive {
        background: #66bb6a;
      }

      .bar-fill.negative {
        background: #ef5350;
      }

      .bar-value {
        width: 60px;
        text-align: right;
        padding-left: 8px;
      }
    `
  ],
  template: `
    <div class="metrics-grid">
      <mat-card class="metric-card">
        <mat-card-content>
          <div class="metric-value" [ngClass]="getValueClass(irr)">
            @if (irr !== null && irr !== undefined) {
              <mat-icon class="metric-icon" [ngClass]="getValueClass(irr)">
                {{ irr >= 0 ? 'trending_up' : 'trending_down' }}
              </mat-icon>
              {{ irr | percent: '1.2-2' }}
            } @else {
              N/A
            }
          </div>
          <div class="metric-label">IRR (XIRR)</div>
        </mat-card-content>
      </mat-card>

      <mat-card class="metric-card">
        <mat-card-content>
          <div class="metric-value" [ngClass]="getMultipleClass(tvpi)">
            {{ tvpi | number: '1.2-2' }}x
          </div>
          <div class="metric-label">TVPI</div>
        </mat-card-content>
      </mat-card>

      <mat-card class="metric-card">
        <mat-card-content>
          <div class="metric-value" [ngClass]="getMultipleClass(dpi)">
            {{ dpi | number: '1.2-2' }}x
          </div>
          <div class="metric-label">DPI</div>
        </mat-card-content>
      </mat-card>

      <mat-card class="metric-card">
        <mat-card-content>
          <div class="metric-value" [ngClass]="getMultipleClass(rvpi)">
            {{ rvpi | number: '1.2-2' }}x
          </div>
          <div class="metric-label">RVPI</div>
        </mat-card-content>
      </mat-card>
    </div>

    @if (periodReturns && periodReturns.length > 0) {
      <div class="returns-chart">
        <h3>Period Returns</h3>
        @for (period of periodReturns; track period.startDate) {
          <div class="bar-container">
            <div class="bar-label">
              {{ period.startDate | date: 'MMM yy' }}
            </div>
            <div class="bar-track">
              <div
                class="bar-fill"
                [ngClass]="period.return >= 0 ? 'positive' : 'negative'"
                [style.width.%]="getBarWidth(period.return)"
              ></div>
            </div>
            <div class="bar-value" [ngClass]="getValueClass(period.return)">
              {{ period.return | percent: '1.2-2' }}
            </div>
          </div>
        }
      </div>
    }
  `
})
export class GfPerformanceMetricsComponent {
  @Input() public dpi: number = 0;
  @Input() public irr: number | null = null;
  @Input() public periodReturns: {
    endDate: string;
    return: number;
    startDate: string;
  }[] = [];
  @Input() public rvpi: number = 0;
  @Input() public tvpi: number = 0;

  private maxAbsReturn: number = 0;

  public getBarWidth(returnValue: number): number {
    if (!this.periodReturns || this.periodReturns.length === 0) {
      return 0;
    }

    if (this.maxAbsReturn === 0) {
      this.maxAbsReturn = Math.max(
        ...this.periodReturns.map((p) => Math.abs(p.return)),
        0.01
      );
    }

    return Math.min((Math.abs(returnValue) / this.maxAbsReturn) * 80, 80);
  }

  public getMultipleClass(value: number): string {
    if (value >= 1) {
      return 'positive';
    }

    if (value < 1 && value > 0) {
      return 'negative';
    }

    return 'neutral';
  }

  public getValueClass(value: number | null): string {
    if (value === null || value === undefined) {
      return 'neutral';
    }

    return value >= 0 ? 'positive' : 'negative';
  }
}
