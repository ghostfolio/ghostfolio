import { TAG_ID_EXCLUDE_FROM_ANALYSIS } from '@ghostfolio/common/config';

import { Prisma, Tag } from '@prisma/client';

export const WHERE_ACCOUNT_NOT_EXCLUDED: Prisma.AccountWhereInput = {
  isExcluded: false,
  tags: {
    none: {
      tagId: TAG_ID_EXCLUDE_FROM_ANALYSIS
    }
  }
};

export function isAccountExcluded(account: {
  isExcluded: boolean;
  tags?: Tag[];
}) {
  return (
    account.isExcluded ||
    account.tags?.some(({ id }) => {
      return id === TAG_ID_EXCLUDE_FROM_ANALYSIS;
    }) === true
  );
}
