import { AssetProfileIdentifier } from '../index';

export interface ResponseError {
  errors?: AssetProfileIdentifier[];
  hasErrors: boolean;
}
