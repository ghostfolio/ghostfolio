import { CommonModule, PercentPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';

interface ChartPoint {
  label: string;
  values: { color: string; name: string; value: number }[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatCardModule, PercentPipe],
  selector: 'gf-benchmark-comparison-chart',
  standalone: true,
  styles: [
    `
      :host {
        display: block;
      }

      .chart-container {
        padding: 1rem 0;
      }

      .legend {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
        font-size: 13px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .legend-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }

      .comparison-bars {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .bar-group {
        display: flex;
        align-items: center;
      }

      .bar-label {
        width: 120px;
        text-align: right;
        padding-right: 12px;
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .bars {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .bar-row {
        display: flex;
        align-items: center;
        height: 18px;
      }

      .bar {
        height: 14px;
        border-radius: 2px;
        transition: width 0.3s ease;
        min-width: 2px;
      }

      .bar-value {
        font-size: 11px;
        padding-left: 6px;
        white-space: nowrap;
      }

      .excess-return {
        margin-top: 1rem;
        padding: 0.75rem;
        border-radius: 8px;
        background: rgba(var(--dark-dividers), 0.04);
      }

      .excess-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
        font-size: 13px;
      }

      .excess-value {
        font-weight: 600;
      }

      .positive {
        color: #2e7d32;
      }

      .negative {
        color: #c62828;
      }
    `
  ],
  template: `
    <div class="chart-container">
      <div class="legend">
        @for (item of legendItems; track item.name) {
          <div class="legend-item">
            <div class="legend-dot" [style.background]="item.color"></div>
            {{ item.name }}
          </div>
        }
      </div>

      <div class="comparison-bars">
        @for (group of chartData; track group.label) {
          <div class="bar-group">
            <div class="bar-label">{{ group.label }}</div>
            <div class="bars">
              @for (bar of group.values; track bar.name) {
                <div class="bar-row">
                  <div
                    class="bar"
                    [style.background]="bar.color"
                    [style.width.%]="getBarWidth(bar.value)"
                  ></div>
                  <span
                    class="bar-value"
                    [ngClass]="bar.value >= 0 ? 'positive' : 'negative'"
                  >
                    {{ bar.value | percent: '1.2-2' }}
                  </span>
                </div>
              }
            </div>
          </div>
        }
      </div>

      @if (excessReturns.length > 0) {
        <div class="excess-return">
          <strong>Excess Return (Alpha)</strong>
          @for (er of excessReturns; track er.name) {
            <div class="excess-row">
              <span>vs {{ er.name }}</span>
              <span
                class="excess-value"
                [ngClass]="er.value >= 0 ? 'positive' : 'negative'"
              >
                {{ er.value >= 0 ? '+' : '' }}{{ er.value | percent: '1.2-2' }}
              </span>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class GfBenchmarkComparisonChartComponent implements OnChanges {
  @Input() public benchmarks: {
    excessReturn?: number;
    id: string;
    name: string;
    periodReturn: number;
  }[] = [];

  @Input() public partnershipName: string = 'Partnership';
  @Input() public partnershipReturn: number = 0;

  public chartData: ChartPoint[] = [];
  public excessReturns: { name: string; value: number }[] = [];
  public legendItems: { color: string; name: string }[] = [];

  private colors = ['#1976d2', '#f57c00', '#388e3c', '#7b1fa2', '#d32f2f'];
  private maxAbsValue = 0;

  public ngOnChanges(): void {
    this.buildChart();
  }

  public getBarWidth(value: number): number {
    if (this.maxAbsValue === 0) {
      return 0;
    }

    return Math.min((Math.abs(value) / this.maxAbsValue) * 70, 70);
  }

  private buildChart(): void {
    this.legendItems = [{ color: '#1976d2', name: this.partnershipName }];

    const allSeries = [
      {
        color: '#1976d2',
        name: this.partnershipName,
        value: this.partnershipReturn
      }
    ];

    this.benchmarks.forEach((b, i) => {
      const color = this.colors[(i + 1) % this.colors.length];
      this.legendItems.push({ color, name: b.name });
      allSeries.push({ color, name: b.name, value: b.periodReturn });
    });

    this.maxAbsValue = Math.max(
      ...allSeries.map((s) => Math.abs(s.value)),
      0.01
    );

    // Single group showing all returns side by side
    this.chartData = [
      {
        label: 'Period Return',
        values: allSeries
      }
    ];

    this.excessReturns = this.benchmarks
      .filter((b) => b.excessReturn !== undefined)
      .map((b) => ({
        name: b.name,
        value: b.excessReturn!
      }));
  }
}
