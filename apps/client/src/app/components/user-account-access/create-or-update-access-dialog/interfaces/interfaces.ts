import { Access } from '@ghostfolio/common/interfaces';

export interface CreateOrUpdateAccessDialogParams {
  access?: Access;
}

export type AccessLevel =
  'CREATE_READ_UPDATE_DELETE' | 'READ' | 'READ_RESTRICTED';
