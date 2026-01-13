import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

export interface DataGatheringItem extends AssetProfileIdentifier {
  date?: Date;
  force?: boolean;
}
