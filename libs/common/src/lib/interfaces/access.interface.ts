import type { AccessType } from '@ghostfolio/prisma/enums';

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
