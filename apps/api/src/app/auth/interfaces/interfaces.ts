import { AuthDeviceDto } from '@ghostfolio/common/dtos';

import { Provider } from '@prisma/client';

export interface AuthDeviceDialogParams {
  authDevice: AuthDeviceDto;
}

export interface OidcContext {
  claims?: {
    sub?: string;
  };
}

export interface OidcIdToken {
  sub?: string;
}

export interface OidcParams {
  sub?: string;
}

export interface OidcProfile {
  id?: string;
  sub?: string;
}

export interface ValidateOAuthLoginParams {
  provider: Provider;
  thirdPartyId: string;
}
