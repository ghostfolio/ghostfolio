import {
  getAnnualizedPerformancePercent,
  getIntervalFromDateRange
} from '@ghostfolio/common/calculation-helper';
import { getTooltipOptions } from '@ghostfolio/common/chart-helper';
import {
  canOpenHoldingDetail,
  getAssetProfileIdentifier,
  getHoldingName,
  getLocale,
  getTextColor
} from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  PortfolioPosition
} from '@ghostfolio/common/interfaces';
import { ColorScheme, DateRange } from '@ghostfolio/common/types';

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  OnChanges,
  OnDestroy,
  output,
  viewChild
} from '@angular/core';
import { Big } from 'big.js';
import type {
  ActiveElement,
  ChartData,
  TooltipItem,
  TooltipOptions
} from 'chart.js';
import { Chart, LinearScale, Tooltip } from 'chart.js';
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap';
import { isUUID } from 'class-validator';
import { differenceInDays, max } from 'date-fns';
import { orderBy, round } from 'lodash-es';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import OpenColor from 'open-color';

import { onPrefersColorSchemeChange } from '../chart';
import type {
  GetColorParams,
  GfTreemapDataPoint,
  GfTreemapScriptableContext
} from './interfaces/interfaces';

const { gray, green, red } = OpenColor;

// Duration of the highlight of a tile whose value changed on a refresh
const FLASH_DURATION_IN_MS = 1200;
const FLASH_FRAME_IN_MS = 100;

type Rgba = [number, number, number, number];

function getRgba(aHexColor: string, aAlpha = 1): Rgba {
  const hex = aHexColor.replace('#', '');

  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
    aAlpha
  ];
}

/** Mixes the color `aTop` with the opacity `aRatio` over `aBottom` */
function mix(aBottom: Rgba, aTop: Rgba, aRatio: number): Rgba {
  return [
    Math.round(aBottom[0] + (aTop[0] - aBottom[0]) * aRatio),
    Math.round(aBottom[1] + (aTop[1] - aBottom[1]) * aRatio),
    Math.round(aBottom[2] + (aTop[2] - aBottom[2]) * aRatio),
    aBottom[3] + (aTop[3] - aBottom[3]) * aRatio
  ];
}

