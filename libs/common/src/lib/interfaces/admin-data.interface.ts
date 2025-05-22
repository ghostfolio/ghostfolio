import { DataProviderInfo } from './data-provider-info.interface';

export interface AdminData {
  dataProviders: (DataProviderInfo & { assetProfileCount: number })[];
  settings: { [key: string]: boolean | object | string | string[] };
  transactionCount: number;
  userCount: number;
  version: string;
}
