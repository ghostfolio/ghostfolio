import { AdminMarketDataItem } from '@ghostfolio/common/interfaces';

export interface CreateAssetProfileDialogParams {
  existingSymbols: AdminMarketDataItem[];
  deviceType: string;
  locale: string;
}
