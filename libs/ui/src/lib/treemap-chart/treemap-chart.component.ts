import {
  getAnnualizedPerformancePercent,
  getIntervalFromDateRange
} from '@ghostfolio/common/calculation-helper';
import { getTooltipOptions } from '@ghostfolio/common/chart-helper';
import { getLocale } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  PortfolioPosition
} from '@ghostfolio/common/interfaces';
import { ColorScheme, DateRange } from '@ghostfolio/common/types';

import { CommonModule } from '@angular/common';
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
import { ChartConfiguration } from 'chart.js';
import { LinearScale } from 'chart.js';
import { Chart, Tooltip } from 'chart.js';
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap';
import { differenceInDays, max } from 'date-fns';
import { orderBy } from 'lodash';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

const { gray, green, red } = require('open-color');

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgxSkeletonLoaderModule],
  selector: 'gf-treemap-chart',
  standalone: true,
  styleUrls: ['./treemap-chart.component.scss'],
  templateUrl: './treemap-chart.component.html'
})
export class GfTreemapChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() baseCurrency: string;
  @Input() colorScheme: ColorScheme;
  @Input() cursor: string;
  @Input() dateRange: DateRange;
  @Input() holdings: PortfolioPosition[];
  @Input() locale = getLocale();

  @Output() treemapChartClicked = new EventEmitter<AssetProfileIdentifier>();

  @ViewChild('chartCanvas') chartCanvas: ElementRef<HTMLCanvasElement>;

  public static readonly HEAT_MULTIPLIER = 5;

  public chart: Chart<'treemap'>;
  public isLoading = true;

  public constructor() {
    Chart.register(LinearScale, Tooltip, TreemapController, TreemapElement);
  }

  public ngAfterViewInit() {
    if (this.holdings) {
      this.initialize();
    }
  }

  public ngOnChanges() {
    if (this.holdings) {
      this.initialize();
    }
  }

  public ngOnDestroy() {
    this.chart?.destroy();
  }

  private initialize() {
    this.isLoading = true;

    const { endDate, startDate } = getIntervalFromDateRange(this.dateRange);
    const netPerformancePercentsWithCurrencyEffect = this.holdings.map(
      ({ dateOfFirstActivity, netPerformancePercentWithCurrencyEffect }) => {
        return getAnnualizedPerformancePercent({
          daysInMarket: differenceInDays(
            endDate,
            max([dateOfFirstActivity ?? new Date(0), startDate])
          ),
          netPerformancePercentage: new Big(
            netPerformancePercentWithCurrencyEffect
          )
        }).toNumber();
      }
    );

    const positiveNetPerformancePercents =
      netPerformancePercentsWithCurrencyEffect.filter((v) => {
        return v > 0;
      });
    const positiveNetPerformancePercentsRange = {
      max: Math.max(...positiveNetPerformancePercents),
      min: Math.min(...positiveNetPerformancePercents)
    };

    const negativeNetPerformancePercents =
      netPerformancePercentsWithCurrencyEffect.filter((v) => {
        return v < 0;
      });
    const negativeNetPerformancePercentsRange = {
      max: Math.max(...negativeNetPerformancePercents),
      min: Math.min(...negativeNetPerformancePercents)
    };

    const data: ChartConfiguration['data'] = {
      datasets: [
        {
          backgroundColor(ctx) {
            let annualizedNetPerformancePercentWithCurrencyEffect =
              getAnnualizedPerformancePercent({
                daysInMarket: differenceInDays(
                  endDate,
                  max([
                    ctx.raw._data.dateOfFirstActivity ?? new Date(0),
                    startDate
                  ])
                ),
                netPerformancePercentage: new Big(
                  ctx.raw._data.netPerformancePercentWithCurrencyEffect
                )
              }).toNumber();

            // Round to 2 decimal places
            annualizedNetPerformancePercentWithCurrencyEffect =
              Math.round(
                annualizedNetPerformancePercentWithCurrencyEffect * 100
              ) / 100;

            if (
              Math.abs(annualizedNetPerformancePercentWithCurrencyEffect) === 0
            ) {
              annualizedNetPerformancePercentWithCurrencyEffect = Math.abs(
                annualizedNetPerformancePercentWithCurrencyEffect
              );
              return gray[3];
            } else if (annualizedNetPerformancePercentWithCurrencyEffect > 0) {
              const range =
                positiveNetPerformancePercentsRange.max -
                positiveNetPerformancePercentsRange.min;

              if (
                annualizedNetPerformancePercentWithCurrencyEffect >=
                positiveNetPerformancePercentsRange.max - range * 0.25
              ) {
                return green[9];
              } else if (
                annualizedNetPerformancePercentWithCurrencyEffect >=
                positiveNetPerformancePercentsRange.max - range * 0.5
              ) {
                return green[7];
              } else if (
                annualizedNetPerformancePercentWithCurrencyEffect >=
                positiveNetPerformancePercentsRange.max - range * 0.75
              ) {
                return green[5];
              }

              return green[3];
            }

            const range =
              negativeNetPerformancePercentsRange.min -
              negativeNetPerformancePercentsRange.max;

            if (
              annualizedNetPerformancePercentWithCurrencyEffect <=
              negativeNetPerformancePercentsRange.min + range * 0.25
            ) {
              return red[9];
            } else if (
              annualizedNetPerformancePercentWithCurrencyEffect <=
              negativeNetPerformancePercentsRange.min + range * 0.5
            ) {
              return red[7];
            } else if (
              annualizedNetPerformancePercentWithCurrencyEffect <=
              negativeNetPerformancePercentsRange.min + range * 0.75
            ) {
              return red[5];
            }

            return red[3];
          },
          borderRadius: 4,
          key: 'allocationInPercentage',
          labels: {
            align: 'left',
            color: ['white'],
            display: true,
            font: [{ size: 16 }, { lineHeight: 1.5, size: 14 }],
            formatter(ctx) {
              const netPerformancePercentWithCurrencyEffect =
                ctx.raw._data.netPerformancePercentWithCurrencyEffect;

              return [
                ctx.raw._data.symbol,
                `${netPerformancePercentWithCurrencyEffect > 0 ? '+' : ''}${(ctx.raw._data.netPerformancePercentWithCurrencyEffect * 100).toFixed(2)}%`
              ];
            },
            hoverColor: 'white',
            position: 'top'
          },
          spacing: 1,
          tree: this.holdings
        }
      ]
    } as any;

    if (this.chartCanvas) {
      if (this.chart) {
        this.chart.data = data;
        this.chart.options.plugins.tooltip =
          this.getTooltipPluginConfiguration() as unknown;
        this.chart.update();
      } else {
        this.chart = new Chart(this.chartCanvas.nativeElement, {
          data,
          options: {
            animation: false,
            onClick: (event, activeElements) => {
              try {
                const dataIndex = activeElements[0].index;
                const datasetIndex = activeElements[0].datasetIndex;

                const dataset = orderBy(
                  event.chart.data.datasets[datasetIndex].tree,
                  ['allocationInPercentage'],
                  ['desc']
                );

                const dataSource: DataSource = dataset[dataIndex].dataSource;
                const symbol: string = dataset[dataIndex].symbol;

                this.treemapChartClicked.emit({ dataSource, symbol });
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
              tooltip: this.getTooltipPluginConfiguration()
            }
          } as unknown,
          type: 'treemap'
        });
      }
    }

    this.isLoading = false;
  }

  private getTooltipPluginConfiguration() {
    return {
      ...getTooltipOptions({
        colorScheme: this.colorScheme,
        currency: this.baseCurrency,
        locale: this.locale
      }),
      callbacks: {
        label: (context) => {
          const name = context.raw._data.name;
          const symbol = context.raw._data.symbol;

          if (context.raw._data.valueInBaseCurrency !== null) {
            const value = context.raw._data.valueInBaseCurrency as number;

            return [
              `${name ?? symbol}`,
              `${value.toLocaleString(this.locale, {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2
              })} ${this.baseCurrency}`
            ];
          } else {
            const percentage =
              (context.raw._data.allocationInPercentage as number) * 100;

            return [`${name ?? symbol}`, `${percentage.toFixed(2)}%`];
          }
        },
        title: () => {
          return '';
        }
      },
      xAlign: 'center',
      yAlign: 'center'
    };
  }
}
