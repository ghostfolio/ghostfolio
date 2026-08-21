import { Access } from '@ghostfolio/common/interfaces';

export interface CreateOrUpdateAccessDialogParams {
  access?: Access;
}

export type AccessLevel = 'CHANGE' | 'RESTRICTED_VIEW' | 'VIEW';
