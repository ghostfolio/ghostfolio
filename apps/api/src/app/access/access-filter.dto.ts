import { DataSource } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';

class HoldingFilterDto {
  @IsEnum(DataSource)
  dataSource: DataSource;

  @IsString()
  symbol: string;
}

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
  @Type(() => HoldingFilterDto)
  @ValidateNested({ each: true })
  holdings?: HoldingFilterDto[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tagIds?: string[];
}
