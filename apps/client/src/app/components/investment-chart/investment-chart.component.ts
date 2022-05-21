import 'chartjs-adapter-date-fns';

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { primaryColorRgb } from '@ghostfolio/common/config';
import {
  parseDate,
  transformTickToAbbreviation
} from '@ghostfolio/common/helper';
import { InvestmentItem } from '@ghostfolio/common/interfaces/investment-item.interface';
import {
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale
} from 'chart.js';
import { addDays, isAfter, parseISO, subDays } from 'date-fns';

@Component({
  selector: 'gf-investment-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './investment-chart.component.html',
  styleUrls: ['./investment-chart.component.scss']
})
export class InvestmentChartComponent implements OnChanges, OnDestroy {
  @Input() daysInMarket: number;
  @Input() investments: InvestmentItem[];
  @Input() isInPercent = false;

  @ViewChild('chartCanvas') chartCanvas;

  public chart: Chart;
  public isLoading = true;

  public constructor() {
    Chart.register(
      LinearScale,
      LineController,
      LineElement,
      PointElement,
      TimeScale
    );
  }

  public ngOnChanges() {
    if (this.investments) {
      this.initialize();
    }
  }

  public ngOnDestroy() {
    this.chart?.destroy();
  }

  private initialize() {
    this.isLoading = true;

    if (this.investments?.length > 0) {
      // Extend chart by 5% of days in market (before)
      const firstItem = this.investments[0];
      this.investments.unshift({
        ...firstItem,
        date: subDays(
          parseISO(firstItem.date),
          this.daysInMarket * 0.05 || 90
        ).toISOString(),
        investment: 0
      });

      // Extend chart by 5% of days in market (after)
      const lastItem = this.investments[this.investments.length - 1];
      this.investments.push({
        ...lastItem,
        date: addDays(
          parseDate(lastItem.date),
          this.daysInMarket * 0.05 || 90
        ).toISOString()
      });
    }

    const data = {
      labels: this.investments.map((position) => {
        return position.date;
      }),
      datasets: [
        {
          borderColor: `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`,
          borderWidth: 2,
          data: this.investments.map((position) => {
            return position.investment;
          }),
          segment: {
            borderColor: (context: unknown) =>
              this.isInFuture(
                context,
                `rgba(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b}, 0.67)`
              ),
            borderDash: (context: unknown) => this.isInFuture(context, [2, 2])
          },
          stepped: true
        }
      ]
    };

    if (this.chartCanvas) {
      if (this.chart) {
        this.chart.data = data;
        this.chart.update();
      } else {
        this.chart = new Chart(this.chartCanvas.nativeElement, {
          data,
          options: {
            elements: {
              line: {
                tension: 0
              },
              point: {
                radius: 0
              }
            },
            maintainAspectRatio: true,
            plugins: {
              legend: {
                display: false
              }
            },
            responsive: true,
            scales: {
              x: {
                display: true,
                grid: {
                  display: false
                },
                type: 'time',
                time: {
                  unit: 'year'
                }
              },
              y: {
                display: !this.isInPercent,
                grid: {
                  display: false
                },
                ticks: {
                  callback: (value: number) => {
                    return transformTickToAbbreviation(value);
                  },
                  display: true,
                  mirror: true,
                  z: 1
                }
              }
            }
          },
          type: 'line'
        });

        this.isLoading = false;
      }
    }
  }

  private isInFuture<T>(aContext: any, aValue: T) {
    return isAfter(new Date(aContext?.p1?.parsed?.x), new Date())
      ? aValue
      : undefined;
  }
}
