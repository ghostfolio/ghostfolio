import {
  CreateAccountWithBalancesDto,
  CreateAssetProfileWithMarketDataDto,
  CreateOrderDto,
  CreateTagDto
} from '@ghostfolio/common/dtos';
import { parseDate as parseDateHelper } from '@ghostfolio/common/helper';
import { Activity } from '@ghostfolio/common/interfaces';

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Account, DataSource, Type as ActivityType } from '@prisma/client';
import { isFinite, isNumber, isString } from 'lodash';
import { parse as csvToJson } from 'papaparse';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ImportActivitiesService {
  private static ACCOUNT_KEYS = ['account', 'accountid'];
  private static COMMENT_KEYS = ['comment', 'note'];
  private static CURRENCY_KEYS = ['ccy', 'currency', 'currencyprimary'];
  private static DATA_SOURCE_KEYS = ['datasource'];
  private static DATE_KEYS = ['date', 'tradedate'];
  private static FEE_KEYS = ['commission', 'fee', 'ibcommission'];
  private static QUANTITY_KEYS = ['qty', 'quantity', 'shares', 'units'];
  private static SYMBOL_KEYS = ['code', 'symbol', 'ticker'];
  private static TYPE_KEYS = ['action', 'buy/sell', 'type'];
  private static UNIT_PRICE_KEYS = [
    'price',
    'tradeprice',
    'unitprice',
    'value'
  ];

  private readonly http = inject(HttpClient);

  public async importCsv({
    fileContent,
    isDryRun = false,
    userAccounts
  }: {
    fileContent: string;
    isDryRun?: boolean;
    userAccounts: Account[];
  }): Promise<{
    activities: Activity[];
    assetProfiles: CreateAssetProfileWithMarketDataDto[];
  }> {
    const content = csvToJson<Record<string, unknown>>(fileContent, {
      dynamicTyping: true,
      header: true,
      skipEmptyLines: true
    }).data;

    const activities: CreateOrderDto[] = [];
    const assetProfiles: CreateAssetProfileWithMarketDataDto[] = [];

    for (const [index, item] of content.entries()) {
      const currency = this.parseCurrency({ content, index, item });
      const dataSource = this.parseDataSource({ item });
      const symbol = this.parseSymbol({ content, index, item });
      const type = this.parseType({ content, index, item });

      activities.push({
        currency,
        dataSource,
        symbol,
        type,
        accountId: this.parseAccount({ item, userAccounts }),
        comment: this.parseComment({ item }),
        date: this.parseDate({ content, index, item }),
        fee: this.parseFee({ content, index, item }),
        quantity: this.parseQuantity({ content, index, item }),
        unitPrice: this.parseUnitPrice({ content, index, item }),
        updateAccountBalance: false
      });

      if (dataSource === DataSource.MANUAL) {
        // Create synthetic asset profile for MANUAL data source
        assetProfiles.push({
          currency,
          symbol,
          assetClass: undefined,
          assetSubClass: undefined,
          comment: undefined,
          countries: [],
          cusip: undefined,
          dataSource: DataSource.MANUAL,
          figi: undefined,
          figiComposite: undefined,
          figiShareClass: undefined,
          holdings: [],
          isActive: true,
          isin: undefined,
          marketData: [],
          name: symbol,
          sectors: [],
          url: undefined
        });
      }
    }

    const result = await this.importJson({
      activities,
      assetProfiles,
      isDryRun
    });
    return { ...result, assetProfiles };
  }

  public importJson({
    accounts,
    activities,
    assetProfiles,
    isDryRun = false,
    tags
  }: {
    activities: CreateOrderDto[];
    accounts?: CreateAccountWithBalancesDto[];
    assetProfiles?: CreateAssetProfileWithMarketDataDto[];
    isDryRun?: boolean;
    tags?: CreateTagDto[];
  }): Promise<{
    activities: Activity[];
  }> {
    return new Promise((resolve, reject) => {
      this.postImport(
        {
          accounts,
          activities,
          assetProfiles,
          tags
        },
        isDryRun
      )
        .pipe(
          catchError((error) => {
            reject(error);
            return EMPTY;
          })
        )
        .subscribe({
          next: (data) => {
            resolve(data);
          }
        });
    });
  }

  public importSelectedActivities({
    accounts,
    activities,
    assetProfiles,
    tags
  }: {
    accounts?: CreateAccountWithBalancesDto[];
    activities: Activity[];
    assetProfiles?: CreateAssetProfileWithMarketDataDto[];
    tags?: CreateTagDto[];
  }): Promise<{
    activities: Activity[];
  }> {
    const importData: CreateOrderDto[] = [];

    for (const activity of activities) {
      importData.push(this.convertToCreateOrderDto(activity));
    }

    return this.importJson({
      accounts,
      assetProfiles,
      tags,
      activities: importData
    });
  }

  private convertToCreateOrderDto({
    accountId,
    comment,
    currency,
    date,
    fee,
    quantity,
    SymbolProfile,
    tags,
    type,
    unitPrice,
    updateAccountBalance
  }: Activity): CreateOrderDto {
    return {
      fee,
      quantity,
      type,
      unitPrice,
      updateAccountBalance,
      accountId: accountId ?? undefined,
      comment: comment ?? undefined,
      currency: currency ?? SymbolProfile.currency ?? '',
      dataSource: SymbolProfile.dataSource,
      date: date.toString(),
      symbol: SymbolProfile.symbol,
      tags: tags?.map(({ id }) => {
        return id;
      })
    };
  }

  private lowercaseKeys(aObject: Record<string, unknown>) {
    return Object.keys(aObject).reduce<Record<string, unknown>>((acc, key) => {
      acc[key.toLowerCase()] = aObject[key];
      return acc;
    }, {});
  }

  private parseAccount({
    item,
    userAccounts
  }: {
    item: Record<string, unknown>;
    userAccounts: Account[];
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.ACCOUNT_KEYS) {
      const val = item[key];
      if (isString(val) || isNumber(val)) {
        return userAccounts.find((account) => {
          return (
            account.id === val ||
            account.name?.toLowerCase() === String(val).toLowerCase()
          );
        })?.id;
      }
    }

    return undefined;
  }

  private parseComment({ item }: { item: Record<string, unknown> }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.COMMENT_KEYS) {
      const val = item[key];
      if (isString(val) || isNumber(val)) {
        return String(val);
      }
    }

    return undefined;
  }

  private parseCurrency({
    content,
    index,
    item
  }: {
    content: Record<string, unknown>[];
    index: number;
    item: Record<string, unknown>;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.CURRENCY_KEYS) {
      const val = item[key];
      if (isString(val)) {
        return val;
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.currency is not valid`
    };
  }

  private parseDataSource({ item }: { item: Record<string, unknown> }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.DATA_SOURCE_KEYS) {
      const val = item[key];
      if (isString(val)) {
        return DataSource[val.toUpperCase() as keyof typeof DataSource];
      }
    }

    return undefined;
  }

  private parseDate({
    content,
    index,
    item
  }: {
    content: Record<string, unknown>[];
    index: number;
    item: Record<string, unknown>;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.DATE_KEYS) {
      const val = item[key];
      if (isString(val) || isNumber(val)) {
        try {
          const parsedDate = parseDateHelper(String(val));
          if (parsedDate) {
            return parsedDate.toISOString();
          }
        } catch {}
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.date is not valid`
    };
  }

  private parseFee({
    content,
    index,
    item
  }: {
    content: Record<string, unknown>[];
    index: number;
    item: Record<string, unknown>;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.FEE_KEYS) {
      const val = item[key];
      if (isNumber(val) && isFinite(val)) {
        return Math.abs(val);
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.fee is not valid`
    };
  }

  private parseQuantity({
    content,
    index,
    item
  }: {
    content: Record<string, unknown>[];
    index: number;
    item: Record<string, unknown>;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.QUANTITY_KEYS) {
      const val = item[key];
      if (isNumber(val) && isFinite(val)) {
        return Math.abs(val);
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.quantity is not valid`
    };
  }

  private parseSymbol({
    content,
    index,
    item
  }: {
    content: Record<string, unknown>[];
    index: number;
    item: Record<string, unknown>;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.SYMBOL_KEYS) {
      const val = item[key];
      if (isString(val) || isNumber(val)) {
        return String(val);
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.symbol is not valid`
    };
  }

  private parseType({
    content,
    index,
    item
  }: {
    content: Record<string, unknown>[];
    index: number;
    item: Record<string, unknown>;
  }): ActivityType {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.TYPE_KEYS) {
      const val = item[key];
      if (isString(val)) {
        switch (val.toLowerCase()) {
          case 'buy':
            return 'BUY';
          case 'dividend':
            return 'DIVIDEND';
          case 'fee':
            return 'FEE';
          case 'interest':
            return 'INTEREST';
          case 'liability':
            return 'LIABILITY';
          case 'sell':
            return 'SELL';
          default:
            break;
        }
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.type is not valid`
    };
  }

  private parseUnitPrice({
    content,
    index,
    item
  }: {
    content: Record<string, unknown>[];
    index: number;
    item: Record<string, unknown>;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.UNIT_PRICE_KEYS) {
      const val = item[key];
      if (isNumber(val) && isFinite(val)) {
        return Math.abs(val);
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.unitPrice is not valid`
    };
  }

  private postImport(
    aImportData: {
      accounts?: CreateAccountWithBalancesDto[];
      activities: CreateOrderDto[];
      assetProfiles?: CreateAssetProfileWithMarketDataDto[];
      tags?: CreateTagDto[];
    },
    aIsDryRun = false
  ) {
    return this.http.post<{ activities: Activity[] }>(
      `/api/v1/import?dryRun=${aIsDryRun}`,
      aImportData
    );
  }
}
