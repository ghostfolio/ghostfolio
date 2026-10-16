import { UserSettings } from '@ghostfolio/common/interfaces';
import { UserWithSettings } from '@ghostfolio/common/types';

/**
 * Describes whose data a request presents. The user id, the settings and the
 * subscription belong to the impersonated user while an impersonation is
 * active and to the authenticated user otherwise, so a handler can use them
 * unconditionally.
 */
export interface ImpersonationContext {
  accessId?: string;
  authenticatedUserSubscription?: UserWithSettings['subscription'];
  isActive: boolean;
  scopes: string[];
  userId: string;
  userSettings: UserSettings;
  userSubscription?: UserWithSettings['subscription'];
}
