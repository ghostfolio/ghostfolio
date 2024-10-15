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
    const netPerformancePercentsWithCurrencyEffect = this.holdings.map((h) =>
      getAnnualizedPerformancePercent({
        daysInMarket: differenceInDays(
          endDate,
          max([h.dateOfFirstActivity ?? new Date(0), startDate])
        ),
        netPerformancePercentage: new Big(
          h.netPerformancePercentWithCurrencyEffect
        )
      }).toNumber()
    );

    const positiveNetPercents = netPerformancePercentsWithCurrencyEffect.filter(
      (v) => v > 0
    );
    const positiveNetPercentsRange = {
      max: Math.max(...positiveNetPercents),
      min: Math.min(...positiveNetPercents)
    };
    const negativeNetPercents = netPerformancePercentsWithCurrencyEffect.filter(
      (v) => v < 0
    );
    const negativeNetPercentsRange = {
      max: Math.max(...negativeNetPercents),
      min: Math.min(...negativeNetPercents)
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
            }

            if (annualizedNetPerformancePercentWithCurrencyEffect > 0) {
              const range =
                positiveNetPercentsRange.max - positiveNetPercentsRange.min;
              if (
                annualizedNetPerformancePercentWithCurrencyEffect >=
                positiveNetPercentsRange.max - range * 0.25
              ) {
                return green[9];
              }
              if (
                annualizedNetPerformancePercentWithCurrencyEffect >=
                positiveNetPercentsRange.max - range * 0.5
              ) {
                return green[7];
              }
              if (
                annualizedNetPerformancePercentWithCurrencyEffect >=
                positiveNetPercentsRange.max - range * 0.75
              ) {
                return green[5];
              }
              return green[3];
            }

            const range =
              negativeNetPercentsRange.min - negativeNetPercentsRange.max;
            if (
              annualizedNetPerformancePercentWithCurrencyEffect <=
              negativeNetPercentsRange.min + range * 0.25
            ) {
              return red[9];
            }
            if (
              annualizedNetPerformancePercentWithCurrencyEffect <=
              negativeNetPercentsRange.min + range * 0.5
            ) {
              return red[7];
            }
            if (
              annualizedNetPerformancePercentWithCurrencyEffect <=
              negativeNetPercentsRange.min + range * 0.75
            ) {
              return red[7];
            }
            return red[9];
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
