import { AccessPermission } from '@prisma/client';

import { AccessType } from '../types/index';

export interface Access {
  alias?: string;
  grantee?: string;
  id: string;
  permissions: AccessPermission[];
  type: AccessType;
}
