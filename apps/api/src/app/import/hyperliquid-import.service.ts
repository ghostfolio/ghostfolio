import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { CreateOrderDto } from '@ghostfolio/common/dtos';

import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Type } from '@prisma/client';
import { parseISO } from 'date-fns';

import { HyperliquidImportDto } from './hyperliquid-import.dto';

interface HyperliquidSpotMetaResponse {
  tokens: {
    fullName: string | null;
    index: number;
    name: string;
  }[];
  universe: {
    name: string;
    tokens: number[];
  }[];
}

interface HyperliquidFill {
  builderFee?: string;
  coin: string;
  fee: string;
  px: string;
  side: 'A' | 'B';
  time: number;
  sz: string;
}

interface HyperliquidFunding {
  delta: {
    coin: string;
    usdc: string;
  };
  time: number;
}

interface HyperliquidLedgerUpdate {
  delta: {
    type: string;
    [key: string]: unknown;
  };
  time: number;
}

@Injectable()
export class HyperliquidImportService {
  private static readonly API_URL = 'https://api.hyperliquid.xyz/info';

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  public async getActivities({
    from,
    includeLedger = true,
    to,
    walletAddress
  }: HyperliquidImportDto): Promise<CreateOrderDto[]> {
    const [fills, funding, ledgerUpdates, spotSymbolMap] = await Promise.all([
      this.postInfo<HyperliquidFill[]>({
        payload: {
          type: 'userFills',
          user: walletAddress
        }
      }),
      this.postInfo<HyperliquidFunding[]>({
        payload: {
          endTime: to ? parseISO(to).getTime() : undefined,
          startTime: from ? parseISO(from).getTime() : undefined,
          type: 'userFunding',
          user: walletAddress
        }
      }),
      includeLedger
        ? this.postInfo<HyperliquidLedgerUpdate[]>({
            payload: {
              endTime: to ? parseISO(to).getTime() : undefined,
              startTime: from ? parseISO(from).getTime() : undefined,
              type: 'userNonFundingLedgerUpdates',
              user: walletAddress
            }
          })
        : Promise.resolve([]),
      this.getSpotSymbolMap()
    ]);

    const activities: CreateOrderDto[] = [];

    for (const fill of fills ?? []) {
      const price = this.parseNumber(fill.px);
      const quantity = this.parseNumber(fill.sz);

      if (price === undefined || quantity === undefined || !fill.side) {
        continue;
      }

      const fee = Math.max(
        0,
        this.parseNumber(fill.fee, 0) + this.parseNumber(fill.builderFee, 0)
      );

      activities.push({
        currency: DEFAULT_CURRENCY,
        dataSource: DataSource.HYPERLIQUID,
        date: new Date(fill.time).toISOString(),
        fee,
        quantity: Math.abs(quantity),
        symbol: this.normalizeSymbol(fill.coin, spotSymbolMap),
        type: fill.side === 'B' ? Type.BUY : Type.SELL,
        unitPrice: price
      });
    }

    for (const fundingItem of funding ?? []) {
      const amount = this.parseNumber(fundingItem?.delta?.usdc);
      const symbol = this.normalizeSymbol(
        fundingItem?.delta?.coin,
        spotSymbolMap
      );

      if (amount === undefined || amount === 0 || !symbol) {
        continue;
      }

      activities.push({
        currency: DEFAULT_CURRENCY,
        dataSource: DataSource.HYPERLIQUID,
        date: new Date(fundingItem.time).toISOString(),
        fee: 0,
        quantity: 1,
        symbol,
        type: amount > 0 ? Type.INTEREST : Type.FEE,
        unitPrice: Math.abs(amount)
      });
    }

    for (const ledgerItem of ledgerUpdates ?? []) {
      const mappedActivity = this.mapLedgerUpdate({
        ledgerItem,
        spotSymbolMap
      });

      if (mappedActivity) {
        activities.push(mappedActivity);
      }
    }

    return activities.sort((activity1, activity2) => {
      return (
        new Date(activity1.date).getTime() - new Date(activity2.date).getTime()
      );
    });
  }

