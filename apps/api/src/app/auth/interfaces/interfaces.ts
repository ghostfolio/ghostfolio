import { AuthDeviceDto } from '@ghostfolio/api/app/auth-device/auth-device.dto';

import { Provider } from '@prisma/client';

export interface AuthDeviceDialogParams {
  authDevice: AuthDeviceDto;
}

export interface ValidateOAuthLoginParams {
  provider: Provider;
  thirdPartyId: string;
}
