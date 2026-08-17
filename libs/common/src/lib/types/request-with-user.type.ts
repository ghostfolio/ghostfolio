import {
  ImpersonationContext,
  UserWithSettings
} from '@ghostfolio/common/types';

export type RequestWithUser = Request & {
  impersonation?: ImpersonationContext;
  user: UserWithSettings;
};
