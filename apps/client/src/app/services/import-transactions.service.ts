import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { Account, DataSource, Type } from '@prisma/client';
import { parse } from 'date-fns';
import { isNumber } from 'lodash';
import { parse as csvToJson } from 'papaparse';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ImportTransactionsService {
  private static ACCOUNT_KEYS = ['account', 'accountid'];
  private static CURRENCY_KEYS = ['ccy', 'currency'];
  private static DATA_SOURCE_KEYS = ['datasource'];
  private static DATE_KEYS = ['date'];
  private static FEE_KEYS = ['commission', 'fee'];
  private static QUANTITY_KEYS = ['qty', 'quantity', 'shares', 'units'];
  private static SYMBOL_KEYS = ['code', 'symbol', 'ticker'];
  private static TYPE_KEYS = ['action', 'type'];
  private static UNIT_PRICE_KEYS = ['price', 'unitprice', 'value'];

  public constructor(private http: HttpClient) {}

  public async importCsv({
    fileContent,
    userAccounts
  }: {
    fileContent: string;
    userAccounts: Account[];
  }) {
    const content = csvToJson(fileContent, {
      dynamicTyping: true,
      header: true,
      skipEmptyLines: true
    }).data;

    const activities: CreateOrderDto[] = [];
    for (const [index, item] of content.entries()) {
      activities.push({
        accountId: this.parseAccount({ item, userAccounts }),
        currency: this.parseCurrency({ content, index, item }),
        dataSource: this.parseDataSource({ item }),
        date: this.parseDate({ content, index, item }),
        fee: this.parseFee({ content, index, item }),
        quantity: this.parseQuantity({ content, index, item }),
        symbol: this.parseSymbol({ content, index, item }),
        type: this.parseType({ content, index, item }),
        unitPrice: this.parseUnitPrice({ content, index, item })
      });
    }

    await this.importJson({ content: activities });
  }

  public importJson({ content }: { content: CreateOrderDto[] }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.postImport({
        activities: content
      })
        .pipe(
          catchError((error) => {
            reject(error);
            return EMPTY;
          })
        )
        .subscribe({
          next: () => {
            resolve();
          }
        });
    });
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

    for (const key of ImportTransactionsService.ACCOUNT_KEYS) {
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

  private parseCurrency({
    content,
    index,
    item
  }: {
    content: any[];
    index: number;
    item: any;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportTransactionsService.CURRENCY_KEYS) {
      if (item[key]) {
        return item[key];
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.currency is not valid`
    };
  }

  private parseDataSource({ item }: { item: any }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportTransactionsService.DATA_SOURCE_KEYS) {
      if (item[key]) {
        return DataSource[item[key].toUpperCase()];
      }
    }

    return undefined;
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
    let date: string;

    for (const key of ImportTransactionsService.DATE_KEYS) {
      if (item[key]) {
        try {
          date = parse(item[key], 'dd-MM-yyyy', new Date()).toISOString();
        } catch {}

        try {
          date = parse(item[key], 'dd/MM/yyyy', new Date()).toISOString();
        } catch {}

        if (date) {
          return date;
        }
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
    content: any[];
    index: number;
    item: any;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportTransactionsService.FEE_KEYS) {
      if ((item[key] || item[key] === 0) && isNumber(item[key])) {
        return item[key];
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
    content: any[];
    index: number;
    item: any;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportTransactionsService.QUANTITY_KEYS) {
      if (item[key] && isNumber(item[key])) {
        return item[key];
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

    for (const key of ImportTransactionsService.SYMBOL_KEYS) {
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
    content,
    index,
    item
  }: {
    content: any[];
    index: number;
    item: any;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportTransactionsService.TYPE_KEYS) {
      if (item[key]) {
        switch (item[key].toLowerCase()) {
          case 'buy':
            return Type.BUY;
          case 'dividend':
            return Type.DIVIDEND;
          case 'item':
            return Type.ITEM;
          case 'sell':
            return Type.SELL;
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
    content: any[];
    index: number;
    item: any;
  }) {
    item = this.lowercaseKeys(item);

    for (const key of ImportTransactionsService.UNIT_PRICE_KEYS) {
      if (item[key] && isNumber(item[key])) {
        return item[key];
      }
    }

    throw {
      activities: content,
      message: `activities.${index}.unitPrice is not valid`
    };
  }

  private postImport(aImportData: { activities: CreateOrderDto[] }) {
    return this.http.post<void>('/api/v1/import', aImportData);
  }
}
