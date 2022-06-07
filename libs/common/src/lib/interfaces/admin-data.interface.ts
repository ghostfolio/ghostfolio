export interface AdminData {
  exchangeRates: { label1: string; label2: string; value: number }[];
  settings: { [key: string]: boolean | object | string | string[] };
  transactionCount: number;
  userCount: number;
  users: {
    accountCount: number;
    alias: string;
    createdAt: Date;
    engagement: number;
    id: string;
    lastActivity: Date;
    transactionCount: number;
  }[];
}
