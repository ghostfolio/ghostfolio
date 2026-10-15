import type { Tag } from '@ghostfolio/prisma/browser';

export interface NewTag extends Omit<Tag, 'id'> {
  id: undefined;
}

export type SelectedTag = NewTag | Tag;
