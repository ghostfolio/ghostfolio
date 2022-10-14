import 'chartjs-adapter-date-fns';

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
  getTooltipOptions,
  getTooltipPositionerMapTop,
  getVerticalHoverLinePlugin
} from '@ghostfolio/common/chart-helper';
import {
  locale,
  primaryColorRgb,
  secondaryColorRgb
} from '@ghostfolio/common/config';
import {
  getBackgroundColor,
  getDateFormatString,
  getTextColor
} from '@ghostfolio/common/helper';
import { LineChartItem } from '@ghostfolio/common/interfaces';
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

@Component({
  selector: 'gf-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss']
})
export class LineChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() benchmarkDataItems: LineChartItem[] = [];
  @Input() benchmarkLabel = '';
  @Input() currency: string;
  @Input() historicalDataItems: LineChartItem[];
  @Input() isAnimated = false;
  @Input() locale: string;
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

  public chart: Chart;
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

    if (!this.locale) {
      this.locale = locale;
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
      gradient.addColorStop(1, getBackgroundColor());
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
          pointRadius: 0
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
                hoverBackgroundColor: getBackgroundColor(),
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
                color: `rgba(${getTextColor()}, 0.1)`
              }
            },
            scales: {
              x: {
                display: this.showXAxis,
                grid: {
                  borderColor: `rgba(${getTextColor()}, 0.1)`,
                  color: `rgba(${getTextColor()}, 0.8)`,
                  display: false
                },
                time: {
                  tooltipFormat: getDateFormatString(this.locale),
                  unit: 'year'
                },
                type: 'time'
              },
              y: {
                display: this.showYAxis,
                grid: {
                  borderColor: `rgba(${getTextColor()}, 0.1)`,
                  color: `rgba(${getTextColor()}, 0.8)`,
                  display: false
                },
                max: this.yMax,
                min: this.yMin,
                ticks: {
                  display: this.showYAxis,
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
                  mirror: true,
                  z: 1
                },
                type: 'linear'
              }
            },
            spanGaps: true
          },
          plugins: [getVerticalHoverLinePlugin(this.chartCanvas)],
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
