import { IOrder } from '@ghostfolio/api/services/interfaces/interfaces';

import { Account, SymbolProfile, Type as ActivityType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export class Order {
  private account: Account;
  private currency: string;
  private fee: number;
  private date: string;
  private id: string;
  private isDraft: boolean;
  private quantity: number;
  private symbol: string;
  private symbolProfile: SymbolProfile;
  private total: number;
  private type: ActivityType;
  private unitPrice: number;

  public constructor(data: IOrder) {
    this.account = data.account;
    this.currency = data.currency;
    this.fee = data.fee;
    this.date = data.date;
    this.id = data.id || uuidv4();
    this.isDraft = data.isDraft;
    this.quantity = data.quantity;
    this.symbol = data.symbol;
    this.symbolProfile = data.symbolProfile;
    this.type = data.type;
    this.unitPrice = data.unitPrice;

    this.total = this.quantity * data.unitPrice;
  }

  public getAccount() {
    return this.account;
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

  public getIsDraft() {
    return this.isDraft;
  }

  public getQuantity() {
    return this.quantity;
  }

  public getSymbol() {
    return this.symbol;
  }

  getSymbolProfile() {
    return this.symbolProfile;
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
