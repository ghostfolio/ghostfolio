import { SYMBOL_MAXIMUM_LENGTH } from '@ghostfolio/common/config';

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
  @MaxLength(SYMBOL_MAXIMUM_LENGTH)
  symbol?: string;

  @IsOptional()
  @IsString()
  tags?: string;
}
