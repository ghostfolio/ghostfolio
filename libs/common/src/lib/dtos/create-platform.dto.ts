import { IsString, IsUrl } from 'class-validator';

export class CreatePlatformDto {
  @IsString()
  name: string;

  @IsUrl({
    protocols: ['https'],
    require_protocol: true
  })
  url: string;
}
