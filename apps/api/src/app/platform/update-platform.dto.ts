import { IsString, IsUrl } from 'class-validator';

export class UpdatePlatformDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsUrl({
    protocols: ['https'],
    require_protocol: true
  })
  url: string;
}
