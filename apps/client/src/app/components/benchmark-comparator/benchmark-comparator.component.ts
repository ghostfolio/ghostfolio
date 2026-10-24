import {
  getBenchmarkColor,
  getChartBorderColor,
  getChartElementsOptions,
  getTimeAxisOptions,
  getValueAxisOptions,
  getVerticalHoverLinePlugin,
  getZeroLineAnnotation
} from '@ghostfolio/common/chart-helper';
import { primaryColorRgb } from '@ghostfolio/common/config';
import { getLocale, parseDate } from '@ghostfolio/common/helper';
import {
  BenchmarkSeries,
  LineChartItem,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { ColorScheme } from '@ghostfolio/common/types';
import type { SymbolProfile } from '@ghostfolio/prisma/browser';
import {
  getTimeSeriesTooltipOptions,
  onPrefersColorSchemeChange,
  registerChartConfiguration
} from '@ghostfolio/ui/chart';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  input,
  OnChanges,
  OnDestroy,
  output,
  SimpleChanges,
  viewChild
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
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
  public readonly benchmarkSeries = input<BenchmarkSeries[]>([]);
  public readonly benchmarks = input<Partial<SymbolProfile>[]>();
  public readonly colorScheme = input<ColorScheme>();
  public readonly isLoading = input<boolean>();

  public readonly locale = input(getLocale(), {
    transform: (value?: string) => {
      return value ?? getLocale();
    }
  });

  public readonly performanceDataItems = input.required<LineChartItem[]>();
  public readonly selectedBenchmarkIds = input<string[]>([]);
  public readonly user = input<User>();

  public readonly benchmarksChanged = output<string[]>();

  protected chart?: Chart<'line'>;
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

    onPrefersColorSchemeChange(() => {
      if (this.chart && !this.colorScheme()) {
        this.chart.destroy();
        this.chart = undefined;

        this.initialize();
      }
    });

    addIcons({ arrowForwardOutline });
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.colorScheme && this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }

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

  protected onChangeBenchmarks(symbolProfileIds: string[]) {
    this.benchmarksChanged.emit(symbolProfileIds);
  }

  private initialize() {
    const portfolioColor = `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`;

    const data: ChartData<'line'> = {
      datasets: [
        {
          backgroundColor: portfolioColor,
          borderColor: portfolioColor,
          borderWidth: 2,
          data: this.performanceDataItems().map(({ date, value }) => {
            return {
              x: parseDate(date)?.getTime() ?? null,
              y: value * 100
            };
          }),
          label: $localize`Portfolio`
        },
        ...this.benchmarkSeries().map(({ items, name }, index) => {
          const color = getBenchmarkColor(index);
          const valuesByDate: Record<string, number> = {};

          for (const { date, value } of items) {
            valuesByDate[date] = value;
          }

          return {
            backgroundColor: color,
            borderColor: color,
            borderWidth: 2,
            data: this.performanceDataItems().map(({ date }) => {
              return {
                x: parseDate(date)?.getTime() ?? null,
                y: valuesByDate[date]
              };
            }),
            label: name ?? $localize`Benchmark`
          };
        })
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
            elements: getChartElementsOptions(this.colorScheme()),
            interaction: { intersect: false, mode: 'index' },
            maintainAspectRatio: true,
            plugins: {
              annotation: {
                annotations: {
                  yAxis: getZeroLineAnnotation(this.colorScheme())
                }
              },
              legend: {
                display: this.benchmarkSeries().length > 0,
                labels: { boxHeight: 2, boxWidth: 16 }
              },
              tooltip: this.getTooltipPluginConfiguration(),
              verticalHoverLine: {
                color: getChartBorderColor(this.colorScheme())
              }
            },
            responsive: true,
            scales: {
              x: getTimeAxisOptions({
                colorScheme: this.colorScheme(),
                locale: this.locale()
              }),
              y: getValueAxisOptions({
                colorScheme: this.colorScheme(),
                tickCallback: (tickValue) => {
                  return `${Number(tickValue).toFixed(2)} %`;
                }
              })
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
      ...getTimeSeriesTooltipOptions<'line'>({
        colorScheme: this.colorScheme(),
        locale: this.locale(),
        unit: '%'
      }),
      // List the best performing line first
      itemSort: (a, b) => {
        // Lines without a value at the hovered date are listed last
        const valueOfA = Number(a.parsed.y);
        const valueOfB = Number(b.parsed.y);

        if (Number.isFinite(valueOfA) && Number.isFinite(valueOfB)) {
          return valueOfB - valueOfA;
        }

        return Number.isFinite(valueOfB)
          ? 1
          : Number.isFinite(valueOfA)
            ? -1
            : 0;
      }
    };
  }
}
