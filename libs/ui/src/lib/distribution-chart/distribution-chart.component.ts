import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges
} from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  selector: 'gf-distribution-chart',
  standalone: true,
  styles: [
    `
      :host {
        display: block;
      }

      .chart-container {
        position: relative;
      }

      .bar-group {
        display: flex;
        align-items: flex-end;
        gap: 4px;
        height: 200px;
      }

      .bar-wrapper {
        display: flex;
        flex: 1;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .bar {
        border-radius: 4px 4px 0 0;
        min-width: 30px;
        transition: height 0.3s ease;
        width: 100%;
      }

      .bar-label {
        font-size: 0.7rem;
        text-align: center;
        word-break: break-all;
      }

      .bar-value {
        font-size: 0.7rem;
        font-weight: 600;
      }

      .no-data {
        opacity: 0.6;
        padding: 2rem;
        text-align: center;
      }
    `
  ],
  template: `
    @if (chartData?.length > 0) {
      <div class="chart-container">
        <div class="bar-group">
          @for (item of chartData; track item.label) {
            <div class="bar-wrapper">
              <span class="bar-value">{{ item.value | number: '1.0-0' }}</span>
              <div
                class="bar"
                [style.background-color]="item.color"
                [style.height.px]="item.heightPx"
              ></div>
              <span class="bar-label">{{ item.label }}</span>
            </div>
          }
        </div>
      </div>
    } @else {
      <div class="no-data">No distribution data to display.</div>
    }
  `
})
export class GfDistributionChartComponent implements OnChanges {
  @Input() byPeriod: Record<string, number> = {};
  @Input() byType: Record<string, number> = {};
  @Input() mode: 'period' | 'type' = 'period';

  public chartData: {
    label: string;
    value: number;
    heightPx: number;
    color: string;
  }[] = [];

  private typeColors: Record<string, string> = {
    RETURN_OF_CAPITAL: '#42a5f5',
    INCOME: '#66bb6a',
    CAPITAL_GAIN: '#ff7043',
    DIVIDEND: '#ab47bc',
    INTEREST: '#26c6da',
    OTHER: '#78909c'
  };

  public ngOnChanges() {
    this.buildChart();
  }

  private buildChart() {
    const source = this.mode === 'period' ? this.byPeriod : this.byType;

    if (!source || Object.keys(source).length === 0) {
      this.chartData = [];
      return;
    }

    const entries = Object.entries(source).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    const maxValue = Math.max(...entries.map(([, v]) => v), 1);

    this.chartData = entries.map(([label, value]) => ({
      label,
      value,
      heightPx: Math.max((value / maxValue) * 180, 4),
      color:
        this.mode === 'type' ? this.typeColors[label] || '#78909c' : '#42a5f5'
    }));
  }
}
