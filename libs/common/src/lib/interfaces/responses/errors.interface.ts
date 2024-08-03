import { UniqueAsset } from '@ghostfolio/common/interfaces';

export interface ResponseError {
  errors?: UniqueAsset[];
  hasErrors: boolean;
}
