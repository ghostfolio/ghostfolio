import type { AttestationCredentialJSON } from '@ghostfolio/common/interfaces';

import { IsObject, IsOptional, IsString } from 'class-validator';

export class VerifyAttestationDto {
  @IsObject()
  credential: AttestationCredentialJSON;

  @IsOptional()
  @IsString()
  deviceName?: string;
}
