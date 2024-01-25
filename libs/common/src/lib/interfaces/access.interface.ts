import { AccessPermission } from '@prisma/client';

export interface Access {
  alias?: string;
  grantee?: string;
  id: string;
  permissions: AccessPermission[];
  type: 'PRIVATE' | 'PUBLIC';
}
