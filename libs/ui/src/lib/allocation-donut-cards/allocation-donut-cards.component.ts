import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { getLocale, getTextColor } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  PortfolioPosition
} from '@ghostfolio/common/interfaces';
import { ColorScheme } from '@ghostfolio/common/types';

import { CommonModule, CurrencyPipe, PercentPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  output,
  SimpleChanges,
  viewChild
} from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DataSource } from '@prisma/client';
import { Big } from 'big.js';
import {
  ArcElement,
  Chart,
  type ChartData,
  type ChartDataset,
  DoughnutController,
  LinearScale,
  Tooltip
} from 'chart.js';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import OpenColor from 'open-color';

import { translate } from '../i18n';

const {
  blue,
  cyan,
  grape,
  green,
  indigo,
  lime,
  orange,
  pink,
  red,
  teal,
  violet,
  yellow
} = OpenColor;

export interface AllocationSlice {
  color: string;
  key: string;
  name: string;
  percentage: number;
  value: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CurrencyPipe,
    MatTooltipModule,
    NgxSkeletonLoaderModule,
    PercentPipe
  ],
  selector: 'gf-allocation-donut-cards',
  styleUrls: ['./allocation-donut-cards.component.scss'],
  templateUrl: './allocation-donut-cards.component.html'
})
export class GfAllocationDonutCardsComponent implements OnChanges, OnDestroy {
  @Input() baseCurrency: string;
  @Input() colorScheme: ColorScheme;
  @Input() data: {
    [symbol: string]: Pick<PortfolioPosition, 'type'> & {
      dataSource?: DataSource;
      name: string;
      value: number;
    };
  } = {};
  @Input() isInPercent = false;
  @Input() keys: string[] = [];
  @Input() locale = getLocale();
  @Input() maxItems = 12;
  @Input() title = '';

  public chart: Chart<'doughnut'>;
  public isLoading = true;
  public slices: AllocationSlice[] = [];
  public totalValue = 0;

  protected readonly sliceClicked = output<AssetProfileIdentifier>();

  private readonly OTHER_KEY = 'OTHER';

  private readonly chartCanvas =
    viewChild<ElementRef<HTMLCanvasElement>>('donutCanvas');

  public constructor() {
    Chart.register(ArcElement, DoughnutController, LinearScale, Tooltip);
  }

  public ngOnChanges(_changes: SimpleChanges) {
    if (this.data) {
      this.initialize();
    }
  }

  public ngOnDestroy() {
    this.chart?.destroy();
  }

  public onSliceClick(slice: AllocationSlice) {
    const entry = Object.entries(this.data).find(([, item]) => {
      return item.name === slice.name || item.dataSource;
    });

    if (entry) {
      const [symbol, item] = entry;
      if (item.dataSource) {
        this.sliceClicked.emit({ dataSource: item.dataSource, symbol });
      }
    }
  }

  public get totalFormatted(): string {
    if (this.isInPercent) {
      return '100%';
    }
    if (this.totalValue >= 1_000_000) {
      return `$${(this.totalValue / 1_000_000).toFixed(1)}M`;
    }
    if (this.totalValue >= 1_000) {
      return `$${(this.totalValue / 1_000).toFixed(0)}K`;
    }
    return `$${this.totalValue.toFixed(0)}`;
  }

  private initialize() {
    this.isLoading = true;

    const chartData: {
      [key: string]: { name: string; value: Big };
    } = {};

    const primaryKey = this.keys?.[0];

    if (primaryKey) {
      Object.keys(this.data).forEach((symbol) => {
        const asset = this.data[symbol];
        const assetValue = asset.value || 0;
        const keyValue = (asset[primaryKey] as string)?.toUpperCase() || UNKNOWN_KEY;

        if (chartData[keyValue]) {
          chartData[keyValue].value = chartData[keyValue].value.plus(assetValue);
        } else {
          chartData[keyValue] = {
            name: (asset[primaryKey] as string) || UNKNOWN_KEY,
            value: new Big(assetValue)
          };
        }
      });
    } else {
      Object.keys(this.data).forEach((symbol) => {
        chartData[symbol] = {
          name: this.data[symbol].name,
          value: new Big(this.data[symbol].value || 0)
        };
      });
    }

    // Sort descending by value
    let sorted = Object.entries(chartData)
      .sort(([, a], [, b]) => b.value.minus(a.value).toNumber())
      .filter(([, item]) => item.value.gt(0));

    // Group overflow into "Other"
    if (this.maxItems && sorted.length > this.maxItems) {
      const rest = sorted.splice(this.maxItems);
      const otherValue = rest.reduce(
        (sum, [, item]) => sum.plus(item.value),
        new Big(0)
      );
      sorted.push([this.OTHER_KEY, { name: 'Other', value: otherValue }]);
    }

    // Calculate total
    this.totalValue = sorted.reduce(
      (sum, [, item]) => sum + item.value.toNumber(),
      0
    );

    // Build slices with colors
    const palette = this.getColorPalette();
    this.slices = sorted.map(([key, item], index) => {
      let color: string;
      if (key === this.OTHER_KEY) {
        color = `rgba(${getTextColor(this.colorScheme)}, 0.24)`;
      } else if (key === UNKNOWN_KEY) {
        color = `rgba(${getTextColor(this.colorScheme)}, 0.12)`;
      } else {
        color = palette[index % palette.length];
      }

      const percentage =
        this.totalValue > 0 ? item.value.toNumber() / this.totalValue : 0;

      return {
        color,
        key,
        name: translate(item.name) || key,
        percentage,
        value: item.value.toNumber()
      };
    });

    // Build chart
    this.buildChart();
    this.isLoading = false;
  }

  private buildChart() {
    const canvas = this.chartCanvas();
    if (!canvas) {
      return;
    }

    const backgrounds = this.slices.map((s) => s.color);
    const values = this.slices.map((s) => s.value);

    const datasets: ChartDataset<'doughnut'>[] = [
      {
        backgroundColor: backgrounds.length > 0 ? backgrounds : [`rgba(${getTextColor(this.colorScheme)}, 0.12)`],
        borderWidth: 0,
        data: values.length > 0 ? values : [1],
        hoverOffset: 4
      }
    ];

    const data: ChartData<'doughnut'> = {
      datasets,
      labels: this.slices.map((s) => s.name)
    };

    if (this.chart) {
      this.chart.data = data;
      this.chart.update();
    } else {
      this.chart = new Chart<'doughnut'>(canvas.nativeElement, {
        data,
        options: {
          animation: false,
          cutout: '75%',
          layout: { padding: 0 },
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          },
          responsive: true,
          maintainAspectRatio: true
        },
        type: 'doughnut'
      });
    }
  }

  private getColorPalette(): string[] {
    return [
      blue[5],
      teal[5],
      lime[5],
      orange[5],
      pink[5],
      violet[5],
      indigo[5],
      cyan[5],
      green[5],
      yellow[5],
      red[5],
      grape[5]
    ];
  }
}
