import { IsUrl } from 'class-validator';

export class GetLogoDto {
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true
  })
  url: string;
}
