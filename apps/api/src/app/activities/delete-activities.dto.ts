import { DATE_RANGES } from '@ghostfolio/common/config';
import { DateRange } from '@ghostfolio/common/types';

import { Type as ActivityType } from '@prisma/client';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { isString } from 'lodash';

// A named date range or a calendar year like '2024', '2023', '2022', etc.
const DATE_RANGE_PATTERN = new RegExp(`^(${DATE_RANGES.join('|')}|\\d{4})$`);

export class DeleteActivitiesDto {
  @IsOptional()
  @IsString()
  accounts?: string;

  @IsEnum(ActivityType, { each: true })
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => {
    return isString(value) ? value.split(',') : value;
  })
  activityTypes?: ActivityType[];

  @IsOptional()
  @IsString()
  assetClasses?: string;

  @IsOptional()
  @IsString()
  dataSource?: string;

  @IsOptional()
  @Matches(DATE_RANGE_PATTERN)
  range?: DateRange;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  tags?: string;
}
