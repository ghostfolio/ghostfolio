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
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  TimeScale
} from 'chart.js';
import { addMonths, isAfter, parseISO, subMonths } from 'date-fns';
import { InvestmentItem } from '@ghostfolio/common/interfaces/investment-item.interface';

@Component({
  selector: 'gf-investment-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './investment-chart.component.html',
  styleUrls: ['./investment-chart.component.scss']
})
export class InvestmentChartComponent implements OnChanges, OnDestroy, OnInit {
  @Input() investments: InvestmentItem[];

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

  public ngOnInit() {}

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
      // Extend chart by three months (before)
      const firstItem = this.investments[0];
      this.investments.unshift({
        ...firstItem,
        date: subMonths(parseISO(firstItem.date), 3).toISOString(),
        investment: 0
      });

      // Extend chart by three months (after)
      const lastItem = this.investments[this.investments.length - 1];
      this.investments.push({
        ...lastItem,
        date: addMonths(parseISO(lastItem.date), 3).toISOString()
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
                display: false,
                grid: {
                  display: false
                },
                ticks: {
                  display: false
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

  private isInFuture(aContext: any, aValue: any) {
    return isAfter(new Date(aContext?.p0?.parsed?.x), new Date())
      ? aValue
      : undefined;
  }
}
