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
  getTextColor,
  parseDate
} from '@ghostfolio/common/helper';
import { LineChartItem, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { ColorScheme } from '@ghostfolio/common/types';

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
import { SymbolProfile } from '@prisma/client';
import {
  Chart,
  ChartData,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Tooltip
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import annotationPlugin from 'chartjs-plugin-annotation';

@Component({
  selector: 'gf-benchmark-comparator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './benchmark-comparator.component.html',
  styleUrls: ['./benchmark-comparator.component.scss']
})
export class BenchmarkComparatorComponent implements OnChanges, OnDestroy {
  @Input() benchmark: Partial<SymbolProfile>;
  @Input() benchmarkDataItems: LineChartItem[] = [];
  @Input() benchmarks: Partial<SymbolProfile>[];
  @Input() colorScheme: ColorScheme;
  @Input() daysInMarket: number;
  @Input() isLoading: boolean;
  @Input() locale = getLocale();
  @Input() performanceDataItems: LineChartItem[];
  @Input() user: User;

  @Output() benchmarkChanged = new EventEmitter<string>();

  @ViewChild('chartCanvas') chartCanvas;

  public chart: Chart<'line'>;
  public hasPermissionToAccessAdminControl: boolean;

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
    this.hasPermissionToAccessAdminControl = hasPermission(
      this.user?.permissions,
      permissions.accessAdminControl
    );

    if (this.performanceDataItems) {
      this.initialize();
    }
  }

  public onChangeBenchmark(symbolProfileId: string) {
    this.benchmarkChanged.next(symbolProfileId);
  }

  public ngOnDestroy() {
    this.chart?.destroy();
  }

  private initialize() {
    const benchmarkDataValues: { [date: string]: number } = {};

    for (const { date, value } of this.benchmarkDataItems) {
      benchmarkDataValues[date] = value;
    }

    const data: ChartData<'line'> = {
      datasets: [
        {
          backgroundColor: `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`,
          borderColor: `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`,
          borderWidth: 2,
          data: this.performanceDataItems.map(({ date, value }) => {
            return { x: parseDate(date).getTime(), y: value };
          }),
          label: $localize`Portfolio`
        },
        {
          backgroundColor: `rgb(${secondaryColorRgb.r}, ${secondaryColorRgb.g}, ${secondaryColorRgb.b})`,
          borderColor: `rgb(${secondaryColorRgb.r}, ${secondaryColorRgb.g}, ${secondaryColorRgb.b})`,
          borderWidth: 2,
          data: this.performanceDataItems.map(({ date }) => {
            return {
              x: parseDate(date).getTime(),
              y: benchmarkDataValues[date]
            };
          }),
          label: this.benchmark?.name ?? $localize`Benchmark`
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
                hoverBackgroundColor: getBackgroundColor(this.colorScheme),
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
                    borderColor: `rgba(${getTextColor(this.colorScheme)}, 0.1)`,
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
                color: `rgba(${getTextColor(this.colorScheme)}, 0.1)`
              }
            },
            responsive: true,
            scales: {
              x: {
                border: {
                  color: `rgba(${getTextColor(this.colorScheme)}, 0.1)`,
                  width: 1
                },
                display: true,
                grid: {
                  display: false
                },
                type: 'time',
                time: {
                  tooltipFormat: getDateFormatString(this.locale),
                  unit: 'year'
                }
              },
              y: {
                border: {
                  width: 0
                },
                display: true,
                grid: {
                  color: ({ scale, tick }) => {
                    if (
                      tick.value === 0 ||
                      tick.value === scale.max ||
                      tick.value === scale.min
                    ) {
                      return `rgba(${getTextColor(this.colorScheme)}, 0.1)`;
                    }

                    return 'transparent';
                  }
                },
                position: 'right',
                ticks: {
                  callback: (value: number) => {
                    return `${value.toFixed(2)} %`;
                  },
                  display: true,
                  mirror: true,
                  z: 1
                }
              }
            }
          },
          plugins: [
            getVerticalHoverLinePlugin(this.chartCanvas, this.colorScheme)
          ],
          type: 'line'
        });
      }
    }
  }

  private getTooltipPluginConfiguration() {
    return {
      ...getTooltipOptions({
        colorScheme: this.colorScheme,
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
