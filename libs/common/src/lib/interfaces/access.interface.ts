import { AccessType } from '@prisma/client';

import { AccessSettings } from './access-settings.interface';

export interface Access {
  alias: string | null;
  expiresAt: Date;
  grantee?: string;
  id: string;
  lastUsedAt?: Date | null;
  scopes: string[];
  settings?: AccessSettings;
  type: AccessType;
}
