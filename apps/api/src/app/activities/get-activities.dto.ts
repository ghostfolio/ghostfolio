import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

import { DeleteActivitiesDto } from './delete-activities.dto';

export class GetActivitiesDto extends DeleteActivitiesDto {
  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  skip?: number;

  @IsOptional()
  @IsString()
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
