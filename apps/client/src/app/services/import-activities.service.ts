import { CreateAccountDto } from '@ghostfolio/api/app/account/create-account.dto';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { parseDate as parseDateHelper } from '@ghostfolio/common/helper';

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Account, DataSource, Type as ActivityType } from '@prisma/client';
import { isFinite } from 'lodash';
import { parse as csvToJson } from 'papaparse';
import { EMPTY, map, firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ImportActivitiesService {
  private static ACCOUNT_KEYS = ['account', 'accountid'];
  private static COMMENT_KEYS = ['comment', 'note'];
  private static CURRENCY_KEYS = ['ccy', 'currency', 'currencyprimary'];
  private static DATA_SOURCE_KEYS = ['datasource'];
  // Trade Date takes precedence over Date
  private static DATE_KEYS = ['trade date', 'tradedate', 'date'];
  private static FEE_KEYS = ['commission', 'fee', 'ibcommission'];
  private static QUANTITY_KEYS = ['qty', 'quantity', 'shares', 'units'];
  private static SYMBOL_KEYS = ['code', 'symbol', 'ticker'];
  private static TYPE_KEYS = ['action', 'buy/sell', 'type'];
  private static UNIT_PRICE_KEYS = [
    'price',
    'purchase price',
    'tradeprice',
    'unitprice',
    'value'
  ];

  private warnings: string[] = [];

  public constructor(
    private dataService: DataService,
    private http: HttpClient
  ) {}

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
    warnings: string[];
  }> {
    this.warnings = [];

    const content = csvToJson(fileContent, {
      dynamicTyping: true,
      header: true,
      skipEmptyLines: true
    }).data;

    const activities: CreateOrderDto[] = [];
    for (const [index, item] of content.entries()) {
      activities.push({
        accountId: this.parseAccount({ item, userAccounts }),
        comment: this.parseComment({ item }),
        currency: await this.parseCurrency({ content, index, item }),
        dataSource: this.parseDataSource({ item }),
        date: this.parseDate({ content, index, item }),
        fee: this.parseFee({ index, item }),
        quantity: this.parseQuantity({ content, index, item }),
        symbol: this.parseSymbol({ content, index, item }),
        type: this.parseType({ index, item }),
        unitPrice: this.parseUnitPrice({ content, index, item }),
        updateAccountBalance: false
      });
    }

    return {
      activities: (await this.importJson({ activities, isDryRun })).activities,
      warnings: this.warnings
    };
  }

  public importJson({
    accounts,
    activities,
    isDryRun = false
  }: {
    activities: CreateOrderDto[];
    accounts?: CreateAccountDto[];
    isDryRun?: boolean;
  }): Promise<{
    activities: Activity[];
    accounts?: CreateAccountDto[];
  }> {
    return new Promise((resolve, reject) => {
      this.postImport(
        {
          accounts,
          activities
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
    activities
  }: {
    accounts: CreateAccountDto[];
    activities: Activity[];
  }): Promise<{
    activities: Activity[];
    accounts?: CreateAccountDto[];
  }> {
    const importData: CreateOrderDto[] = [];

    for (const activity of activities) {
      importData.push(this.convertToCreateOrderDto(activity));
    }

    return this.importJson({ accounts, activities: importData });
  }

  private convertToCreateOrderDto({
    accountId,
    comment,
    date,
    fee,
    quantity,
    SymbolProfile,
    type,
    unitPrice,
    updateAccountBalance
  }: Activity): CreateOrderDto {
    return {
      accountId,
      comment,
      fee,
      quantity,
      type,
      unitPrice,
      updateAccountBalance,
      currency: SymbolProfile.currency,
      dataSource: SymbolProfile.dataSource,
      date: date.toString(),
      symbol: SymbolProfile.symbol
    };
  }

  private lowercaseKeys(aObject: any) {
    return Object.keys(aObject).reduce((acc, key) => {
      acc[key.toLowerCase()] = aObject[key];
      return acc;
    }, {});
  }

  private parseAccount({
    item,
    userAccounts
  }: {
    item: any;
    userAccounts: Account[];
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.ACCOUNT_KEYS) {
      if (item[key]) {
        return userAccounts.find((account) => {
          return (
            account.id === item[key] ||
            account.name.toLowerCase() === item[key].toLowerCase()
          );
        })?.id;
      }
    }

    return undefined;
  }

  private parseComment({ item }: { item: any }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.COMMENT_KEYS) {
      if (item[key]) {
        return item[key];
      }
    }

    return undefined;
  }

  private async parseCurrency({
    content,
    index,
    item
  }: {
    content: any[];
    index: number;
    item: any;
  }) {
    item = this.lowercaseKeys(item);

    // Attempt to find currency in the CSV
    for (const key of ImportActivitiesService.CURRENCY_KEYS) {
      if (item[key]) {
        return item[key];
      }
    }

    // If no currency in CSV, make an API request to get symbol data
    const symbol = this.parseSymbol({ content, index, item });
    const dataSource = this.parseDataSource({ item });

    return firstValueFrom(
      this.dataService.fetchSymbolItem({ dataSource, symbol }).pipe(
        map(({ currency }) => {
          if (currency) {
            console.warn(
              `activities.${index}.currency was not provided, using ${currency} from symbol data`
            );
            return currency;
          }

          throw {
            activities: content,
            message: `activities.${index}.currency is not valid`
          };
        }),
        catchError((error) => {
          console.warn('Failed to fetch currency from symbol service.', error);

          throw {
            activities: content,
            message: `activities.${index}.currency is not valid`
          };
        })
      )
    );
  }

  private parseDataSource({ item }: { item: any }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.DATA_SOURCE_KEYS) {
      if (item[key]) {
        return DataSource[item[key].toUpperCase()];
      }
    }

    // If no data source specified, check the type
    const type = this.parseType({ index: 0, item });
    if (type === 'ITEM' || type === 'LIABILITY') {
      return DataSource.MANUAL;
    }

    // Use default data source from info
    const info = this.dataService.fetchInfo();
    return info.defaultDataSource;
  }

  private parseDate({
    content,
    index,
    item
  }: {
    content: any[];
    index: number;
    item: any;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.DATE_KEYS) {
      if (item[key]) {
        try {
          return parseDateHelper(item[key].toString()).toISOString();
        } catch {}
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.date is not valid`
    };
  }

  private parseFee({ index, item }: { index: number; item: any }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.FEE_KEYS) {
      if (isFinite(item[key])) {
        return Math.abs(item[key]);
      }
    }

    this.warnings.push(`activities.${index}.fee is missing, defaulting to 0`);
    return 0;
  }

  private parseQuantity({
    content,
    index,
    item
  }: {
    content: any[];
    index: number;
    item: any;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.QUANTITY_KEYS) {
      if (isFinite(item[key])) {
        return Math.abs(item[key]);
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
    content: any[];
    index: number;
    item: any;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.SYMBOL_KEYS) {
      if (item[key]) {
        return item[key];
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.symbol is not valid`
    };
  }

  private parseType({
    index,
    item
  }: {
    index: number;
    item: any;
  }): ActivityType {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.TYPE_KEYS) {
      if (item[key]) {
        switch (item[key].toLowerCase()) {
          case 'buy':
            return 'BUY';
          case 'dividend':
            return 'DIVIDEND';
          case 'fee':
            return 'FEE';
          case 'interest':
            return 'INTEREST';
          case 'item':
            return 'ITEM';
          case 'liability':
            return 'LIABILITY';
          case 'sell':
            return 'SELL';
          default:
            break;
        }
      }
    }

    this.warnings.push(
      `activities.${index}.type is missing, defaulting to BUY`
    );
    return 'BUY';
  }

  private parseUnitPrice({
    content,
    index,
    item
  }: {
    content: any[];
    index: number;
    item: any;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportActivitiesService.UNIT_PRICE_KEYS) {
      if (isFinite(item[key])) {
        return Math.abs(item[key]);
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.unitPrice is not valid`
    };
  }

  private postImport(
    aImportData: { accounts: CreateAccountDto[]; activities: CreateOrderDto[] },
    aIsDryRun = false
  ) {
    return this.http.post<{ activities: Activity[] }>(
      `/api/v1/import?dryRun=${aIsDryRun}`,
      aImportData
    );
  }
}
