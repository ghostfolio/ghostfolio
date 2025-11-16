import { AssetProfileIdentifierDto } from '@ghostfolio/common/dtos';

import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class AccessFilterDto {
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  accountIds?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  assetClasses?: string[];

  @IsArray()
  @IsOptional()
  @Type(() => AssetProfileIdentifierDto)
  @ValidateNested({ each: true })
  holdings?: AssetProfileIdentifierDto[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tagIds?: string[];
}
