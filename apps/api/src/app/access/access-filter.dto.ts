import { DataSource } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';

export class HoldingFilterDto {
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
  @ValidateNested({ each: true })
  @Type(() => HoldingFilterDto)
  holdings?: HoldingFilterDto[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tagIds?: string[];
}
