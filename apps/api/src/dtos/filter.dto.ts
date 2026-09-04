import { AssetClass, DataSource } from '@prisma/client';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { isString } from 'lodash';

export class FilterDto {
  @IsOptional()
  @IsString()
  accounts?: string;

  @IsEnum(AssetClass, { each: true })
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => {
    return isString(value) ? value.split(',') : value;
  })
  assetClasses?: AssetClass[];

  @IsEnum(DataSource)
  @IsOptional()
  dataSource?: DataSource;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  tags?: string;
}
