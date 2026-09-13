import { DataSource } from '@ghostfolio/prisma/enums';

import { IsEnum, IsString } from 'class-validator';

export class MergeAssetProfileDto {
  @IsEnum(DataSource)
  dataSource: DataSource;

  @IsString()
  symbol: string;
}
