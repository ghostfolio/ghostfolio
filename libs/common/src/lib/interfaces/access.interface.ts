import { AccessType } from '@ghostfolio/common/types';

import { AccessPermission } from '@prisma/client';

export interface AccessFilter {
  accountIds?: string[];
  assetClasses?: string[];
  holdings?: { dataSource: string; symbol: string }[];
  tagIds?: string[];
}

export interface AccessSettings {
  filter?: AccessFilter;
}

export interface Access {
  alias?: string;
  grantee?: string;
  id: string;
  permissions: AccessPermission[];
  settings?: AccessSettings;
  type: AccessType;
}
