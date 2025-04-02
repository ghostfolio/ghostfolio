export interface AdminData {
  settings: { [key: string]: boolean | object | string | string[] };
  transactionCount: number;
  userCount: number;
  version: string;
}
