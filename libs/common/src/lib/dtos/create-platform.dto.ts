import { IsString, IsUrl } from 'class-validator';

export class CreatePlatformDto {
  @IsString()
  name: string;

  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true
  })
  url: string;
}
