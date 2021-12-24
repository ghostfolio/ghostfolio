import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { DataSource, Type } from '@prisma/client';
import { parse } from 'date-fns';
import { isNumber } from 'lodash';
import { parse as csvToJson } from 'papaparse';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ImportTransactionsService {
  private static CURRENCY_KEYS = ['ccy', 'currency'];
  private static DATE_KEYS = ['date'];
  private static FEE_KEYS = ['commission', 'fee'];
  private static QUANTITY_KEYS = ['qty', 'quantity', 'shares', 'units'];
  private static SYMBOL_KEYS = ['code', 'symbol', 'ticker'];
  private static TYPE_KEYS = ['action', 'type'];
  private static UNIT_PRICE_KEYS = ['price', 'unitprice', 'value'];

  public constructor(private http: HttpClient) {}

  public async importCsv({
    defaultAccountId,
    fileContent,
    primaryDataSource
  }: {
    defaultAccountId: string;
    fileContent: string;
    primaryDataSource: DataSource;
  }) {
    const content = csvToJson(fileContent, {
      dynamicTyping: true,
      header: true,
      skipEmptyLines: true
    }).data;

    const orders: CreateOrderDto[] = [];

    for (const [index, item] of content.entries()) {
      orders.push({
        accountId: defaultAccountId,
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

    await this.importJson({ defaultAccountId, content: orders });
  }

  public importJson({
    content,
    defaultAccountId
  }: {
    content: CreateOrderDto[];
    defaultAccountId: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.postImport({
        orders: content.map((order) => {
          return { ...order, accountId: defaultAccountId };
        })
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
        if (item[key].toLowerCase() === 'buy') {
          return Type.BUY;
        } else if (item[key].toLowerCase() === 'sell') {
          return Type.SELL;
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
