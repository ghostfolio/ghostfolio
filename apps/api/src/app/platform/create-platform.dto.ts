import { IsOptional, IsString } from 'class-validator';

export class CreatePlatformDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name: string;

  @IsString()
  url: string;
}
