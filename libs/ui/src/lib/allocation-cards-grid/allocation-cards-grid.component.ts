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
  Input,
  OnChanges,
  output,
  SimpleChanges
} from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DataSource } from '@prisma/client';
import { Big } from 'big.js';
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

export interface AllocationCard {
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
  selector: 'gf-allocation-cards-grid',
  styleUrls: ['./allocation-cards-grid.component.scss'],
  templateUrl: './allocation-cards-grid.component.html'
})
export class GfAllocationCardsGridComponent implements OnChanges {
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

  public cards: AllocationCard[] = [];
  public isLoading = true;
  public totalValue = 0;

  protected readonly cardClicked = output<AssetProfileIdentifier>();

  private readonly OTHER_KEY = 'OTHER';

  public ngOnChanges(_changes: SimpleChanges) {
    if (this.data) {
      this.initialize();
    }
  }

  public onCardClick(card: AllocationCard) {
    const entry = Object.entries(this.data).find(([, item]) => {
      return item.name === card.name && item.dataSource;
    });

    if (entry) {
      const [symbol, item] = entry;
      if (item.dataSource) {
        this.cardClicked.emit({ dataSource: item.dataSource, symbol });
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
        const keyValue =
          (asset[primaryKey] as string)?.toUpperCase() || UNKNOWN_KEY;

        if (chartData[keyValue]) {
          chartData[keyValue].value =
            chartData[keyValue].value.plus(assetValue);
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

    let sorted = Object.entries(chartData)
      .sort(([, a], [, b]) => b.value.minus(a.value).toNumber())
      .filter(([, item]) => item.value.gt(0));

    if (this.maxItems && sorted.length > this.maxItems) {
      const rest = sorted.splice(this.maxItems);
      const otherValue = rest.reduce(
        (sum, [, item]) => sum.plus(item.value),
        new Big(0)
      );
      sorted.push([this.OTHER_KEY, { name: 'Other', value: otherValue }]);
    }

    this.totalValue = sorted.reduce(
      (sum, [, item]) => sum + item.value.toNumber(),
      0
    );

    const palette = this.getColorPalette();
    this.cards = sorted.map(([key, item], index) => {
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

    this.isLoading = false;
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
