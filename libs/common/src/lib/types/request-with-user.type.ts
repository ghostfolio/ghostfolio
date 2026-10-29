import {
  ImpersonationContext,
  UserWithSettings
} from '@ghostfolio/common/types';

export type RequestWithUser = Request & {
  impersonation?: ImpersonationContext;
  impersonationOfBearerToken?: ImpersonationContext;
  user: UserWithSettings;
};
