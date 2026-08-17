import { Access } from '@ghostfolio/common/interfaces';

export interface CreateOrUpdateAccessDialogParams {
  // TODO: Include the scopes once the dialog allows to configure them
  access?: Omit<Access, 'scopes'>;
}
