export interface Order {
  accountId: string;
  currency: string;
  date: Date;
  fee: number;
  id: string;
  quantity: number;
  platformId: string;
  symbol: string;
  type: string;
  unitPrice: number;
}
