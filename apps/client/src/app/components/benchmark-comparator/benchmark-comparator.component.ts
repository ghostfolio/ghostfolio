import 'chartjs-adapter-date-fns';

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import {
  getTooltipOptions,
  getTooltipPositionerMapTop,
  getVerticalHoverLinePlugin
} from '@ghostfolio/common/chart-helper';
import { primaryColorRgb, secondaryColorRgb } from '@ghostfolio/common/config';
import {
  getBackgroundColor,
  getDateFormatString,
  getTextColor
} from '@ghostfolio/common/helper';
import {
  LineChartItem,
  UniqueAsset,
  User
} from '@ghostfolio/common/interfaces';
import {
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Tooltip
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

@Component({
  selector: 'gf-benchmark-comparator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './benchmark-comparator.component.html',
  styleUrls: ['./benchmark-comparator.component.scss']
})
export class BenchmarkComparatorComponent implements OnChanges, OnDestroy {
  @Input() benchmarkDataItems: LineChartItem[] = [];
  @Input() benchmarks: UniqueAsset[];
  @Input() daysInMarket: number;
  @Input() locale: string;
  @Input() performanceDataItems: LineChartItem[];
  @Input() user: User;

  @Output() benchmarkChanged = new EventEmitter<UniqueAsset>();

  @ViewChild('chartCanvas') chartCanvas;

  public benchmark: UniqueAsset;
  public chart: Chart;
  public isLoading = true;

  public constructor() {
    Chart.register(
      annotationPlugin,
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
    if (this.performanceDataItems) {
      this.initialize();
    }
  }

  public onChangeBenchmark(aBenchmark: UniqueAsset) {
    this.benchmarkChanged.next(aBenchmark);
  }

  public ngOnDestroy() {
    this.chart?.destroy();
  }

  private initialize() {
    this.isLoading = true;

    const data = {
      labels: this.performanceDataItems.map(({ date }) => {
        return date;
      }),
      datasets: [
        {
          backgroundColor: `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`,
          borderColor: `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`,
          borderWidth: 2,
          data: this.performanceDataItems.map(({ value }) => {
            return value;
          }),
          label: $localize`Portfolio`
        },
        {
          backgroundColor: `rgb(${secondaryColorRgb.r}, ${secondaryColorRgb.g}, ${secondaryColorRgb.b})`,
          borderColor: `rgb(${secondaryColorRgb.r}, ${secondaryColorRgb.g}, ${secondaryColorRgb.b})`,
          borderWidth: 2,
          data: this.benchmarkDataItems.map(({ value }) => {
            return value;
          }),
          label: $localize`Benchmark`
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
                  borderWidth: 1,
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
                display: true,
                grid: {
                  borderColor: `rgba(${getTextColor()}, 0.1)`,
                  color: `rgba(${getTextColor()}, 0.8)`,
                  display: false,
                  drawBorder: false
                },
                position: 'right',
                ticks: {
                  callback: (value: number) => {
                    return `${value} %`;
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
      }
    }

    this.isLoading = false;
  }

  private getTooltipPluginConfiguration() {
    return {
      ...getTooltipOptions({
        locale: this.locale,
        unit: '%'
      }),
      mode: 'index',
      position: <unknown>'top',
      xAlign: 'center',
      yAlign: 'bottom'
    };
  }
}
