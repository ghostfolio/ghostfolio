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
import { primaryColorRgb } from '@ghostfolio/common/config';
import {
  getBackgroundColor,
  getDateFormatString,
  getTextColor,
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
  TimeScale,
  Tooltip
} from 'chart.js';
import { addDays, isAfter, parseISO, subDays } from 'date-fns';

@Component({
  selector: 'gf-investment-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './investment-chart.component.html',
  styleUrls: ['./investment-chart.component.scss']
})
export class InvestmentChartComponent implements OnChanges, OnDestroy {
  @Input() currency: string;
  @Input() daysInMarket: number;
  @Input() investments: InvestmentItem[];
  @Input() isInPercent = false;
  @Input() locale: string;

  @ViewChild('chartCanvas') chartCanvas;

  public chart: Chart;
  public isLoading = true;

  public constructor() {
    Chart.register(
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
          label: 'Investment',
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
        this.chart.options.plugins.tooltip = <unknown>(
          this.getTooltipPluginConfiguration()
        );
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
                hoverBackgroundColor: getBackgroundColor(),
                hoverRadius: 2,
                radius: 0
              }
            },
            interaction: { intersect: false, mode: 'index' },
            maintainAspectRatio: true,
            plugins: <unknown>{
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
          plugins: [getVerticalHoverLinePlugin(this.chartCanvas)],
          type: 'line'
        });

        this.isLoading = false;
      }
    }
  }

  private getTooltipPluginConfiguration() {
    return {
      ...getTooltipOptions(
        this.isInPercent ? undefined : this.currency,
        this.isInPercent ? undefined : this.locale
      ),
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
