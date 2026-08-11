import { UserSettings } from '@ghostfolio/common/interfaces';

// Describes whose data a request presents. The user id and the settings belong
// to the impersonated user while an impersonation is active and to the
// authenticated user otherwise, so a handler can use them unconditionally.
export interface ImpersonationContext {
  accessId?: string;
  isActive: boolean;
  userId: string;
  userSettings: UserSettings;
}
