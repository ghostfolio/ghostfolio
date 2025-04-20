import { DataSource } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class CreateWatchlistItemDto {
  @IsEnum(DataSource, { each: true })
  dataSource: DataSource;

  @IsString()
  symbol: string;
}
