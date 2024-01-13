import { UniqueAsset } from '@ghostfolio/common/interfaces';

export interface GetValueObject extends UniqueAsset {
  date: Date;
  marketPrice: number;
}
