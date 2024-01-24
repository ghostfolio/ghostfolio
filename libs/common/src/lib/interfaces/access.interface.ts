import { AccessPermission } from '@prisma/client';

export interface Access {
  alias?: string;
  grantee?: string;
  id: string;
  type: 'PRIVATE' | 'PUBLIC' | 'RESTRICTED_VIEW';
  permissions: AccessPermission[];
}
