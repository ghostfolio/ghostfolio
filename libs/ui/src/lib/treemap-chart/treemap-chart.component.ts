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

import { GetColorParams } from './interfaces/interfaces';

const { gray, green, red } = require('open-color');

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgxSkeletonLoaderModule],
  selector: 'gf-treemap-chart',
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

  private getColor({
    annualizedNetPerformancePercent,
    negativeNetPerformancePercentsRange,
    positiveNetPerformancePercentsRange
  }: GetColorParams) {
    if (Math.abs(annualizedNetPerformancePercent) === 0) {
      return {
        backgroundColor: gray[3],
        fontColor: gray[9]
      };
    }

    if (annualizedNetPerformancePercent > 0) {
      let backgroundIndex: number;
      const range =
        positiveNetPerformancePercentsRange.max -
        positiveNetPerformancePercentsRange.min;

      if (
        annualizedNetPerformancePercent >=
        positiveNetPerformancePercentsRange.max - range * 0.25
      ) {
        backgroundIndex = 9;
      } else if (
        annualizedNetPerformancePercent >=
        positiveNetPerformancePercentsRange.max - range * 0.5
      ) {
        backgroundIndex = 7;
      } else if (
        annualizedNetPerformancePercent >=
        positiveNetPerformancePercentsRange.max - range * 0.75
      ) {
        backgroundIndex = 5;
      } else {
        backgroundIndex = 3;
      }

      return {
        backgroundColor: green[backgroundIndex],
        fontColor: green[backgroundIndex <= 4 ? 9 : 0]
      };
    } else {
      let backgroundIndex: number;
      const range =
        negativeNetPerformancePercentsRange.min -
        negativeNetPerformancePercentsRange.max;

      if (
        annualizedNetPerformancePercent <=
        negativeNetPerformancePercentsRange.min + range * 0.25
      ) {
        backgroundIndex = 9;
      } else if (
        annualizedNetPerformancePercent <=
        negativeNetPerformancePercentsRange.min + range * 0.5
      ) {
        backgroundIndex = 7;
      } else if (
        annualizedNetPerformancePercent <=
        negativeNetPerformancePercentsRange.min + range * 0.75
      ) {
        backgroundIndex = 5;
      } else {
        backgroundIndex = 3;
      }

      return {
        backgroundColor: red[backgroundIndex],
        fontColor: red[backgroundIndex <= 4 ? 9 : 0]
      };
    }
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
      netPerformancePercentsWithCurrencyEffect.filter(
        (annualizedNetPerformancePercent) => {
          return annualizedNetPerformancePercent > 0;
        }
      );

    const positiveNetPerformancePercentsRange = {
      max: Math.max(...positiveNetPerformancePercents),
      min: Math.min(...positiveNetPerformancePercents)
    };

    const negativeNetPerformancePercents =
      netPerformancePercentsWithCurrencyEffect.filter(
        (annualizedNetPerformancePercent) => {
          return annualizedNetPerformancePercent < 0;
        }
      );

    const negativeNetPerformancePercentsRange = {
      max: Math.max(...negativeNetPerformancePercents),
      min: Math.min(...negativeNetPerformancePercents)
    };

    const data: ChartConfiguration<'treemap'>['data'] = {
      datasets: [
        {
          backgroundColor: (ctx) => {
            let annualizedNetPerformancePercent =
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
            annualizedNetPerformancePercent =
              Math.round(annualizedNetPerformancePercent * 100) / 100;

            const { backgroundColor } = this.getColor({
              annualizedNetPerformancePercent,
              negativeNetPerformancePercentsRange,
              positiveNetPerformancePercentsRange
            });

            return backgroundColor;
          },
          borderRadius: 4,
          key: 'allocationInPercentage',
          labels: {
            align: 'left',
            color: (ctx) => {
              let annualizedNetPerformancePercent =
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
              annualizedNetPerformancePercent =
                Math.round(annualizedNetPerformancePercent * 100) / 100;

              const { fontColor } = this.getColor({
                annualizedNetPerformancePercent,
                negativeNetPerformancePercentsRange,
                positiveNetPerformancePercentsRange
              });

              return fontColor;
            },
            display: true,
            font: [{ size: 16 }, { lineHeight: 1.5, size: 14 }],
            formatter: (ctx) => {
              // Round to 4 decimal places
              let netPerformancePercentWithCurrencyEffect =
                Math.round(
                  ctx.raw._data.netPerformancePercentWithCurrencyEffect * 10000
                ) / 10000;

              if (Math.abs(netPerformancePercentWithCurrencyEffect) === 0) {
                netPerformancePercentWithCurrencyEffect = Math.abs(
                  netPerformancePercentWithCurrencyEffect
                );
              }

              return [
                ctx.raw._data.symbol,
                `${netPerformancePercentWithCurrencyEffect > 0 ? '+' : ''}${(netPerformancePercentWithCurrencyEffect * 100).toFixed(2)}%`
              ];
            },
            hoverColor: undefined,
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
            const sign =
              context.raw._data.netPerformanceWithCurrencyEffect > 0 ? '+' : '';

            return [
              `${name ?? symbol}`,
              `${value.toLocaleString(this.locale, {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2
              })} ${this.baseCurrency}`,
              `${sign}${context.raw._data.netPerformanceWithCurrencyEffect.toLocaleString(
                this.locale,
                {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2
                }
              )} (${sign}${(context.raw._data.netPerformancePercentWithCurrencyEffect * 100).toFixed(2)}%)`
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
