import { AccessPermission, AccessType } from '@prisma/client';

import { AccessSettings } from './access-settings.interface';

export interface Access {
  alias?: string;
  expiresAt?: Date;
  grantee?: string;
  id: string;
  permissions: AccessPermission[];
  settings?: AccessSettings;
  type: AccessType;
}
