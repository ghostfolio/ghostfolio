import { Provider } from '@prisma/client';
import { AuthDeviceDto } from '@ghostfolio/api/app/auth-device/auth-device.dto';

export interface AuthDeviceDialogParams {
  authDevice: AuthDeviceDto;
}

export interface ValidateOAuthLoginParams {
  provider: Provider;
  thirdPartyId: string;
}