  private mapLedgerUpdate({
    ledgerItem,
    spotSymbolMap
  }: {
    ledgerItem: HyperliquidLedgerUpdate;
    spotSymbolMap: Record<string, string>;
  }): CreateOrderDto | undefined {
    const { delta } = ledgerItem;

    if (delta.type === 'rewardsClaim') {
      const amount = this.parseNumber(this.getString(delta.amount));
      const token = this.getString(delta.token);

      if (amount === undefined || amount <= 0 || !token) {
        return undefined;
      }

      return {
        currency: DEFAULT_CURRENCY,
        dataSource: DataSource.HYPERLIQUID,
        date: new Date(ledgerItem.time).toISOString(),
        fee: 0,
        quantity: 1,
        symbol: this.normalizeSymbol(token, spotSymbolMap),
        type: Type.INTEREST,
        unitPrice: amount
      };
    }

    if (
      ['internalTransfer', 'send', 'spotTransfer', 'withdraw'].includes(
        delta.type
      )
    ) {
      const amount = this.parseNumber(this.getString(delta.fee));
      const feeToken = this.getString(delta.feeToken);
      const token = this.getString(delta.token);

      if (amount === undefined || amount <= 0) {
        return undefined;
      }

      return {
        currency: DEFAULT_CURRENCY,
        dataSource: DataSource.HYPERLIQUID,
        date: new Date(ledgerItem.time).toISOString(),
        fee: 0,
        quantity: 1,
        symbol: this.normalizeSymbol(
          feeToken ?? token ?? DEFAULT_CURRENCY,
          spotSymbolMap
        ),
        type: Type.FEE,
        unitPrice: amount
      };
    }

    if (delta.type === 'vaultWithdraw') {
      const amount =
        this.parseNumber(this.getString(delta.commission), 0) +
        this.parseNumber(this.getString(delta.closingCost), 0);

      if (amount <= 0) {
        return undefined;
      }

      return {
        currency: DEFAULT_CURRENCY,
        dataSource: DataSource.HYPERLIQUID,
        date: new Date(ledgerItem.time).toISOString(),
        fee: 0,
        quantity: 1,
        symbol: DEFAULT_CURRENCY,
        type: Type.FEE,
        unitPrice: amount
      };
    }

    // Unsupported ledger delta types intentionally skipped in phase-2 v1.
    return undefined;
  }

  private async getSpotSymbolMap() {
    try {
      const spotMeta = await this.postInfo<HyperliquidSpotMetaResponse>({
        payload: { type: 'spotMeta' }
      });

      const tokenByIndex = new Map(
        (spotMeta?.tokens ?? []).map((token) => {
          return [token.index, token.name];
        })
      );

      return (spotMeta?.universe ?? []).reduce<Record<string, string>>(
        (result, universeItem) => {
          if (!universeItem?.name || universeItem.tokens.length < 2) {
            return result;
          }

          const baseToken = tokenByIndex.get(universeItem.tokens[0]);
          const quoteToken = tokenByIndex.get(universeItem.tokens[1]);

          if (!baseToken || !quoteToken) {
            return result;
          }

          result[universeItem.name] =
            `${baseToken}/${quoteToken}`.toUpperCase();

          return result;
        },
        {}
      );
    } catch (error) {
      Logger.error(error, 'HyperliquidImportService');
      return {};
    }
  }

  private normalizeSymbol(
    symbol: string,
    spotSymbolMap: Record<string, string>
  ) {
    if (!symbol) {
      return DEFAULT_CURRENCY;
    }

    if (spotSymbolMap[symbol]) {
      return spotSymbolMap[symbol];
    }

    return symbol.toUpperCase();
  }

  private parseNumber(value?: string, fallback?: number) {
    if (value === undefined) {
      return fallback;
    }

    const parsedValue = Number.parseFloat(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }

    return fallback;
  }

  private getString(value: unknown) {
    return typeof value === 'string' ? value : undefined;
  }

  private async postInfo<T>({ payload }: { payload: unknown }): Promise<T> {
    const response = await fetch(HyperliquidImportService.API_URL, {
      body: JSON.stringify(payload),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      signal: AbortSignal.timeout(
        this.configurationService.get('REQUEST_TIMEOUT')
      )
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data?.type === 'error') {
      throw new Error(data?.message ?? 'Hyperliquid API error');
    }

    return data as T;
  }
}
