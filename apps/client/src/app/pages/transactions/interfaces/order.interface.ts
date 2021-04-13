export interface Order {
  currency: string;
  date: Date;
  fee: number;
  quantity: number;
  symbol: string;
  type: string;
  unitPrice: number;
}
