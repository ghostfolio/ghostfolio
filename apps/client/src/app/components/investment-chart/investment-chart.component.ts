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
import { PortfolioItem } from '@ghostfolio/common/interfaces';
import {
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale
} from 'chart.js';
import { Chart } from 'chart.js';

@Component({
  selector: 'gf-investment-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './investment-chart.component.html',
  styleUrls: ['./investment-chart.component.scss']
})
export class InvestmentChartComponent implements OnChanges, OnDestroy, OnInit {
  @Input() portfolioItems: PortfolioItem[];

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
    if (this.portfolioItems) {
      this.initialize();
    }
  }

  private initialize() {
    this.isLoading = true;

    const data = {
      labels: this.portfolioItems.map((position) => {
        return position.date;
      }),
      datasets: [
        {
          borderColor: `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`,
          borderWidth: 2,
          data: this.portfolioItems.map((position) => {
            return position.investment;
          })
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

  public ngOnDestroy() {
    this.chart?.destroy();
  }
}
