import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Min
} from 'class-validator';

import { ActivitiesFilterDto } from './activities-filter.dto';

export class GetActivitiesDto extends ActivitiesFilterDto {
  // Used when no `range` is given
  @IsISO8601()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  skip?: number;

  @IsIn(Object.values(Prisma.OrderScalarFieldEnum))
  @IsOptional()
  sortColumn?: keyof typeof Prisma.OrderScalarFieldEnum;

  @IsIn(['asc', 'desc'] as Prisma.SortOrder[])
  @IsOptional()
  sortDirection?: Prisma.SortOrder;

  @IsISO8601()
  @IsOptional()
  startDate?: string;

  // Comma-separated symbols
  @IsOptional()
  @IsString()
  symbols?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  take?: number;
}
