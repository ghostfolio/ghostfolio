import { IsOptional, IsString } from 'class-validator';

export class DeleteOwnUserDto {
  @IsOptional()
  @IsString()
  accessToken?: string;
}
