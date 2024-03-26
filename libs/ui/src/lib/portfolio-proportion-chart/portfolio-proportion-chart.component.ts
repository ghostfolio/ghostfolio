import { getTooltipOptions } from '@ghostfolio/common/chart-helper';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { getLocale, getTextColor } from '@ghostfolio/common/helper';
import { PortfolioPosition, UniqueAsset } from '@ghostfolio/common/interfaces';
import { ColorScheme } from '@ghostfolio/common/types';
import { translate } from '@ghostfolio/ui/i18n';

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import { DataSource } from '@prisma/client';
import { Big } from 'big.js';
import { ChartConfiguration, Tooltip } from 'chart.js';
import { LinearScale } from 'chart.js';
import { ArcElement } from 'chart.js';
import { DoughnutController } from 'chart.js';
import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import * as Color from 'color';

@Component({
  selector: 'gf-portfolio-proportion-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio-proportion-chart.component.html',
  styleUrls: ['./portfolio-proportion-chart.component.scss']
})
export class PortfolioProportionChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() baseCurrency: string;
  @Input() colorScheme: ColorScheme;
  @Input() cursor: string;
  @Input() isInPercent = false;
  @Input() keys: string[] = [];
  @Input() locale = getLocale();
  @Input() maxItems?: number;
  @Input() showLabels = false;
  @Input() positions: {
    [symbol: string]: Pick<PortfolioPosition, 'type'> & {
      dataSource?: DataSource;
      name: string;
      value: number;
    };
  } = {};

  @Output() proportionChartClicked = new EventEmitter<UniqueAsset>();

  @ViewChild('chartCanvas') chartCanvas: ElementRef<HTMLCanvasElement>;

  public chart: Chart<'pie'>;
  public isLoading = true;

  private readonly OTHER_KEY = 'OTHER';

  private colorMap: {
    [symbol: string]: string;
  } = {};

  public constructor() {
    Chart.register(ArcElement, DoughnutController, LinearScale, Tooltip);
  }

  public ngAfterViewInit() {
    if (this.positions) {
      this.initialize();
    }
  }

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
        name: string;
        subCategory?: { [symbol: string]: { value: Big } };
        value: Big;
      };
    } = {};
    this.colorMap = {
      [this.OTHER_KEY]: `rgba(${getTextColor(this.colorScheme)}, 0.24)`,
      [UNKNOWN_KEY]: `rgba(${getTextColor(this.colorScheme)}, 0.12)`
    };

    if (this.keys.length > 0) {
      Object.keys(this.positions).forEach((symbol) => {
        if (this.positions[symbol][this.keys[0]]?.toUpperCase()) {
          if (chartData[this.positions[symbol][this.keys[0]].toUpperCase()]) {
            chartData[
              this.positions[symbol][this.keys[0]].toUpperCase()
            ].value = chartData[
              this.positions[symbol][this.keys[0]].toUpperCase()
            ].value.plus(this.positions[symbol].value);

            if (
              chartData[this.positions[symbol][this.keys[0]].toUpperCase()]
                .subCategory[this.positions[symbol][this.keys[1]]]
            ) {
              chartData[
                this.positions[symbol][this.keys[0]].toUpperCase()
              ].subCategory[this.positions[symbol][this.keys[1]]].value =
                chartData[
                  this.positions[symbol][this.keys[0]].toUpperCase()
                ].subCategory[this.positions[symbol][this.keys[1]]].value.plus(
                  this.positions[symbol].value
                );
            } else {
              chartData[
                this.positions[symbol][this.keys[0]].toUpperCase()
              ].subCategory[
                this.positions[symbol][this.keys[1]] ?? UNKNOWN_KEY
              ] = { value: new Big(this.positions[symbol].value) };
            }
          } else {
            chartData[this.positions[symbol][this.keys[0]].toUpperCase()] = {
              name: this.positions[symbol][this.keys[0]],
              subCategory: {},
              value: new Big(this.positions[symbol].value ?? 0)
            };

            if (this.positions[symbol][this.keys[1]]) {
              chartData[
                this.positions[symbol][this.keys[0]].toUpperCase()
              ].subCategory = {
                [this.positions[symbol][this.keys[1]]]: {
                  value: new Big(this.positions[symbol].value)
                }
              };
            }
          }
        } else {
          if (chartData[UNKNOWN_KEY]) {
            chartData[UNKNOWN_KEY].value = chartData[UNKNOWN_KEY].value.plus(
              this.positions[symbol].value
            );
          } else {
            chartData[UNKNOWN_KEY] = {
              name: this.positions[symbol].name,
              subCategory: this.keys[1]
                ? { [this.keys[1]]: { value: new Big(0) } }
                : undefined,
              value: new Big(this.positions[symbol].value)
            };
          }
        }
      });
    } else {
      Object.keys(this.positions).forEach((symbol) => {
        chartData[symbol] = {
          name: this.positions[symbol].name,
          value: new Big(this.positions[symbol].value)
        };
      });
    }

    let chartDataSorted = Object.entries(chartData)
      .sort((a, b) => {
        return a[1].value.minus(b[1].value).toNumber();
      })
      .reverse();

    if (this.maxItems && chartDataSorted.length > this.maxItems) {
      // Add surplus items to OTHER group
      const rest = chartDataSorted.splice(
        this.maxItems,
        chartDataSorted.length - 1
      );

      chartDataSorted.push([
        this.OTHER_KEY,
        { name: this.OTHER_KEY, subCategory: {}, value: new Big(0) }
      ]);
      const otherItem = chartDataSorted[chartDataSorted.length - 1];

      rest.forEach((restItem) => {
        if (otherItem?.[1]) {
          otherItem[1] = {
            name: this.OTHER_KEY,
            subCategory: {},
            value: otherItem[1].value.plus(restItem[1].value)
          };
        }
      });

      // Sort data again
      chartDataSorted = chartDataSorted
        .sort((a, b) => {
          return a[1].value.minus(b[1].value).toNumber();
        })
        .reverse();
    }

    chartDataSorted.forEach(([symbol, item], index) => {
      if (this.colorMap[symbol]) {
        // Reuse color
        item.color = this.colorMap[symbol];
      } else {
        item.color =
          this.getColorPalette()[index % this.getColorPalette().length];
      }
    });

    const backgroundColorSubCategory: string[] = [];
    const dataSubCategory: number[] = [];
    const labelSubCategory: string[] = [];

    chartDataSorted.forEach(([, item]) => {
      let lightnessRatio = 0.2;

      Object.keys(item.subCategory ?? {}).forEach((subCategory) => {
        backgroundColorSubCategory.push(
          Color(item.color).lighten(lightnessRatio).hex()
        );
        dataSubCategory.push(item.subCategory[subCategory].value.toNumber());
        labelSubCategory.push(subCategory);

        lightnessRatio += 0.1;
      });
    });

    const datasets: ChartConfiguration['data']['datasets'] = [
      {
        backgroundColor: chartDataSorted.map(([, item]) => {
          return item.color;
        }),
        borderWidth: 0,
        data: chartDataSorted.map(([, item]) => {
          return item.value.toNumber();
        })
      }
    ];

    let labels = chartDataSorted.map(([symbol, { name }]) => {
      return name;
    });

    if (this.keys[1]) {
      datasets.unshift({
        backgroundColor: backgroundColorSubCategory,
        borderWidth: 0,
        data: dataSubCategory
      });

      labels = labelSubCategory.concat(labels);
    }

    if (datasets[0]?.data?.length === 0 || datasets[0]?.data?.[0] === 0) {
      labels = [''];
      datasets[0].backgroundColor = [this.colorMap[UNKNOWN_KEY]];
      datasets[0].data[0] = Number.MAX_SAFE_INTEGER;
    }

    if (datasets[1]?.data?.length === 0 || datasets[1]?.data?.[1] === 0) {
      labels = [''];
      datasets[1].backgroundColor = [this.colorMap[UNKNOWN_KEY]];
      datasets[1].data[1] = Number.MAX_SAFE_INTEGER;
    }

    const data: ChartConfiguration['data'] = {
      datasets,
      labels
    };

    if (this.chartCanvas) {
      if (this.chart) {
        this.chart.data = data;
        this.chart.options.plugins.tooltip = <unknown>(
          this.getTooltipPluginConfiguration(data)
        );
        this.chart.update();
      } else {
        this.chart = new Chart(this.chartCanvas.nativeElement, {
          data,
          options: <unknown>{
            animation: false,
            cutout: '70%',
            layout: {
              padding: this.showLabels === true ? 100 : 0
            },
            onClick: (event, activeElements) => {
              try {
                const dataIndex = activeElements[0].index;
                const symbol: string = event.chart.data.labels[dataIndex];

                const dataSource = this.positions[symbol]?.dataSource;

                this.proportionChartClicked.emit({ dataSource, symbol });
              } catch {}
            },
            onHover: (event, chartElement) => {
              if (this.cursor) {
                event.native.target.style.cursor = chartElement[0]
                  ? this.cursor
                  : 'default';
              }
            },
            plugins: {
              datalabels: {
                color: (context) => {
                  return this.getColorPalette()[
                    context.dataIndex % this.getColorPalette().length
                  ];
                },
                display: this.showLabels === true ? 'auto' : false,
                labels: {
                  index: {
                    align: 'end',
                    anchor: 'end',
                    formatter: (value, context) => {
                      return value > 0
                        ? context.chart.data.labels?.[context.dataIndex]
                        : '';
                    },
                    offset: 8
                  }
                }
              },
              legend: { display: false },
              tooltip: this.getTooltipPluginConfiguration(data)
            }
          },
          plugins: [ChartDataLabels],
          type: 'doughnut'
        });
      }
    }

    this.isLoading = false;
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

  private getTooltipPluginConfiguration(data: ChartConfiguration['data']) {
    return {
      ...getTooltipOptions({
        colorScheme: this.colorScheme,
        currency: this.baseCurrency,
        locale: this.locale
      }),
      callbacks: {
        label: (context) => {
          const labelIndex =
            (data.datasets[context.datasetIndex - 1]?.data?.length ?? 0) +
            context.dataIndex;
          let symbol = context.chart.data.labels?.[labelIndex] ?? '';

          if (symbol === this.OTHER_KEY) {
            symbol = $localize`Other`;
          } else if (symbol === UNKNOWN_KEY) {
            symbol = $localize`No data available`;
          }

          const name = translate(this.positions[<string>symbol]?.name);

          let sum = 0;
          for (const item of context.dataset.data) {
            sum += item;
          }

          const percentage = (context.parsed * 100) / sum;

          if (<number>context.raw === Number.MAX_SAFE_INTEGER) {
            return $localize`No data available`;
          } else if (this.isInPercent) {
            return [`${name ?? symbol}`, `${percentage.toFixed(2)}%`];
          } else {
            const value = <number>context.raw;
            return [
              `${name ?? symbol}`,
              `${value.toLocaleString(this.locale, {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2
              })} ${this.baseCurrency} (${percentage.toFixed(2)}%)`
            ];
          }
        },
        title: () => {
          return '';
        }
      }
    };
  }
}
