import { Provider } from '@prisma/client';

export interface ValidateOAuthLoginParams {
  provider: Provider;
  thirdPartyId: string;
}
