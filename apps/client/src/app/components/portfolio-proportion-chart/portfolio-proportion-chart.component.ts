import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { getCssVariable, getTextColor } from '@ghostfolio/common/helper';
import { PortfolioPosition } from '@ghostfolio/common/interfaces';
import { Currency } from '@prisma/client';
import { Tooltip } from 'chart.js';
import { LinearScale } from 'chart.js';
import { ArcElement } from 'chart.js';
import { DoughnutController } from 'chart.js';
import { Chart } from 'chart.js';

@Component({
  selector: 'gf-portfolio-proportion-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio-proportion-chart.component.html',
  styleUrls: ['./portfolio-proportion-chart.component.scss']
})
export class PortfolioProportionChartComponent
  implements OnChanges, OnDestroy, OnInit {
  @Input() baseCurrency: Currency;
  @Input() isInPercent: boolean;
  @Input() key: string;
  @Input() locale: string;
  @Input() positions: {
    [symbol: string]: Pick<PortfolioPosition, 'type'> & { value: number };
  };

  @ViewChild('chartCanvas') chartCanvas;

  public chart: Chart;
  public isLoading = true;

  private colorMap: {
    [symbol: string]: string;
  } = {
    [UNKNOWN_KEY]: `rgba(${getTextColor()}, ${getCssVariable(
      '--palette-foreground-divider-alpha'
    )})`
  };

  public constructor() {
    Chart.register(ArcElement, DoughnutController, LinearScale, Tooltip);
  }

  public ngOnInit() {}

  public ngOnChanges() {
    if (this.positions) {
      this.initialize();
    }
  }

  public ngOnDestroy() {
    this.chart?.destroy();
  }

  private initialize() {
    this.isLoading = true;
    const chartData: {
      [symbol: string]: { color?: string; value: number };
    } = {};

    Object.keys(this.positions).forEach((symbol) => {
      if (this.positions[symbol][this.key]) {
        if (chartData[this.positions[symbol][this.key]]) {
          chartData[this.positions[symbol][this.key]].value += this.positions[
            symbol
          ].value;
        } else {
          chartData[this.positions[symbol][this.key]] = {
            value: this.positions[symbol].value
          };
        }
      } else {
        if (chartData[UNKNOWN_KEY]) {
          chartData[UNKNOWN_KEY].value += this.positions[symbol].value;
        } else {
          chartData[UNKNOWN_KEY] = {
            value: this.positions[symbol].value
          };
        }
      }
    });

    const chartDataSorted = Object.entries(chartData)
      .sort((a, b) => {
        return a[1].value - b[1].value;
      })
      .reverse();

    chartDataSorted.forEach(([symbol, item], index) => {
      if (this.colorMap[symbol]) {
        // Reuse color
        item.color = this.colorMap[symbol];
      } else {
        const color = this.getColorPalette()[index];

        // Store color for reuse
        this.colorMap[symbol] = color;

        item.color = color;
      }
    });

    const data = {
      datasets: [
        {
          backgroundColor: chartDataSorted.map(([, item]) => {
            return item.color;
          }),
          borderWidth: 0,
          data: chartDataSorted.map(([, item]) => {
            return item.value;
          })
        }
      ],
      labels: chartDataSorted.map(([label]) => {
        return label;
      })
    };

    if (this.chartCanvas) {
      if (this.chart) {
        this.chart.data = data;
        this.chart.update();
      } else {
        this.chart = new Chart(this.chartCanvas.nativeElement, {
          data,
          options: {
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const label =
                      context.label === UNKNOWN_KEY ? 'Other' : context.label;

                    if (this.isInPercent) {
                      const value = 100 * <number>context.raw;
                      return `${label} (${value.toFixed(2)}%)`;
                    } else {
                      const value = <number>context.raw;
                      return `${label} (${value.toLocaleString(this.locale, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2
                      })} ${this.baseCurrency})`;
                    }
                  }
                }
              }
            }
          },
          type: 'doughnut'
        });
      }

      this.isLoading = false;
    }
  }

  /**
   * Color palette, inspired by https://yeun.github.io/open-color
   */
  private getColorPalette() {
    //
    return [
      '#329af0', // blue 5
      '#20c997', // teal 5
      '#94d82d', // lime 5
      '#ff922b', // orange 5
      '#f06595', // pink 5
      '#845ef7', // violet 5
      '#5c7cfa', // indigo 5
      '#22b8cf', // cyan 5
      '#51cf66', // green 5
      '#fcc419', // yellow 5
      '#ff6b6b', // red 5
      '#cc5de8' // grape 5
    ];
  }
}
