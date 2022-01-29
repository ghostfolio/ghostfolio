import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { DataSource, Type } from '@prisma/client';
import { parse } from 'date-fns';
import { parse as csvToJson } from 'papaparse';
import { isNumber } from 'lodash';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { User } from '@ghostfolio/common/interfaces';

@Injectable({
  providedIn: 'root'
})
export class ImportTransactionsService {
  private static ACCOUNT_ID = ['account', 'accountid'];
  private static CURRENCY_KEYS = ['ccy', 'currency'];
  private static DATE_KEYS = ['date'];
  private static FEE_KEYS = ['commission', 'fee'];
  private static QUANTITY_KEYS = ['qty', 'quantity', 'shares', 'units'];
  private static SYMBOL_KEYS = ['code', 'symbol', 'ticker'];
  private static TYPE_KEYS = ['action', 'type'];
  private static UNIT_PRICE_KEYS = ['price', 'unitprice', 'value'];

  public constructor(private http: HttpClient) {}

  public async importCsv({
    fileContent,
    primaryDataSource,
    user
  }: {
    fileContent: string;
    primaryDataSource: DataSource;
    user: User;
  }) {
    let content: any[] = [];

    csvToJson(fileContent, {
      dynamicTyping: true,
      header: true,
      skipEmptyLines: true,
      complete: (parsedData) => {
        content = parsedData.data.filter((item) => item['date'] != null);
      }
    });

    const orders: CreateOrderDto[] = [];
    for (const [index, item] of content.entries()) {
      orders.push({
        accountId: this.parseAccount({ content, index, item, user }),
        currency: this.parseCurrency({ content, index, item }),
        dataSource: primaryDataSource,
        date: this.parseDate({ content, index, item }),
        fee: this.parseFee({ content, index, item }),
        quantity: this.parseQuantity({ content, index, item }),
        symbol: this.parseSymbol({ content, index, item }),
        type: this.parseType({ content, index, item }),
        unitPrice: this.parseUnitPrice({ content, index, item })
      });
    }

    await this.importJson({ content: orders });
  }

  public importJson({ content }: { content: CreateOrderDto[] }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.postImport({
        orders: content
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
    content,
    index,
    item,
    user
  }: {
    content: any[];
    index: number;
    item: any;
    user: User;
  }) {
    item = this.lowercaseKeys(item);
    for (const key of ImportTransactionsService.ACCOUNT_ID) {
      if (item[key]) {
        let accountid = user.accounts.find((account) => {
          return (
            account.name.toLowerCase() === item[key].toLowerCase() ||
            account.id == item[key]
          );
        })?.id;
        if (!accountid) {
          accountid = user?.accounts.find((account) => {
            return account.isDefault;
          })?.id;
        }
        return accountid;
      }
    }

    throw { message: `orders.${index}.account is not valid`, orders: content };
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

    throw { message: `orders.${index}.currency is not valid`, orders: content };
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

    throw { message: `orders.${index}.date is not valid`, orders: content };
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

    throw { message: `orders.${index}.fee is not valid`, orders: content };
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

    throw { message: `orders.${index}.quantity is not valid`, orders: content };
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

    throw { message: `orders.${index}.symbol is not valid`, orders: content };
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
          case 'sell':
            return Type.SELL;
          default:
            break;
        }
      }
    }

    throw { message: `orders.${index}.type is not valid`, orders: content };
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
      message: `orders.${index}.unitPrice is not valid`,
      orders: content
    };
  }

  private postImport(aImportData: { orders: CreateOrderDto[] }) {
    return this.http.post<void>('/api/import', aImportData);
  }
}
