import { TAG_ID_EXCLUDE_FROM_ANALYSIS } from '@ghostfolio/common/config';

import { Prisma } from '@prisma/client';

export const WHERE_ACCOUNT_NOT_EXCLUDED: Prisma.AccountWhereInput = {
  isExcluded: false,
  tags: {
    none: {
      tagId: TAG_ID_EXCLUDE_FROM_ANALYSIS
    }
  }
};
