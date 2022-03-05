import { UniqueAsset } from '../unique-asset.interface';

export interface ResponseError {
  errors?: UniqueAsset[];
  hasErrors: boolean;
}
