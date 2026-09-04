import { SEARCH_QUERY_MAXIMUM_LENGTH } from '@ghostfolio/common/config';
import { MarketDataPreset } from '@ghostfolio/common/types';

import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator';

export class GetAssetProfilesDto {
  @IsOptional()
  @IsString()
  assetSubClasses?: string;

  @IsOptional()
  @IsString()
  dataSource?: string;

  @IsIn([
    'BENCHMARKS',
    'CURRENCIES',
    'ETF_WITHOUT_COUNTRIES',
    'ETF_WITHOUT_SECTORS',
    'NO_ACTIVITIES'
  ] as MarketDataPreset[])
  @IsOptional()
  presetId?: MarketDataPreset;

  @IsOptional()
  @IsString()
  @MaxLength(SEARCH_QUERY_MAXIMUM_LENGTH)
  query?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  skip?: number;

  @IsIn([
    ...Object.values(Prisma.SymbolProfileScalarFieldEnum),
    'activitiesCount'
  ])
  @IsOptional()
  sortColumn?: string;

  @IsIn(['asc', 'desc'] as Prisma.SortOrder[])
  @IsOptional()
  sortDirection?: Prisma.SortOrder;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  take?: number;
}
