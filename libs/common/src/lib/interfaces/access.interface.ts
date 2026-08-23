import { AccessType } from '@prisma/client';

import { AccessSettings } from './access-settings.interface';

export interface Access {
  alias: string | null;
  expiresAt: Date;
  lastUsedAt?: Date | null;
  grantee?: string;
  id: string;
  scopes: string[];
  settings?: AccessSettings;
  type: AccessType;
}
