import {
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl
} from 'class-validator';

export class ScraperConfigurationDto {
  @IsNumber()
  @IsOptional()
  defaultMarketPrice?: number;

  @IsObject()
  @IsOptional()
  headers?: { [key: string]: string };

  @IsOptional()
  @IsString()
  locale?: string;

  @IsIn(['instant', 'lazy'])
  @IsOptional()
  mode?: 'instant' | 'lazy';

  @IsString()
  selector: string;

  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true
  })
  url: string;
}
