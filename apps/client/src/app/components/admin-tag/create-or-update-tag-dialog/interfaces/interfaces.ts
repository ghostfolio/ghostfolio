import { Tag } from '@prisma/client';

export interface CreateOrUpdateTagDialogParams {
  tag: Pick<Tag, 'id' | 'name'>;
}
