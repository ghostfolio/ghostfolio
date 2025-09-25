import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreatePlatformDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name: string;

  @IsUrl({
    protocols: ['https'],
    require_protocol: true
  })
  url: string;
}
