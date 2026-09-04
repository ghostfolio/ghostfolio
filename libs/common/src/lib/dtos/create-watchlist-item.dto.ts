import { SYMBOL_MAXIMUM_LENGTH } from '@ghostfolio/common/config';

import { DataSource } from '@prisma/client';
import { IsEnum, IsString, MaxLength } from 'class-validator';

export class CreateWatchlistItemDto {
  @IsEnum(DataSource)
  dataSource: DataSource;

  @IsString()
  @MaxLength(SYMBOL_MAXIMUM_LENGTH)
  symbol: string;
}
