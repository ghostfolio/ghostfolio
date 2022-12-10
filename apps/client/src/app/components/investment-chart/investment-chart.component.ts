import 'chartjs-adapter-date-fns';

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild
} from '@angular/core';
import {
  getTooltipOptions,
  getTooltipPositionerMapTop,
  getVerticalHoverLinePlugin
} from '@ghostfolio/common/chart-helper';
import { primaryColorRgb, secondaryColorRgb } from '@ghostfolio/common/config';
import {
  DATE_FORMAT,
  getBackgroundColor,
  getDateFormatString,
  getTextColor,
  parseDate,
  transformTickToAbbreviation
} from '@ghostfolio/common/helper';
import { LineChartItem } from '@ghostfolio/common/interfaces';
import { InvestmentItem } from '@ghostfolio/common/interfaces/investment-item.interface';
import { ColorScheme, DateRange, GroupBy } from '@ghostfolio/common/types';
import {
  BarController,
  BarElement,
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Tooltip
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { addDays, format, isAfter, parseISO, subDays } from 'date-fns';
import { last } from 'lodash';

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
  @Input() locale: string;
  @Input() range: DateRange = 'max';
  @Input() savingsRate = 0;

  @ViewChild('chartCanvas') chartCanvas;

  public chart: Chart<any>;
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

    if (!this.groupBy && this.investments?.length > 0) {
      let date: string;

      if (this.range === 'max') {
        // Extend chart by 5% of days in market (before)
        date = format(
          subDays(
            parseISO(this.investments[0].date),
            this.daysInMarket * 0.05 || 90
          ),
          DATE_FORMAT
        );
        this.investments.unshift({
          date,
          investment: 0
        });
        this.values.unshift({
          date,
          value: 0
        });
      }

      // Extend chart by 5% of days in market (after)
      date = format(
        addDays(
          parseDate(last(this.investments).date),
          this.daysInMarket * 0.05 || 90
        ),
        DATE_FORMAT
      );
      this.investments.push({
        date,
        investment: last(this.investments).investment
      });
      this.values.push({ date, value: last(this.values).value });
    }

    const data = {
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
              x: parseDate(date),
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
              x: parseDate(date),
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
      if (this.chart) {
        this.chart.data = data;
        this.chart.options.plugins.tooltip = <unknown>(
          this.getTooltipPluginConfiguration()
        );
        this.chart.options.scales.x.min = this.daysInMarket
          ? subDays(new Date(), this.daysInMarket).toISOString()
          : undefined;
        this.chart.update();
      } else {
        this.chart = new Chart(this.chartCanvas.nativeElement, {
          data,
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
                  color: `rgba(${getTextColor(this.colorScheme)}, 0.8)`,
                  display: false
                },
                min: this.daysInMarket
                  ? subDays(new Date(), this.daysInMarket).toISOString()
                  : undefined,
                suggestedMax: new Date().toISOString(),
                type: 'time',
                time: {
                  tooltipFormat: getDateFormatString(this.locale),
                  unit: 'year'
                }
              },
              y: {
                border: {
                  color: `rgba(${getTextColor(this.colorScheme)}, 0.1)`,
                  display: false
                },
                display: !this.isInPercent,
                grid: {
                  color: `rgba(${getTextColor(this.colorScheme)}, 0.8)`,
                  display: false
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
