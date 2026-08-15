import { AccessType } from '@ghostfolio/common/types';

import { AccessSettings } from './access-settings.interface';

export interface Access {
  alias: string | null;
  grantee?: string;
  id: string;

  scopes: string[];
  settings?: AccessSettings;
  type: AccessType;
}
