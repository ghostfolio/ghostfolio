import { AccessType } from '@ghostfolio/common/types';

import { AccessPermission } from '@prisma/client';

import { Filter } from './filter.interface';

export interface AccessSettings {
  filters?: Filter[];
}

export interface Access {
  alias?: string;
  grantee?: string;
  id: string;
  permissions: AccessPermission[];
  settings?: AccessSettings;
  type: AccessType;
}
