import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

export interface GetValueObject extends AssetProfileIdentifier {
  date: Date;
  marketPrice: number;
}
