import {
  getTooltipOptions,
  getTooltipPositionerMapTop,
  getVerticalHoverLinePlugin
} from '@ghostfolio/common/chart-helper';
import { primaryColorRgb, secondaryColorRgb } from '@ghostfolio/common/config';
import {
  getBackgroundColor,
  getDateFormatString,
  getLocale,
  getTextColor
} from '@ghostfolio/common/helper';
import { LineChartItem } from '@ghostfolio/common/interfaces';
import { ColorScheme } from '@ghostfolio/common/types';

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild
} from '@angular/core';
import {
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Tooltip
} from 'chart.js';
import 'chartjs-adapter-date-fns';

@Component({
  selector: 'gf-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss']
})
export class LineChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() benchmarkDataItems: LineChartItem[] = [];
  @Input() benchmarkLabel = '';
  @Input() colorScheme: ColorScheme;
  @Input() currency: string;
  @Input() historicalDataItems: LineChartItem[];
  @Input() isAnimated = false;
  @Input() locale = getLocale();
  @Input() showGradient = false;
  @Input() showLegend = false;
  @Input() showLoader = true;
  @Input() showXAxis = false;
  @Input() showYAxis = false;
  @Input() symbol: string;
  @Input() unit: string;
  @Input() yMax: number;
  @Input() yMaxLabel: string;
  @Input() yMin: number;
  @Input() yMinLabel: string;

  @ViewChild('chartCanvas') chartCanvas;

  public chart: Chart<'line'>;
  public isLoading = true;

  private readonly ANIMATION_DURATION = 1200;

  public constructor(private changeDetectorRef: ChangeDetectorRef) {
    Chart.register(
      Filler,
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      TimeScale,
      Tooltip
    );

    Tooltip.positioners['top'] = (elements, position) =>
      getTooltipPositionerMapTop(this.chart, position);
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

  public ngOnChanges() {
    if (this.historicalDataItems || this.historicalDataItems === null) {
      setTimeout(() => {
        // Wait for the chartCanvas
        this.initialize();

        this.changeDetectorRef.markForCheck();
      });
    }
  }

  public ngOnDestroy() {
    this.chart?.destroy();
  }

  private initialize() {
    this.isLoading = true;
    const benchmarkPrices = [];
    const labels: string[] = [];
    const marketPrices = [];

    this.historicalDataItems?.forEach((historicalDataItem, index) => {
      benchmarkPrices.push(this.benchmarkDataItems?.[index]?.value);
      labels.push(historicalDataItem.date);
      marketPrices.push(historicalDataItem.value);
    });

    const gradient = this.chartCanvas?.nativeElement
      ?.getContext('2d')
      .createLinearGradient(
        0,
        0,
        0,
        (this.chartCanvas.nativeElement.parentNode.offsetHeight * 4) / 5
      );

    if (gradient && this.showGradient) {
      gradient.addColorStop(
        0,
        `rgba(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b}, 0.01)`
      );
      gradient.addColorStop(1, getBackgroundColor(this.colorScheme));
    }

    const data = {
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
          label: this.symbol,
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
        this.chart.options.animation =
          this.isAnimated &&
          <unknown>{
            x: this.getAnimationConfigurationForAxis({ labels, axis: 'x' }),
            y: this.getAnimationConfigurationForAxis({ labels, axis: 'y' })
          };
        this.chart.update();
      } else {
        this.chart = new Chart(this.chartCanvas.nativeElement, {
          data,
          options: {
            animation:
              this.isAnimated &&
              <unknown>{
                x: this.getAnimationConfigurationForAxis({ labels, axis: 'x' }),
                y: this.getAnimationConfigurationForAxis({ labels, axis: 'y' })
              },
            aspectRatio: 16 / 9,
            elements: {
              point: {
                hoverBackgroundColor: getBackgroundColor(this.colorScheme),
                hoverRadius: 2
              }
            },
            interaction: { intersect: false, mode: 'index' },
            plugins: <unknown>{
              legend: {
                align: 'start',
                display: this.showLegend,
                position: 'bottom'
              },
              tooltip: this.getTooltipPluginConfiguration(),
              verticalHoverLine: {
                color: `rgba(${getTextColor(this.colorScheme)}, 0.1)`
              }
            },
            scales: {
              x: {
                border: {
                  color: `rgba(${getTextColor(this.colorScheme)}, 0.1)`
                },
                display: this.showXAxis,
                grid: {
                  display: false
                },
                time: {
                  tooltipFormat: getDateFormatString(this.locale),
                  unit: 'year'
                },
                type: 'time'
              },
              y: {
                border: {
                  width: 0
                },
                display: this.showYAxis,
                grid: {
                  color: ({ scale, tick }) => {
                    if (
                      tick.value === 0 ||
                      tick.value === scale.max ||
                      tick.value === scale.min ||
                      tick.value === this.yMax ||
                      tick.value === this.yMin
                    ) {
                      return `rgba(${getTextColor(this.colorScheme)}, 0.1)`;
                    }

                    return 'transparent';
                  }
                },
                max: this.yMax,
                min: this.yMin,
                position: 'right',
                ticks: {
                  callback: (tickValue, index, ticks) => {
                    if (index === 0 || index === ticks.length - 1) {
                      // Only print last and first legend entry

                      if (index === 0 && this.yMinLabel) {
                        return this.yMinLabel;
                      }

                      if (index === ticks.length - 1 && this.yMaxLabel) {
                        return this.yMaxLabel;
                      }

                      if (typeof tickValue === 'number') {
                        return tickValue.toFixed(2);
                      }

                      return tickValue;
                    }

                    return '';
                  },
                  display: this.showYAxis,
                  mirror: true,
                  z: 1
                },
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
      }
    }

    this.isLoading = false;
  }

  private getAnimationConfigurationForAxis({
    axis,
    labels
  }: {
    axis: 'x' | 'y';
    labels: string[];
  }) {
    const delayBetweenPoints = this.ANIMATION_DURATION / labels.length;

    return {
      delay(context) {
        if (context.type !== 'data' || context[`${axis}Started`]) {
          return 0;
        }

        context[`${axis}Started`] = true;
        return context.index * delayBetweenPoints;
      },
      duration: delayBetweenPoints,
      easing: 'linear',
      from: NaN,
      type: 'number'
    };
  }

  private getTooltipPluginConfiguration() {
    return {
      ...getTooltipOptions({
        colorScheme: this.colorScheme,
        currency: this.currency,
        locale: this.locale,
        unit: this.unit
      }),
      mode: 'index',
      position: <unknown>'top',
      xAlign: 'center',
      yAlign: 'bottom'
    };
  }
}
