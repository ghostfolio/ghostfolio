import { Currency, Platform } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { IOrder } from '../services/interfaces/interfaces';
import { OrderType } from './order-type';

export class Order {
  private currency: Currency;
  private fee: number;
  private date: string;
  private id: string;
  private quantity: number;
  private platform: Platform;
  private symbol: string;
  private total: number;
  private type: OrderType;
  private unitPrice: number;

  public constructor(data: IOrder) {
    this.currency = data.currency;
    this.fee = data.fee;
    this.date = data.date;
    this.id = data.id || uuidv4();
    this.platform = data.platform;
    this.quantity = data.quantity;
    this.symbol = data.symbol;
    this.type = data.type;
    this.unitPrice = data.unitPrice;

    this.total = this.quantity * data.unitPrice;
  }

  public getCurrency() {
    return this.currency;
  }

  public getDate() {
    return this.date;
  }

  public getFee() {
    return this.fee;
  }

  public getId() {
    return this.id;
  }

  public getPlatform() {
    return this.platform;
  }

  public getQuantity() {
    return this.quantity;
  }

  public getSymbol() {
    return this.symbol;
  }

  public getTotal() {
    return this.total;
  }

  public getType() {
    return this.type;
  }

  public getUnitPrice() {
    return this.unitPrice;
  }
}
