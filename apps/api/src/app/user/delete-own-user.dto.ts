import { IsString } from 'class-validator';

export class DeleteOwnUserDto {
  @IsString()
  accessToken: string;
}
