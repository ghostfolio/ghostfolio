import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

export interface AdminData {
  exchangeRates: ({
    label1: string;
    label2: string;
    value: number;
  } & AssetProfileIdentifier)[];
  settings: Record<string, boolean | object | string | string[]>;
  transactionCount: number;
  userCount: number;
  version: string;
}