function toCss([r, g, b, a]: Rgba) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxSkeletonLoaderModule],
  selector: 'gf-treemap-chart',
  styleUrls: ['./treemap-chart.component.scss'],
  templateUrl: './treemap-chart.component.html'
})
export class GfTreemapChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  public readonly baseCurrency = input.required<string>();
  public readonly colorScheme = input<ColorScheme>();
  public readonly cursor = input.required<string>();
  public readonly dateRange = input.required<DateRange>();
  public readonly holdings = input<PortfolioPosition[]>();
  public readonly locale = input<string>(getLocale());

  public readonly treemapChartClicked = output<AssetProfileIdentifier>();

  protected isLoading = true;

  private chart: Chart<'treemap'>;
  private flashes = new Map<string, { isUp: boolean; start: number }>();
  private flashTimer?: ReturnType<typeof setInterval>;
  private previousDateRange?: DateRange;
  private previousValues = new Map<string, number>();
  private readonly chartCanvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');

  public constructor() {
    Chart.register(LinearScale, Tooltip, TreemapController, TreemapElement);

    onPrefersColorSchemeChange(() => {
      if (this.chart && !this.colorScheme()) {
        this.initialize();
      }
    });
  }

  public ngAfterViewInit() {
    this.initialize();
  }

  public ngOnChanges() {
    this.initialize();
  }

  public ngOnDestroy() {
    clearInterval(this.flashTimer);
    this.chart?.destroy();
  }

  /**
   * Remembers the tiles whose absolute change differs from the previous
   * refresh of the same date range, to highlight them briefly
   */
  private detectChanges(aHoldings: PortfolioPosition[]) {
    const isRefresh =
      !!this.chart && this.previousDateRange === this.dateRange();

    const now = Date.now();

    for (const {
      assetProfile,
      netPerformanceWithCurrencyEffect
    } of aHoldings) {
      const key = getAssetProfileIdentifier(assetProfile);
      const previousValue = this.previousValues.get(key);

      if (
        isRefresh &&
        previousValue !== undefined &&
        netPerformanceWithCurrencyEffect !== previousValue
      ) {
        this.flashes.set(key, {
          isUp: netPerformanceWithCurrencyEffect > previousValue,
          start: now
        });
      }

      this.previousValues.set(key, netPerformanceWithCurrencyEffect);
    }

    this.previousDateRange = this.dateRange();

    if (this.flashes.size > 0 && !this.flashTimer) {
      this.flashTimer = setInterval(() => {
        for (const [key, { start }] of this.flashes) {
          if (Date.now() - start >= FLASH_DURATION_IN_MS) {
            this.flashes.delete(key);
          }
        }

        if (this.flashes.size === 0) {
          clearInterval(this.flashTimer);
          this.flashTimer = undefined;
        }

        this.chart?.update('none');
      }, FLASH_FRAME_IN_MS);
    }
  }

  /**
   * Returns the border of a tile: the background, or a green (up) or red
   * (down) highlight fading into the background after a change
   */
  private getBorderColor(aHolding: PortfolioPosition, aBackground: Rgba) {
    const flash = this.flashes.get(
      getAssetProfileIdentifier(aHolding.assetProfile)
    );

    if (!flash) {
      return toCss(aBackground);
    }

    const isReducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const ratio = isReducedMotion
      ? 1
      : Math.max(0, 1 - (Date.now() - flash.start) / FLASH_DURATION_IN_MS);

    return toCss(
      mix(aBackground, getRgba(flash.isUp ? green[6] : red[6]), ratio)
    );
  }

  /**
   * The tile of a holding whose market is closed is drawn faded, like its
   * figures in the holdings table, which are gray while it is closed
   */
  private isMarketClosed(aHolding: PortfolioPosition) {
    return aHolding.marketState !== 'open';
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

  private getHolding(
    chart: Chart<'treemap'>,
    activeElement: ActiveElement
  ): PortfolioPosition | undefined {
    if (!activeElement) {
      return undefined;
    }

    const dataset = orderBy(
      chart.data.datasets[activeElement.datasetIndex].tree,
      ['allocationInPercentage'],
      ['desc']
    ) as PortfolioPosition[];

    return dataset[activeElement.index];
  }

  private initialize() {
    const holdings = this.holdings();

    if (!holdings) {
      return;
    }

    this.isLoading = true;

    this.detectChanges(holdings);

    const { endDate, startDate } = getIntervalFromDateRange({
      dateRange: this.dateRange()
    });

    const netPerformancePercentsWithCurrencyEffect = holdings.map(
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

    const getTileBackground = (raw: GfTreemapDataPoint): Rgba => {
      let annualizedNetPerformancePercent = getAnnualizedPerformancePercent({
        daysInMarket: differenceInDays(
          endDate,
          max([raw._data.dateOfFirstActivity ?? new Date(0), startDate])
        ),
        netPerformancePercentage: new Big(
          raw._data.netPerformancePercentWithCurrencyEffect
        )
      }).toNumber();

      annualizedNetPerformancePercent = round(
        annualizedNetPerformancePercent,
        2
      );

      const { backgroundColor } = this.getColor({
        annualizedNetPerformancePercent,
        negativeNetPerformancePercentsRange,
        positiveNetPerformancePercentsRange
      });

      return getRgba(
        backgroundColor,
        this.isMarketClosed(raw._data) ? 0.35 : 1
      );
    };

    const data: ChartData<'treemap'> = {
      datasets: [
        {
          backgroundColor: (context: GfTreemapScriptableContext) => {
            const raw = context.raw as GfTreemapDataPoint;

            return raw ? toCss(getTileBackground(raw)) : undefined;
          },
          borderColor: (context: GfTreemapScriptableContext) => {
            const raw = context.raw as GfTreemapDataPoint;

            return raw
              ? this.getBorderColor(raw._data, getTileBackground(raw))
              : undefined;
          },
          borderRadius: 4,
          borderWidth: 3,
          key: 'allocationInPercentage',
          labels: {
            align: 'left',
            color: (context: GfTreemapScriptableContext) => {
              const raw = context.raw as GfTreemapDataPoint;

              if (!raw) {
                return undefined;
              }

              let annualizedNetPerformancePercent =
                getAnnualizedPerformancePercent({
                  daysInMarket: differenceInDays(
                    endDate,
                    max([
                      raw._data.dateOfFirstActivity ?? new Date(0),
                      startDate
                    ])
                  ),
                  netPerformancePercentage: new Big(
                    raw._data.netPerformancePercentWithCurrencyEffect
                  )
                }).toNumber();

              annualizedNetPerformancePercent = round(
                annualizedNetPerformancePercent,
                2
              );

              const { fontColor } = this.getColor({
                annualizedNetPerformancePercent,
                negativeNetPerformancePercentsRange,
                positiveNetPerformancePercentsRange
              });

              return this.isMarketClosed(raw._data)
                ? `rgb(${getTextColor(this.colorScheme())})`
                : fontColor;
            },
            display: true,
            font: [{ size: 16 }, { lineHeight: 1.5, size: 14 }],
            formatter: (context: GfTreemapScriptableContext) => {
              const raw = context.raw as GfTreemapDataPoint;

              const name = raw._data.assetProfile.name;
              const symbol = raw._data.assetProfile.symbol;

              return [
                isUUID(symbol) ? (name ?? symbol) : symbol,
                `${(
                  raw._data.netPerformancePercentWithCurrencyEffect * 100
                ).toLocaleString(this.locale(), {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2,
                  signDisplay: 'exceptZero',
                  useGrouping: true
                })}%`
              ];
            },
            hoverColor: undefined,
            position: 'top'
          },
          spacing: 1,
          // @ts-expect-error: should be PortfolioPosition[]
          tree: this.holdings()
        }
      ]
    };

    if (this.chartCanvas()) {
      if (this.chart) {
        this.chart.data = data;
        this.chart.options.plugins ??= {};
        this.chart.options.plugins.tooltip =
          this.getTooltipPluginConfiguration();

        // A refresh only recolors the tiles, without an animation
        this.chart.update('none');
      } else {
        this.chart = new Chart<'treemap'>(this.chartCanvas().nativeElement, {
          data,
          options: {
            animation: false,
            onClick: (_, activeElements, chart: Chart<'treemap'>) => {
              try {
                const holding = this.getHolding(chart, activeElements[0]);

                if (holding && canOpenHoldingDetail(holding)) {
                  this.treemapChartClicked.emit({
                    dataSource: holding.assetProfile.dataSource,
                    symbol: holding.assetProfile.symbol
                  });
                }
              } catch {}
            },
            onHover: (event, chartElements, chart: Chart<'treemap'>) => {
              if (this.cursor()) {
                const holding = this.getHolding(chart, chartElements[0]);

                (event.native?.target as HTMLElement).style.cursor =
                  holding && canOpenHoldingDetail(holding)
                    ? this.cursor()
                    : 'default';
              }
            },
            plugins: {
              tooltip: this.getTooltipPluginConfiguration()
            }
          },
          type: 'treemap'
        });
      }
    }

    this.isLoading = false;
  }

  private getTooltipPluginConfiguration(): Partial<TooltipOptions<'treemap'>> {
    return {
      ...getTooltipOptions({
        colorScheme: this.colorScheme(),
        currency: this.baseCurrency(),
        locale: this.locale()
      }),
      // @ts-expect-error: no need to set all attributes in callbacks
      callbacks: {
        label: (context: TooltipItem<'treemap'>) => {
          const raw = context.raw as GfTreemapDataPoint;

          const allocationInPercentage = `${(
            raw._data.allocationInPercentage * 100
          ).toLocaleString(this.locale(), {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
            useGrouping: true
          })}%`;
          const name = getHoldingName(raw._data.assetProfile);

          const netPerformanceInPercentageWithSign = `${(
            raw._data.netPerformancePercentWithCurrencyEffect * 100
          ).toLocaleString(this.locale(), {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
            signDisplay: 'exceptZero',
            useGrouping: true
          })}%`;

          if (raw._data.valueInBaseCurrency !== null) {
            const value = raw._data.valueInBaseCurrency;

            return [
              `${name} (${allocationInPercentage})`,
              `${value?.toLocaleString(this.locale(), {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
                useGrouping: true
              })} ${this.baseCurrency()}`,
              '',
              $localize`Change` + ' (' + $localize`Performance` + ')',
              `${raw._data.netPerformanceWithCurrencyEffect.toLocaleString(
                this.locale(),
                {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2,
                  signDisplay: 'exceptZero',
                  useGrouping: true
                }
              )} ${this.baseCurrency()} (${netPerformanceInPercentageWithSign})`
            ];
          } else {
            return [
              `${name} (${allocationInPercentage})`,
              '',
              $localize`Performance`,
              netPerformanceInPercentageWithSign
            ];
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
