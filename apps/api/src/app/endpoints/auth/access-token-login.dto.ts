import { IsString } from 'class-validator';

export class AccessTokenLoginDto {
  @IsString()
  accessToken: string;
}
