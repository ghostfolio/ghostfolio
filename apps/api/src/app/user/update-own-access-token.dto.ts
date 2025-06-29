import { IsString } from 'class-validator';

export class UpdateOwnAccessTokenDto {
  @IsString()
  accessToken: string;
}
