import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

export interface ResponseError {
  errors?: AssetProfileIdentifier[];
  hasErrors: boolean;
}
