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
import { DateRange, GroupBy } from '@ghostfolio/common/types';
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

@Component({
  selector: 'gf-investment-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './investment-chart.component.html',
  styleUrls: ['./investment-chart.component.scss']
})
export class InvestmentChartComponent implements OnChanges, OnDestroy {
  @Input() benchmarkDataItems: InvestmentItem[] = [];
  @Input() currency: string;
  @Input() daysInMarket: number;
  @Input() groupBy: GroupBy;
  @Input() historicalDataItems: LineChartItem[] = [];
  @Input() isInPercent = false;
  @Input() locale: string;
  @Input() range: DateRange = 'max';
  @Input() savingsRate = 0;

  @ViewChild('chartCanvas') chartCanvas;

  public chart: Chart<any>;
  public isLoading = true;

  private data: InvestmentItem[];

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
    this.isLoading = true;

    // Create a clone
    this.data = this.benchmarkDataItems.map((item) => Object.assign({}, item));

    if (!this.groupBy && this.data?.length > 0) {
      if (this.range === 'max') {
        // Extend chart by 5% of days in market (before)
        const firstItem = this.data[0];
        this.data.unshift({
          ...firstItem,
          date: format(
            subDays(parseISO(firstItem.date), this.daysInMarket * 0.05 || 90),
            DATE_FORMAT
          ),
          investment: 0
        });
      }

      // Extend chart by 5% of days in market (after)
      const lastItem = this.data[this.data.length - 1];
      this.data.push({
        ...lastItem,
        date: format(
          addDays(parseDate(lastItem.date), this.daysInMarket * 0.05 || 90),
          DATE_FORMAT
        )
      });
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
          data: this.data.map(({ date, investment }) => {
            return {
              x: parseDate(date),
              y: this.isInPercent ? investment * 100 : investment
            };
          }),
          label: $localize`Deposit`,
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
          data: this.historicalDataItems.map(({ date, value }) => {
            return {
              x: parseDate(date),
              y: this.isInPercent ? value * 100 : value
            };
          }),
          fill: false,
          label: $localize`Total Amount`,
          pointRadius: 0
        }
      ]
    };

    if (this.chartCanvas) {
      if (this.chart) {
        this.chart.data = data;
        this.chart.options.plugins.tooltip = <unknown>(
          this.getTooltipPluginConfiguration()
        );
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
                hoverBackgroundColor: getBackgroundColor(),
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
                    borderColor: `rgba(${getTextColor()}, 0.1)`,
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
                color: `rgba(${getTextColor()}, 0.1)`
              }
            },
            responsive: true,
            scales: {
              x: {
                display: true,
                grid: {
                  borderColor: `rgba(${getTextColor()}, 0.1)`,
                  borderWidth: this.groupBy ? 0 : 1,
                  color: `rgba(${getTextColor()}, 0.8)`,
                  display: false
                },
                type: 'time',
                time: {
                  tooltipFormat: getDateFormatString(this.locale),
                  unit: 'year'
                }
              },
              y: {
                display: !this.isInPercent,
                grid: {
                  borderColor: `rgba(${getTextColor()}, 0.1)`,
                  color: `rgba(${getTextColor()}, 0.8)`,
                  display: false,
                  drawBorder: false
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
          plugins: [getVerticalHoverLinePlugin(this.chartCanvas)],
          type: this.groupBy ? 'bar' : 'line'
        });
      }
    }

    this.isLoading = false;
  }

  private getTooltipPluginConfiguration() {
    return {
      ...getTooltipOptions({
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
