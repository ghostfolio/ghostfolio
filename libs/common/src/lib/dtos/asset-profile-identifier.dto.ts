import { DataSource } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class AssetProfileIdentifierDto {
  @IsEnum(DataSource)
  dataSource: DataSource;

  @IsString()
  symbol: string;
}
