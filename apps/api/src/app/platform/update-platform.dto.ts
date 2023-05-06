import { IsString } from 'class-validator';

export class UpdatePlatformDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  url: string;
}
