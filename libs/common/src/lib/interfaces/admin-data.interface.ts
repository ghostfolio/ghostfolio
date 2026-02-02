import { DataProviderInfo } from './data-provider-info.interface';

export interface AdminData {
  activitiesCount: number;
  dataProviders: (DataProviderInfo & {
    assetProfileCount: number;
    useForExchangeRates: boolean;
  })[];
  settings: { [key: string]: boolean | object | string | string[] };

  /** @deprecated use activitiesCount instead */
  transactionCount: number;

  userCount: number;
  version: string;
}
