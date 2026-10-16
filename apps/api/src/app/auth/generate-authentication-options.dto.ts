import { IsUUID } from 'class-validator';

export class GenerateAuthenticationOptionsDto {
  @IsUUID()
  deviceId: string;
}
