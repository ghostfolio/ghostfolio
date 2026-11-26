import type { AssertionCredentialJSON } from '@ghostfolio/common/interfaces';

import { IsObject, IsString } from 'class-validator';

export class VerifyAuthenticationDto {
  @IsObject()
  credential: AssertionCredentialJSON;

  @IsString()
  deviceId: string;
}
