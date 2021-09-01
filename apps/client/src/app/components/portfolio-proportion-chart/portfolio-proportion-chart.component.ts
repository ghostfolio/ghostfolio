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
import { getTextColor } from '@ghostfolio/common/helper';
import { PortfolioPosition } from '@ghostfolio/common/interfaces';
import { Currency } from '@prisma/client';
import { Tooltip } from 'chart.js';
import { LinearScale } from 'chart.js';
import { ArcElement } from 'chart.js';
import { DoughnutController } from 'chart.js';
import { Chart } from 'chart.js';
import * as Color from 'color';

@Component({
  selector: 'gf-portfolio-proportion-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio-proportion-chart.component.html',
  styleUrls: ['./portfolio-proportion-chart.component.scss']
})
export class PortfolioProportionChartComponent
  implements OnChanges, OnDestroy, OnInit
{
  @Input() baseCurrency: Currency;
  @Input() isInPercent: boolean;
  @Input() keys: string[];
  @Input() locale: string;
  @Input() maxItems?: number;
  @Input() positions: {
    [symbol: string]: Pick<PortfolioPosition, 'type'> & { value: number };
  };

  @ViewChild('chartCanvas') chartCanvas;

  public chart: Chart;
  public isLoading = true;

  private colorMap: {
    [symbol: string]: string;
  } = {
    [UNKNOWN_KEY]: `rgba(${getTextColor()}, 0.12)`
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
      [symbol: string]: {
        color?: string;
        subCategory: { [symbol: string]: { value: number } };
        value: number;
      };
    } = {};

    Object.keys(this.positions).forEach((symbol) => {
      if (this.positions[symbol][this.keys[0]]) {
        if (chartData[this.positions[symbol][this.keys[0]]]) {
          chartData[this.positions[symbol][this.keys[0]]].value +=
            this.positions[symbol].value;

          if (
            chartData[this.positions[symbol][this.keys[0]]].subCategory[
              this.positions[symbol][this.keys[1]]
            ]
          ) {
            chartData[this.positions[symbol][this.keys[0]]].subCategory[
              this.positions[symbol][this.keys[1]]
            ].value += this.positions[symbol].value;
          } else {
            chartData[this.positions[symbol][this.keys[0]]].subCategory[
              this.positions[symbol][this.keys[1]] ?? UNKNOWN_KEY
            ] = { value: this.positions[symbol].value };
          }
        } else {
          chartData[this.positions[symbol][this.keys[0]]] = {
            subCategory: {},
            value: this.positions[symbol].value
          };

          if (this.positions[symbol][this.keys[1]]) {
            chartData[this.positions[symbol][this.keys[0]]].subCategory = {
              [this.positions[symbol][this.keys[1]]]: {
                value: this.positions[symbol].value
              }
            };
          }
        }
      } else {
        if (chartData[UNKNOWN_KEY]) {
          chartData[UNKNOWN_KEY].value += this.positions[symbol].value;
        } else {
          chartData[UNKNOWN_KEY] = {
            subCategory: this.keys[1]
              ? { [this.keys[1]]: { value: 0 } }
              : undefined,
            value: this.positions[symbol].value
          };
        }
      }
    });

    let chartDataSorted = Object.entries(chartData)
      .sort((a, b) => {
        return a[1].value - b[1].value;
      })
      .reverse();

    if (this.maxItems && chartDataSorted.length > this.maxItems) {
      // Add surplus items to unknown group
      const rest = chartDataSorted.splice(
        this.maxItems,
        chartDataSorted.length - 1
      );

      let unknownItem = chartDataSorted.find((charDataItem) => {
        return charDataItem[0] === UNKNOWN_KEY;
      });

      if (!unknownItem) {
        const index = chartDataSorted.push([
          UNKNOWN_KEY,
          { subCategory: {}, value: 0 }
        ]);
        unknownItem = chartDataSorted[index];
      }

      rest.forEach((restItem) => {
        if (unknownItem?.[1]) {
          unknownItem[1] = {
            subCategory: {},
            value: unknownItem[1].value + restItem[1].value
          };
        }
      });

      // Sort data again
      chartDataSorted = chartDataSorted
        .sort((a, b) => {
          return a[1].value - b[1].value;
        })
        .reverse();
    }

    chartDataSorted.forEach(([symbol, item], index) => {
      if (this.colorMap[symbol]) {
        // Reuse color
        item.color = this.colorMap[symbol];
      } else {
        const color =
          this.getColorPalette()[index % this.getColorPalette().length];

        // Store color for reuse
        this.colorMap[symbol] = color;

        item.color = color;
      }
    });

    const backgroundColorSubCategory: string[] = [];
    const dataSubCategory: number[] = [];
    const labelSubCategory: string[] = [];

    chartDataSorted.forEach(([, item]) => {
      let lightnessRatio = 0.2;

      Object.keys(item.subCategory).forEach((subCategory) => {
        backgroundColorSubCategory.push(
          Color(item.color).lighten(lightnessRatio).hex()
        );
        dataSubCategory.push(item.subCategory[subCategory].value);
        labelSubCategory.push(subCategory);

        lightnessRatio += 0.1;
      });
    });

    const datasets = [
      {
        backgroundColor: chartDataSorted.map(([, item]) => {
          return item.color;
        }),
        borderWidth: 0,
        data: chartDataSorted.map(([, item]) => {
          return item.value;
        })
      }
    ];

    let labels = chartDataSorted.map(([label]) => {
      return label;
    });

    if (this.keys[1]) {
      datasets.unshift({
        backgroundColor: backgroundColorSubCategory,
        borderWidth: 0,
        data: dataSubCategory
      });

      labels = labelSubCategory.concat(labels);
    }

    const data = {
      datasets,
      labels
    };

    if (this.chartCanvas) {
      if (this.chart) {
        this.chart.data = data;
        this.chart.update();
      } else {
        this.chart = new Chart(this.chartCanvas.nativeElement, {
          data,
          options: {
            cutout: '70%',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const labelIndex =
                      (data.datasets[context.datasetIndex - 1]?.data?.length ??
                        0) + context.dataIndex;
                    const label = context.chart.data.labels[labelIndex];

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
