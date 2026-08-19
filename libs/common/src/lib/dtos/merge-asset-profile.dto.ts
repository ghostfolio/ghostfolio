import { DataSource } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class MergeAssetProfileDto {
  @IsEnum(DataSource)
  dataSource: DataSource;

  @IsString()
  symbol: string;
}
