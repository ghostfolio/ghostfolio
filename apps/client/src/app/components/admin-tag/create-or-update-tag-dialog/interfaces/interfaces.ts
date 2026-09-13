import type { Tag } from '@ghostfolio/prisma/browser';

export interface CreateOrUpdateTagDialogParams {
  tag?: Pick<Tag, 'id' | 'name'>;
}
