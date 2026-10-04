import type { Tag } from '@ghostfolio/prisma/client';

import { IsArray } from 'class-validator';

export class UpdateHoldingTagsDto {
  @IsArray()
  tags: Tag[];
}
