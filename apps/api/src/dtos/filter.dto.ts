import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FilterDto {
  @IsOptional()
  @IsString()
  accounts?: string;

  @IsOptional()
  @IsString()
  assetClasses?: string;

  @IsOptional()
  @IsString()
  dataSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  symbol?: string;

  @IsOptional()
  @IsString()
  tags?: string;
}
