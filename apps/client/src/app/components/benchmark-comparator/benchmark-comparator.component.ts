import {
  getTooltipOptions,
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
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { ColorScheme } from '@ghostfolio/common/types';
import { registerChartConfiguration } from '@ghostfolio/ui/chart';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  input,
  OnChanges,
  OnDestroy,
  output,
  viewChild
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { SymbolProfile } from '@prisma/client';
import {
  Chart,
  ChartData,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip,
  type TooltipOptions
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { addIcons } from 'ionicons';
import { arrowForwardOutline } from 'ionicons/icons';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    GfPremiumIndicatorComponent,
    IonIcon,
    MatSelectModule,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule,
    RouterModule
  ],
  selector: 'gf-benchmark-comparator',
  styleUrls: ['./benchmark-comparator.component.scss'],
  templateUrl: './benchmark-comparator.component.html'
})
export class GfBenchmarkComparatorComponent implements OnChanges, OnDestroy {
  public readonly benchmark = input<Partial<SymbolProfile>>();
  public readonly benchmarkDataItems = input<LineChartItem[]>([]);
  public readonly benchmarks = input<Partial<SymbolProfile>[]>();
  public readonly colorScheme = input.required<ColorScheme>();
  public readonly isLoading = input<boolean>();
  public readonly locale = input(getLocale());
  public readonly performanceDataItems = input.required<LineChartItem[]>();
  public readonly user = input<User>();

  public readonly benchmarkChanged = output<string>();

  protected chart: Chart<'line'>;
  protected hasPermissionToAccessAdminControl: boolean;
  protected readonly routerLinkAdminControlMarketData =
    internalRoutes.adminControl.subRoutes.marketData.routerLink;

  private readonly chartCanvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');

  public constructor() {
    Chart.register(
      LinearScale,
      LineController,
      LineElement,
      PointElement,
      TimeScale,
      Tooltip
    );

    registerChartConfiguration();

    addIcons({ arrowForwardOutline });
  }

  public ngOnChanges() {
    this.hasPermissionToAccessAdminControl = hasPermission(
      this.user()?.permissions,
      permissions.accessAdminControl
    );

    if (this.performanceDataItems()) {
      this.initialize();
    }
  }

  public ngOnDestroy() {
    this.chart?.destroy();
  }

  protected onChangeBenchmark(symbolProfileId: string) {
    this.benchmarkChanged.emit(symbolProfileId);
  }

  private initialize() {
    const benchmarkDataValues: Record<string, number> = {};

    for (const { date, value } of this.benchmarkDataItems()) {
      benchmarkDataValues[date] = value;
    }

    const data: ChartData<'line'> = {
      datasets: [
        {
          backgroundColor: `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`,
          borderColor: `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`,
          borderWidth: 2,
          data: this.performanceDataItems().map(({ date, value }) => {
            return {
              x: parseDate(date)?.getTime() ?? null,
              y: value * 100
            };
          }),
          label: $localize`Portfolio`
        },
        {
          backgroundColor: `rgb(${secondaryColorRgb.r}, ${secondaryColorRgb.g}, ${secondaryColorRgb.b})`,
          borderColor: `rgb(${secondaryColorRgb.r}, ${secondaryColorRgb.g}, ${secondaryColorRgb.b})`,
          borderWidth: 2,
          data: this.performanceDataItems().map(({ date }) => {
            return {
              x: parseDate(date)?.getTime() ?? null,
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
        this.chart.options.plugins ??= {};
        this.chart.options.plugins.tooltip =
          this.getTooltipPluginConfiguration();

        this.chart.update();
      } else {
        this.chart = new Chart<'line'>(this.chartCanvas().nativeElement, {
          data,
          options: {
            animation: false,
            elements: {
              line: {
                tension: 0
              },
              point: {
                hoverBackgroundColor: getBackgroundColor(this.colorScheme()),
                hoverRadius: 2,
                radius: 0
              }
            },
            interaction: { intersect: false, mode: 'index' },
            maintainAspectRatio: true,
            plugins: {
              annotation: {
                annotations: {
                  yAxis: {
                    borderColor: `rgba(${getTextColor(this.colorScheme())}, 0.1)`,
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
                color: `rgba(${getTextColor(this.colorScheme())}, 0.1)`
              }
            },
            responsive: true,
            scales: {
              x: {
                border: {
                  color: `rgba(${getTextColor(this.colorScheme())}, 0.1)`,
                  width: 1
                },
                display: true,
                grid: {
                  display: false
                },
                type: 'time',
                time: {
                  tooltipFormat: getDateFormatString(this.locale()),
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
                      return `rgba(${getTextColor(this.colorScheme())}, 0.1)`;
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
            getVerticalHoverLinePlugin(this.chartCanvas(), this.colorScheme())
          ],
          type: 'line'
        });
      }
    }
  }

  private getTooltipPluginConfiguration(): Partial<TooltipOptions<'line'>> {
    return {
      ...getTooltipOptions({
        colorScheme: this.colorScheme(),
        locale: this.locale(),
        unit: '%'
      }),
      mode: 'index',
      position: 'top',
      xAlign: 'center',
      yAlign: 'bottom'
    };
  }
}
