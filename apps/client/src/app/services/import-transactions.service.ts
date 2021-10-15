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
  private static QUANTITY_KEYS = ['qty', 'quantity', 'shares'];
  private static SYMBOL_KEYS = ['code', 'symbol'];
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

    for (const item of content) {
      orders.push({
        accountId: defaultAccountId,
        currency: this.parseCurrency(item),
        dataSource: primaryDataSource,
        date: this.parseDate(item),
        fee: this.parseFee(item),
        quantity: this.parseQuantity(item),
        symbol: this.parseSymbol(item),
        type: this.parseType(item),
        unitPrice: this.parseUnitPrice(item)
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

  private parseCurrency(aItem: any) {
    const item = this.lowercaseKeys(aItem);

    for (const key of ImportTransactionsService.CURRENCY_KEYS) {
      if (item[key]) {
        return item[key];
      }
    }

    throw new Error('Could not parse currency');
  }

  private parseDate(aItem: any) {
    const item = this.lowercaseKeys(aItem);
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

    throw new Error('Could not parse date');
  }

  private parseFee(aItem: any) {
    const item = this.lowercaseKeys(aItem);

    for (const key of ImportTransactionsService.FEE_KEYS) {
      if ((item[key] || item[key] === 0) && isNumber(item[key])) {
        return item[key];
      }
    }

    throw new Error('Could not parse fee');
  }

  private parseQuantity(aItem: any) {
    const item = this.lowercaseKeys(aItem);

    for (const key of ImportTransactionsService.QUANTITY_KEYS) {
      if (item[key] && isNumber(item[key])) {
        return item[key];
      }
    }

    throw new Error('Could not parse quantity');
  }

  private parseSymbol(aItem: any) {
    const item = this.lowercaseKeys(aItem);

    for (const key of ImportTransactionsService.SYMBOL_KEYS) {
      if (item[key]) {
        return item[key];
      }
    }

    throw new Error('Could not parse symbol');
  }

  private parseType(aItem: any) {
    const item = this.lowercaseKeys(aItem);

    for (const key of ImportTransactionsService.TYPE_KEYS) {
      if (item[key]) {
        if (item[key].toLowerCase() === 'buy') {
          return Type.BUY;
        } else if (item[key].toLowerCase() === 'sell') {
          return Type.SELL;
        }
      }
    }

    throw new Error('Could not parse type');
  }

  private parseUnitPrice(aItem: any) {
    const item = this.lowercaseKeys(aItem);

    for (const key of ImportTransactionsService.UNIT_PRICE_KEYS) {
      if (item[key] && isNumber(item[key])) {
        return item[key];
      }
    }

    throw new Error('Could not parse unit price (unitPrice)');
  }

  private postImport(aImportData: { orders: CreateOrderDto[] }) {
    return this.http.post<void>('/api/import', aImportData);
  }
}
