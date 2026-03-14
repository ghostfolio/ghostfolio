import { Tag } from '@prisma/client';

export interface NewTag extends Omit<Tag, 'id'> {
  id: undefined;
}

export type SelectedTag = Tag | NewTag;
