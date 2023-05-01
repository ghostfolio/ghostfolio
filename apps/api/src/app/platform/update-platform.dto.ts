import { IsOptional, IsString } from 'class-validator';

export class UpdatePlatformDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name: string;

  @IsString()
  url: string;
}
