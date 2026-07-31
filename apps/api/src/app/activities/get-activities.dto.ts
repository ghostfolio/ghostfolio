import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

import { ActivitiesFilterDto } from './activities-filter.dto';

export class GetActivitiesDto extends ActivitiesFilterDto {
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

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  take?: number;
}
