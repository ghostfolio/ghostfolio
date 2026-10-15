import {
  DateRangeSlice,
  DEFAULT_CHART_DATE_RANGE,
  filterByDateRange,
  getDateRangeSlice,
  getSelectableDateRanges
} from '@ghostfolio/common/chart-date-range';
import {
  getChartBorderColor,
  getTimeAxisOptions,
  getTooltipOptions,
  getValueAxisOptions,
  getVerticalHoverLinePlugin
} from '@ghostfolio/common/chart-helper';
import { primaryColorRgb, secondaryColorRgb } from '@ghostfolio/common/config';
import {
  getBackgroundColor,
  getLocale,
  getTextColor
} from '@ghostfolio/common/helper';
import {
  LineChartItem,
  NullableLineChartItem
} from '@ghostfolio/common/interfaces';
import {
  PriceStatistics,
  calculatePriceStatistics
} from '@ghostfolio/common/price-statistics';
import {
  ColorScheme,
  DateRange,
  ToggleOption
} from '@ghostfolio/common/types';

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  type ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {
  type AnimationsSpec,
  Chart,
  type ChartData,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  type ScriptableTooltipContext,
  TimeScale,
  Tooltip,
  type TooltipItem,
  type TooltipModel,
  type TooltipOptions
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import annotationPlugin, {
  type AnnotationOptions
} from 'chartjs-plugin-annotation';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import {
  onPrefersColorSchemeChange,
  registerChartConfiguration
} from '../chart';
import { GfToggleComponent } from '../toggle/toggle.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GfToggleComponent, NgxSkeletonLoaderModule],
  selector: 'gf-line-chart',
  styleUrls: ['./line-chart.component.scss'],
  templateUrl: './line-chart.component.html'
})
export class GfLineChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() benchmarkDataItems: NullableLineChartItem[] = [];
  @Input() benchmarkLabel = '';
  @Input() buyDateMarkers: LineChartItem[] = [];
  @Input() colorScheme?: ColorScheme;
  @Input() sellDateMarkers: LineChartItem[] = [];
  @Input() currency?: string;
  @Input() dateRange: DateRange = DEFAULT_CHART_DATE_RANGE;
  @Input() historicalDataItems: LineChartItem[] | null;
  @Input() purchaseDate: string;
  @Input() isAnimated = false;
  @Input() label: string;
  @Input() locale = getLocale();
  @Input() showGradient = false;
  @Input() showLegend = false;
  @Input() showDateRangeSelector = false;
  @Input() showLoader = true;
  @Input() showPriceStatistics = false;
  @Input() showXAxis = false;
  @Input() showYAxis = false;
  @Input() unit: string;
  @Input() yMax: number;
  @Input() yMaxLabel: string;
  @Input() yMin: number;
  @Input() yMinLabel: string;

  @Output() dateRangeChange = new EventEmitter<DateRange>();

  @ViewChild('chartCanvas') chartCanvas: ElementRef<HTMLCanvasElement>;

  public chart?: Chart<'line'>;
  public isLoading = true;

  protected dateRangeOptions: ToggleOption[] = [];

  private annotationRevealTimer: ReturnType<typeof setTimeout> | undefined;
  private hasRendered = false;
  private hasUserSelectedDateRange = false;
  private preferredDateRange: DateRange | undefined;
  private tooltipElement: HTMLDivElement | undefined;
  private visibleBenchmarkDataItems: NullableLineChartItem[] = [];
  private visibleHistoricalDataItems: LineChartItem[] = [];
  private visiblePriceStatistics: PriceStatistics[] = [];
  private readonly ANIMATION_DURATION = 800;
  private readonly NEGATIVE_COLOR = 'rgb(177, 0, 0)';
  private readonly POSITIVE_COLOR = 'rgb(0, 177, 0)';
  private readonly dateRangeLabels: Record<string, string> = {
    '10y': '10Y',
    '1m': '1M',
    '1w': '1W',
    '1y': '1Y',
    '2y': '2Y',
    '3m': '3M',
    '5y': '5Y',
    '6m': '6M',
    max: $localize`ALL`,
    purchase: $localize`Since Purchase`,
    ytd: $localize`YTD`
  };
  private readonly changeFromLastTroughLabel = $localize`From Last Low`;
  private readonly changeFromMaximumLabel = $localize`From All-Time High`;
  private readonly dailyChangeLabel = $localize`Daily Change`;
  private readonly marketChangeLabel = $localize`Market Change`;
  private readonly sharesLabel = $localize`Shares`;

  public constructor(private changeDetectorRef: ChangeDetectorRef) {
    Chart.register(
      annotationPlugin,
      Filler,
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      TimeScale,
      Tooltip
    );

    registerChartConfiguration();

    onPrefersColorSchemeChange(() => {
      if (this.chart && !this.colorScheme) {
        this.chart.destroy();
        this.chart = undefined;

        this.initialize();
      }
    });
  }

  public ngAfterViewInit() {
    if (this.historicalDataItems) {
      setTimeout(() => {
        // Wait for the chartCanvas
        this.initialize();

        this.changeDetectorRef.markForCheck();
      });
    }
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes['colorScheme'] && this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }

    if (changes['dateRange']) {
      // Remember the requested date range, as it may not be selectable yet
      // while the historical data is still loading
      this.preferredDateRange = this.dateRange;
      this.hasUserSelectedDateRange = false;
    }

    if (changes['historicalDataItems']) {
      this.hasRendered = false;

      setTimeout(() => {
        // Wait for the chartCanvas
        this.initialize();

        this.changeDetectorRef.markForCheck();
      });
    } else if (
      (changes['buyDateMarkers'] || changes['sellDateMarkers']) &&
      this.chart
    ) {
      this.chart.options.plugins ??= {};
      this.chart.options.plugins.annotation = {
        annotations: {
          ...this.buildBuyDateMarkerAnnotations(),
          ...this.buildSellDateMarkerAnnotations()
        }
      };
      this.chart.update();
      this.changeDetectorRef.markForCheck();
    }
  }

  protected onDateRangeChange(dateRange: DateRange) {
    this.dateRange = dateRange;
    this.hasUserSelectedDateRange = true;

    this.dateRangeChange.emit(dateRange);

    // Skip the animation, switching the date range should feel instant
    this.hasRendered = true;

    this.initialize();

    this.changeDetectorRef.markForCheck();
  }

  /**
   * Restricts every series to the selected date range. The price statistics
   * are derived from the full history first, hence the all-time high does not
   * depend on the selected date range.
   */
  private applyDateRange() {
    const historicalDataItems = this.historicalDataItems ?? [];
    const benchmarkDataItems = this.benchmarkDataItems ?? [];

    const priceStatistics = this.showPriceStatistics
      ? calculatePriceStatistics({
          values: historicalDataItems.map(({ value }) => {
            return value;
          })
        })
      : [];

    if (!this.showDateRangeSelector) {
      this.visibleBenchmarkDataItems = benchmarkDataItems;
      this.visibleHistoricalDataItems = historicalDataItems;
      this.visiblePriceStatistics = priceStatistics;

      return;
    }

    this.updateDateRangeOptions();

    const dates = historicalDataItems.map(({ date }) => {
      return date;
    });

    const { endIndex, startIndex } =
      this.dateRange === 'purchase' && this.purchaseDate
        ? this.getPurchaseDateSlice(dates)
        : getDateRangeSlice({ dateRange: this.dateRange, dates });

    this.visibleBenchmarkDataItems = benchmarkDataItems.slice(
      startIndex,
      endIndex
    );
    this.visibleHistoricalDataItems = historicalDataItems.slice(
      startIndex,
      endIndex
    );
    this.visiblePriceStatistics = priceStatistics.slice(startIndex, endIndex);
  }

  private getPurchaseDateSlice(dates: string[]): DateRangeSlice {
    const startIndex = dates.findIndex((date) => {
      return date >= this.purchaseDate;
    });

    return {
      endIndex: dates.length,
      startIndex: startIndex === -1 ? 0 : startIndex
    };
  }

  private updateDateRangeOptions() {
    const selectableDateRanges = getSelectableDateRanges({
      dates: (this.historicalDataItems ?? []).map(({ date }) => {
        return date;
      })
    });

    if (this.purchaseDate) {
      // Offer an additional option to restrict the chart to the holding
      // period, next to the regular date ranges
      selectableDateRanges.push('purchase');
    }

    // Capture the requested date range before any fallback overrules it
    this.preferredDateRange ??= this.dateRange;

    this.dateRangeOptions = selectableDateRanges.map((dateRange) => {
      return { label: this.dateRangeLabels[dateRange], value: dateRange };
    });

    if (
      !this.hasUserSelectedDateRange &&
      selectableDateRanges.includes(this.preferredDateRange)
    ) {
      // Restore the requested date range as soon as it becomes selectable, so
      // it does not stay overruled by the fallback applied while loading
      this.dateRange = this.preferredDateRange;
    }

    if (!selectableDateRanges.includes(this.dateRange)) {
      // Fall back to the shortest date range with data
      this.dateRange = selectableDateRanges[0];
    }
  }

  private getVisibleMarkers(markers: LineChartItem[]) {
    if (!this.showDateRangeSelector) {
      return markers ?? [];
    }

    return filterByDateRange({
      dateRange: this.dateRange,
      items: markers ?? []
    });
  }

  public ngOnDestroy() {
    if (this.annotationRevealTimer) {
      clearTimeout(this.annotationRevealTimer);
    }

    this.tooltipElement?.remove();
    this.tooltipElement = undefined;

    this.chart?.destroy();
  }

  private initialize() {
    this.isLoading = true;

    this.applyDateRange();

    const benchmarkPrices: (number | null)[] = [];
    const labels: string[] = [];
    const marketPrices: number[] = [];

    this.visibleHistoricalDataItems.forEach((historicalDataItem, index) => {
      benchmarkPrices.push(this.visibleBenchmarkDataItems[index]?.value ?? null);
      labels.push(historicalDataItem.date);
      marketPrices.push(historicalDataItem.value);
    });

    const gradient = this.chartCanvas?.nativeElement
      ?.getContext('2d')
      ?.createLinearGradient(
        0,
        0,
        0,
        ((this.chartCanvas.nativeElement.parentNode as HTMLElement)
          .offsetHeight *
          4) /
          5
      );

    if (gradient && this.showGradient) {
      gradient.addColorStop(
        0,
        `rgba(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b}, 0.01)`
      );
      gradient.addColorStop(1, getBackgroundColor(this.colorScheme));
    }

    const data: ChartData<'line'> = {
      labels,
      datasets: [
        {
          borderColor: `rgb(${secondaryColorRgb.r}, ${secondaryColorRgb.g}, ${secondaryColorRgb.b})`,
          borderWidth: 1,
          data: benchmarkPrices,
          fill: false,
          label: this.benchmarkLabel,
          pointRadius: 0,
          spanGaps: false
        },
        {
          backgroundColor: gradient,
          borderColor: `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`,
          borderWidth: 2,
          data: marketPrices,
          fill: true,
          label: this.label,
          pointRadius: 0
        }
      ]
    };

    const buyDateMarkerAnnotations = this.buildBuyDateMarkerAnnotations({
      display: !this.isAnimationEnabled
    });

    const sellDateMarkerAnnotations = this.buildSellDateMarkerAnnotations({
      display: !this.isAnimationEnabled
    });

    const dateMarkerAnnotations = {
      ...buyDateMarkerAnnotations,
      ...sellDateMarkerAnnotations
    };

    if (this.chartCanvas) {
      const animations = {
        x: this.getAnimationConfigurationForAxis({ labels, axis: 'x' }),
        y: this.getAnimationConfigurationForAxis({ labels, axis: 'y' })
      };

      if (this.chart) {
        this.chart.data = data;
        this.chart.options.plugins ??= {};
        this.chart.options.plugins.annotation = {
          annotations: dateMarkerAnnotations
        };
        this.chart.options.plugins.tooltip =
          this.getTooltipPluginConfiguration();
        this.chart.options.animations = this.isAnimationEnabled
          ? animations
          : undefined;

        this.chart.update();

        if (this.isAnimationEnabled) {
          this.scheduleAnnotationReveal();
        }
      } else {
        this.chart = new Chart<'line'>(this.chartCanvas.nativeElement, {
          data,
          options: {
            animations: this.isAnimationEnabled ? animations : undefined,
            aspectRatio: 16 / 9,
            elements: {
              point: {
                hoverBackgroundColor: getBackgroundColor(this.colorScheme),
                hoverRadius: 2
              }
            },
            interaction: { intersect: false, mode: 'index' },
            plugins: {
              annotation: {
                annotations: dateMarkerAnnotations
              },
              legend: {
                align: 'start',
                display: this.showLegend,
                position: 'bottom'
              },
              tooltip: this.getTooltipPluginConfiguration(),
              verticalHoverLine: {
                color: getChartBorderColor(this.colorScheme)
              }
            },
            scales: {
              x: getTimeAxisOptions({
                colorScheme: this.colorScheme,
                display: this.showXAxis,
                locale: this.locale
              }),
              y: {
                ...getValueAxisOptions({
                  colorScheme: this.colorScheme,
                  display: this.showYAxis,
                  highlightedValues: [this.yMax, this.yMin],
                  tickCallback: (tickValue, index, ticks) => {
                    if (index === 0 || index === ticks.length - 1) {
                      // Only print last and first legend entry

                      if (index === 0 && this.yMinLabel) {
                        return this.yMinLabel;
                      }

                      if (index === ticks.length - 1 && this.yMaxLabel) {
                        return this.yMaxLabel;
                      }

                      if (typeof tickValue === 'number') {
                        return tickValue.toLocaleString(this.locale, {
                          maximumFractionDigits: 2,
                          minimumFractionDigits: 2,
                          useGrouping: true
                        });
                      }

                      return tickValue;
                    }

                    return '';
                  }
                }),
                max: this.yMax,
                min: this.yMin,
                type: 'linear'
              }
            },
            spanGaps: true
          },
          plugins: [
            getVerticalHoverLinePlugin(this.chartCanvas, this.colorScheme)
          ],
          type: 'line'
        });

        if (this.isAnimationEnabled) {
          this.scheduleAnnotationReveal();
        }
      }
    }

    this.hasRendered = true;
    this.isLoading = false;
  }

  private get isAnimationEnabled() {
    // Animate the initial rendering only, switching the date range should feel
    // instant
    return this.isAnimated && !this.hasRendered;
  }

  private getAnimationConfigurationForAxis({
    axis,
    labels
  }: {
    axis: 'x' | 'y';
    labels: string[];
  }): Partial<AnimationsSpec<'line'>[string]> {
    const delayBetweenPoints = this.ANIMATION_DURATION / labels.length;

    return {
      delay(context) {
        if (context.type !== 'data' || context[`${axis}Started`]) {
          return 0;
        }

        context[`${axis}Started`] = true;
        return context.dataIndex * delayBetweenPoints;
      },
      duration: delayBetweenPoints,
      easing: 'linear',
      from: NaN,
      type: 'number'
    };
  }

  private buildBuyDateMarkerAnnotations(
    { display }: { display: boolean } = { display: true }
  ): Record<string, AnnotationOptions> {
    return this.buildDateMarkerAnnotations({
      backgroundColor: 'rgba(0,177,0,0.4)',
      display,
      keyPrefix: 'buyDateMarker',
      markers: this.getVisibleMarkers(this.buyDateMarkers)
    });
  }

  private buildSellDateMarkerAnnotations(
    { display }: { display: boolean } = { display: true }
  ): Record<string, AnnotationOptions> {
    return this.buildDateMarkerAnnotations({
      backgroundColor: 'rgba(177,0,0,0.4)',
      display,
      keyPrefix: 'sellDateMarker',
      markers: this.getVisibleMarkers(this.sellDateMarkers)
    });
  }

  private buildDateMarkerAnnotations({
    backgroundColor,
    display,
    keyPrefix,
    markers
  }: {
    backgroundColor: string;
    display: boolean;
    keyPrefix: string;
    markers: LineChartItem[];
  }): Record<string, AnnotationOptions> {
    if (!markers?.length || !this.visibleHistoricalDataItems.length) {
      return {};
    }

    const priceByDate = new Map<string, number>();
    for (const { date, value } of this.visibleHistoricalDataItems) {
      if (date != null && value != null) {
        priceByDate.set(date, value);
      }
    }

    return markers.reduce<Record<string, AnnotationOptions>>(
      (acc, { date }, index) => {
        const yValue = priceByDate.get(date);

        if (yValue == null) {
          return acc;
        }

        acc[`${keyPrefix}${index}`] = {
          backgroundColor,
          borderColor: 'rgb(255, 255, 255)',
          borderWidth: 1,
          display,
          pointStyle: 'circle',
          radius: 4,
          type: 'point',
          xScaleID: 'x',
          xValue: date,
          yScaleID: 'y',
          yValue
        };

        return acc;
      },
      {}
    );
  }

  private scheduleAnnotationReveal() {
    if (this.annotationRevealTimer) {
      clearTimeout(this.annotationRevealTimer);
    }

    this.annotationRevealTimer = setTimeout(() => {
      this.annotationRevealTimer = undefined;

      if (!this.chart) {
        return;
      }

      this.chart.options.plugins ??= {};
      this.chart.options.plugins.annotation = {
        annotations: {
          ...this.buildBuyDateMarkerAnnotations({ display: true }),
          ...this.buildSellDateMarkerAnnotations({ display: true })
        }
      };
      this.chart.update('none');
    }, this.ANIMATION_DURATION);
  }

  private getTooltipPluginConfiguration(): Partial<TooltipOptions<'line'>> {
    const tooltipOptions = getTooltipOptions<'line'>({
      colorScheme: this.colorScheme,
      currency: this.currency,
      locale: this.locale,
      unit: this.unit
    });

    return {
      ...tooltipOptions,
      // The built-in tooltip renders all body lines with a single color,
      // therefore an external tooltip is required to color the price
      // statistics individually
      enabled: !this.showPriceStatistics,
      external: this.showPriceStatistics
        ? (context) => {
            this.renderExternalTooltip(context);
          }
        : undefined,
      // @ts-ignore: no need to set all attributes in callbacks
      callbacks: {
        ...tooltipOptions.callbacks,
        afterBody: (tooltipItems) => {
          return this.getMarketChangeTooltipLines(tooltipItems);
        },
        footer: (tooltipItems) => {
          return this.getTransactionQuantityTooltipLines(tooltipItems);
        }
      },
      footerColor: (context: ScriptableTooltipContext<'line'>) => {
        return this.getTransactionQuantityTooltipColor(context.tooltipItems);
      },
      mode: 'index',
      position: 'top',
      xAlign: 'center',
      yAlign: 'bottom'
    };
  }

  private getDateForTooltipItems(tooltipItems: TooltipItem<'line'>[]) {
    const dataIndex = tooltipItems?.[0]?.dataIndex;

    return dataIndex != null
      ? this.visibleHistoricalDataItems[dataIndex]?.date
      : undefined;
  }

  private getMarketChangeTooltipLines(tooltipItems: TooltipItem<'line'>[]) {
    const dataIndex = tooltipItems?.[0]?.dataIndex;

    if (dataIndex == null) {
      return [];
    }

    const marketPrice = this.visibleHistoricalDataItems[dataIndex]?.value;
    const quantity = this.visibleHistoricalDataItems[dataIndex]?.quantity;
    const averagePrice = this.visibleBenchmarkDataItems[dataIndex]?.value;

    if (marketPrice == null || averagePrice == null || quantity == null) {
      return [];
    }

    const marketChange = (marketPrice - averagePrice) * quantity;

    return [`${this.marketChangeLabel}: ${this.formatAmount(marketChange)}`];
  }

  private getTransactionQuantityTooltipLines(
    tooltipItems: TooltipItem<'line'>[]
  ) {
    const date = this.getDateForTooltipItems(tooltipItems);

    if (!date) {
      return [];
    }

    const buyLines = this.getVisibleMarkers(this.buyDateMarkers)
      .filter((marker) => {
        return marker.date === date && marker.quantity;
      })
      .map((marker) => {
        return `${this.sharesLabel}: +${marker.quantity} (${this.formatUnitPrice(marker.value)})`;
      });

    const sellLines = this.getVisibleMarkers(this.sellDateMarkers)
      .filter((marker) => {
        return marker.date === date && marker.quantity;
      })
      .map((marker) => {
        return `${this.sharesLabel}: -${marker.quantity} (${this.formatUnitPrice(marker.value)})`;
      });

    return [...buyLines, ...sellLines];
  }

  private formatAmount(amount: number) {
    const sign = amount >= 0 ? '+' : '';

    return `${sign}${this.formatUnitPrice(amount)}`;
  }

  private formatUnitPrice(value: number) {
    const formattedAmount = value.toLocaleString(this.locale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    });

    return `${formattedAmount}${this.currency ? ` ${this.currency}` : ''}`;
  }

  private getTransactionQuantityTooltipColor(
    tooltipItems: TooltipItem<'line'>[]
  ) {
    const date = this.getDateForTooltipItems(tooltipItems);

    if (date) {
      const hasBuy = this.buyDateMarkers?.some((marker) => {
        return marker.date === date;
      });
      const hasSell = this.sellDateMarkers?.some((marker) => {
        return marker.date === date;
      });

      // The built-in tooltip supports only one color for all footer lines
      if (hasBuy && !hasSell) {
        return 'rgb(0, 177, 0)';
      }

      if (hasSell && !hasBuy) {
        return 'rgb(177, 0, 0)';
      }
    }

    return `rgb(${getTextColor(this.colorScheme)})`;
  }

  private getPriceStatisticsTooltipRows(dataIndex: number | undefined) {
    if (dataIndex == null) {
      return [];
    }

    const {
      changeFromLastTroughPercent,
      changeFromMaximumPercent,
      dailyChangePercent
    } = this.visiblePriceStatistics[dataIndex] ?? {};

    return [
      { label: this.dailyChangeLabel, value: dailyChangePercent },
      { label: this.changeFromMaximumLabel, value: changeFromMaximumPercent },
      {
        label: this.changeFromLastTroughLabel,
        value: changeFromLastTroughPercent
      }
    ].flatMap(({ label, value }) => {
      if (value == null || !isFinite(value)) {
        return [];
      }

      return [
        {
          color: this.getChangeColor(value),
          text: `${label}: ${this.formatPercent(value)}`
        }
      ];
    });
  }

  private getChangeColor(value: number) {
    if (value > 0) {
      return this.POSITIVE_COLOR;
    } else if (value < 0) {
      return this.NEGATIVE_COLOR;
    }

    return `rgb(${getTextColor(this.colorScheme)})`;
  }

  private formatPercent(value: number) {
    return value.toLocaleString(this.locale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      signDisplay: 'exceptZero',
      style: 'percent'
    });
  }

  private renderExternalTooltip({
    chart,
    tooltip
  }: {
    chart: Chart;
    tooltip: TooltipModel<'line'>;
  }) {
    const element = this.getOrCreateTooltipElement(chart);

    if (!element) {
      return;
    }

    if (tooltip.opacity === 0) {
      element.style.opacity = '0';

      return;
    }

    element.replaceChildren();

    for (const title of tooltip.title ?? []) {
      const titleElement = document.createElement('div');
      titleElement.style.fontWeight = 'bold';
      titleElement.textContent = title;

      element.appendChild(titleElement);
    }

    (tooltip.body ?? []).forEach(({ lines }, index) => {
      for (const line of lines) {
        element.appendChild(
          this.buildTooltipRow({
            bulletColor: tooltip.labelColors?.[index]?.borderColor as string,
            text: line
          })
        );
      }
    });

    for (const { color, text } of this.getPriceStatisticsTooltipRows(
      tooltip.dataPoints?.[0]?.dataIndex
    )) {
      element.appendChild(this.buildTooltipRow({ color, text }));
    }

    const { offsetLeft, offsetTop } = chart.canvas;

    element.style.opacity = '1';
    element.style.left = `${offsetLeft + tooltip.caretX}px`;
    element.style.top = `${offsetTop + chart.chartArea.top}px`;

    // Keep the tooltip within the boundaries of the canvas
    const halfWidth = element.offsetWidth / 2;
    const left = Math.min(
      Math.max(tooltip.caretX, halfWidth),
      chart.canvas.clientWidth - halfWidth
    );

    element.style.left = `${offsetLeft + left}px`;
  }

  private buildTooltipRow({
    bulletColor,
    color,
    text
  }: {
    bulletColor?: string;
    color?: string;
    text: string;
  }) {
    const rowElement = document.createElement('div');
    rowElement.style.alignItems = 'center';
    rowElement.style.display = 'flex';
    rowElement.style.whiteSpace = 'nowrap';

    if (color) {
      rowElement.style.color = color;
    }

    if (bulletColor) {
      const bulletElement = document.createElement('span');
      bulletElement.style.background = bulletColor;
      bulletElement.style.borderRadius = '50%';
      bulletElement.style.display = 'inline-block';
      bulletElement.style.height = '0.5rem';
      bulletElement.style.marginRight = '0.25rem';
      bulletElement.style.width = '0.5rem';

      rowElement.appendChild(bulletElement);
    }

    const textElement = document.createElement('span');
    textElement.textContent = text;

    rowElement.appendChild(textElement);

    return rowElement;
  }

  private getOrCreateTooltipElement(chart: Chart) {
    if (this.tooltipElement?.isConnected) {
      return this.tooltipElement;
    }

    const parentElement = chart.canvas.parentNode as HTMLElement;

    if (!parentElement) {
      return undefined;
    }

    const element = document.createElement('div');
    element.style.background = getBackgroundColor(this.colorScheme);
    element.style.border = `1px solid rgba(${getTextColor(this.colorScheme)}, 0.1)`;
    element.style.borderRadius = '2px';
    element.style.color = `rgb(${getTextColor(this.colorScheme)})`;
    element.style.fontSize = '0.75rem';
    element.style.lineHeight = '1.4';
    element.style.padding = '0.25rem 0.5rem';
    element.style.pointerEvents = 'none';
    element.style.position = 'absolute';
    element.style.transform = 'translateX(-50%)';
    element.style.transition = 'opacity 0.1s ease-in-out';
    element.style.zIndex = '1';

    parentElement.appendChild(element);

    this.tooltipElement = element;

    return element;
  }
}
