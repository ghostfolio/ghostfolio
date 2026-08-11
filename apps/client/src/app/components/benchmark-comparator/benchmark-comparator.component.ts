import {
  getChartBorderColor,
  getChartElementsOptions,
  getTimeAxisOptions,
  getValueAxisOptions,
  getVerticalHoverLinePlugin,
  getZeroLineAnnotation
} from '@ghostfolio/common/chart-helper';
import { primaryColorRgb, secondaryColorRgb } from '@ghostfolio/common/config';
import { getLocale, parseDate } from '@ghostfolio/common/helper';
import { LineChartItem, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { ColorScheme } from '@ghostfolio/common/types';
import {
  getTimeSeriesTooltipOptions,
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
  public readonly hasPermissionToUpdateUserSettings = input<boolean>();
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
                display: false
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
    return getTimeSeriesTooltipOptions<'line'>({
      colorScheme: this.colorScheme(),
      locale: this.locale(),
      unit: '%'
    });
  }
}
