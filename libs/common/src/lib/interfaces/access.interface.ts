import { AccessType } from '@ghostfolio/common/types';

import { AccessPermission } from '@prisma/client';

import { AccessSettings } from './access-settings.interface';

export interface Access {
  alias: string | null;
  grantee?: string;
  id: string;
  permissions: AccessPermission[];
  settings?: AccessSettings;
  type: AccessType;
}
