import { AuthDeviceDto } from '@ghostfolio/common/dtos';

import { Provider } from '@prisma/client';

export interface AuthDeviceDialogParams {
  authDevice: AuthDeviceDto;
}

export interface ValidateOAuthLoginParams {
  provider: Provider;
  thirdPartyId: string;
}
