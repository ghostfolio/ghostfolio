import {
  getTooltipOptions,
  getTooltipPositionerMapTop,
  getVerticalHoverLinePlugin,
  transformTickToAbbreviation
} from '@ghostfolio/common/chart-helper';
import { primaryColorRgb, secondaryColorRgb } from '@ghostfolio/common/config';
import {
  getBackgroundColor,
  getDateFormatString,
  getLocale,
  getTextColor,
  parseDate
} from '@ghostfolio/common/helper';
import { LineChartItem } from '@ghostfolio/common/interfaces';
import { InvestmentItem } from '@ghostfolio/common/interfaces/investment-item.interface';
import { ColorScheme, DateRange, GroupBy } from '@ghostfolio/common/types';

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild
} from '@angular/core';
import {
  BarController,
  BarElement,
  Chart,
  ChartData,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Tooltip
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import annotationPlugin from 'chartjs-plugin-annotation';
import { isAfter, isValid, min, subDays } from 'date-fns';
import { first } from 'lodash';

@Component({
  selector: 'gf-investment-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './investment-chart.component.html',
  styleUrls: ['./investment-chart.component.scss']
})
export class InvestmentChartComponent implements OnChanges, OnDestroy {
  @Input() benchmarkDataItems: InvestmentItem[] = [];
  @Input() benchmarkDataLabel = '';
  @Input() colorScheme: ColorScheme;
  @Input() currency: string;
  @Input() daysInMarket: number;
  @Input() groupBy: GroupBy;
  @Input() historicalDataItems: LineChartItem[] = [];
  @Input() isInPercent = false;
  @Input() isLoading = false;
  @Input() locale = getLocale();
  @Input() range: DateRange = 'max';
  @Input() savingsRate = 0;

  @ViewChild('chartCanvas') chartCanvas;

  public chart: Chart<'bar' | 'line'>;
  private investments: InvestmentItem[];
  private values: LineChartItem[];

  public constructor() {
    Chart.register(
      annotationPlugin,
      BarController,
      BarElement,
      LinearScale,
      LineController,
      LineElement,
      PointElement,
      TimeScale,
      Tooltip
    );

    Tooltip.positioners['top'] = (elements, position) =>
      getTooltipPositionerMapTop(this.chart, position);
  }

  public ngOnChanges() {
    if (this.benchmarkDataItems && this.historicalDataItems) {
      this.initialize();
    }
  }

  public ngOnDestroy() {
    this.chart?.destroy();
  }

  private initialize() {
    // Create a clone
    this.investments = this.benchmarkDataItems.map((item) =>
      Object.assign({}, item)
    );
    this.values = this.historicalDataItems.map((item) =>
      Object.assign({}, item)
    );

    const chartData: ChartData<'bar' | 'line'> = {
      labels: this.historicalDataItems.map(({ date }) => {
        return parseDate(date);
      }),
      datasets: [
        {
          backgroundColor: `rgb(${secondaryColorRgb.r}, ${secondaryColorRgb.g}, ${secondaryColorRgb.b})`,
          borderColor: `rgb(${secondaryColorRgb.r}, ${secondaryColorRgb.g}, ${secondaryColorRgb.b})`,
          borderWidth: this.groupBy ? 0 : 1,
          data: this.investments.map(({ date, investment }) => {
            return {
              x: parseDate(date).getTime(),
              y: this.isInPercent ? investment * 100 : investment
            };
          }),
          label: this.benchmarkDataLabel,
          segment: {
            borderColor: (context: unknown) =>
              this.isInFuture(
                context,
                `rgba(${secondaryColorRgb.r}, ${secondaryColorRgb.g}, ${secondaryColorRgb.b}, 0.67)`
              ),
            borderDash: (context: unknown) => this.isInFuture(context, [2, 2])
          },
          stepped: true
        },
        {
          borderColor: `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`,
          borderWidth: 2,
          data: this.values.map(({ date, value }) => {
            return {
              x: parseDate(date).getTime(),
              y: this.isInPercent ? value * 100 : value
            };
          }),
          fill: false,
          label: $localize`Total Amount`,
          pointRadius: 0,
          segment: {
            borderColor: (context: unknown) =>
              this.isInFuture(
                context,
                `rgba(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b}, 0.67)`
              ),
            borderDash: (context: unknown) => this.isInFuture(context, [2, 2])
          }
        }
      ]
    };

    if (this.chartCanvas) {
      let scaleXMin: string;

      if (this.daysInMarket) {
        const minDate = min([
          parseDate(first(this.investments)?.date),
          subDays(new Date().setHours(0, 0, 0, 0), this.daysInMarket)
        ]);

        scaleXMin = isValid(minDate) ? minDate.toISOString() : undefined;
      }

      if (this.chart) {
        this.chart.data = chartData;
        this.chart.options.plugins.tooltip = <unknown>(
          this.getTooltipPluginConfiguration()
        );
        this.chart.options.scales.x.min = scaleXMin;

        if (
          this.savingsRate &&
          // @ts-ignore
          this.chart.options.plugins.annotation.annotations.savingsRate
        ) {
          // @ts-ignore
          this.chart.options.plugins.annotation.annotations.savingsRate.value =
            this.savingsRate;
        }

        this.chart.update();
      } else {
        this.chart = new Chart(this.chartCanvas.nativeElement, {
          data: chartData,
          options: {
            animation: false,
            elements: {
              line: {
                tension: 0
              },
              point: {
                hoverBackgroundColor: getBackgroundColor(this.colorScheme),
                hoverRadius: 2,
                radius: 0
              }
            },
            interaction: { intersect: false, mode: 'index' },
            maintainAspectRatio: true,
            plugins: <unknown>{
              annotation: {
                annotations: {
                  savingsRate: this.savingsRate
                    ? {
                        borderColor: `rgba(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b}, 0.75)`,
                        borderWidth: 1,
                        label: {
                          backgroundColor: `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`,
                          borderRadius: 2,
                          color: 'white',
                          content: $localize`Savings Rate`,
                          display: true,
                          font: { size: '10px', weight: 'normal' },
                          padding: {
                            x: 4,
                            y: 2
                          },
                          position: 'start'
                        },
                        scaleID: 'y',
                        type: 'line',
                        value: this.savingsRate
                      }
                    : undefined,
                  yAxis: {
                    borderColor: `rgba(${getTextColor(this.colorScheme)}, 0.1)`,
                    borderWidth: 1,
                    scaleID: 'y',
                    type: 'line',
                    value: 0
                  }
                }
              },
              legend: {
                display: false
              },
              tooltip: this.getTooltipPluginConfiguration(),
              verticalHoverLine: {
                color: `rgba(${getTextColor(this.colorScheme)}, 0.1)`
              }
            },
            responsive: true,
            scales: {
              x: {
                border: {
                  color: `rgba(${getTextColor(this.colorScheme)}, 0.1)`,
                  width: this.groupBy ? 0 : 1
                },
                display: true,
                grid: {
                  display: false
                },
                min: scaleXMin,
                type: 'time',
                time: {
                  tooltipFormat: getDateFormatString(this.locale),
                  unit: 'year'
                }
              },
              y: {
                border: {
                  display: false
                },
                display: !this.isInPercent,
                grid: {
                  color: ({ scale, tick }) => {
                    if (
                      tick.value === 0 ||
                      tick.value === scale.max ||
                      tick.value === scale.min
                    ) {
                      return `rgba(${getTextColor(this.colorScheme)}, 0.1)`;
                    }

                    return 'transparent';
                  }
                },
                position: 'right',
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
          plugins: [
            getVerticalHoverLinePlugin(this.chartCanvas, this.colorScheme)
          ],
          type: this.groupBy ? 'bar' : 'line'
        });
      }
    }
  }

  private getTooltipPluginConfiguration() {
    return {
      ...getTooltipOptions({
        colorScheme: this.colorScheme,
        currency: this.isInPercent ? undefined : this.currency,
        groupBy: this.groupBy,
        locale: this.isInPercent ? undefined : this.locale,
        unit: this.isInPercent ? '%' : undefined
      }),
      mode: 'index',
      position: <unknown>'top',
      xAlign: 'center',
      yAlign: 'bottom'
    };
  }

  private isInFuture<T>(aContext: any, aValue: T) {
    return isAfter(new Date(aContext?.p1?.parsed?.x), new Date())
      ? aValue
      : undefined;
  }
}
