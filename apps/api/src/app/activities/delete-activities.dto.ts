import { DateRange } from '@ghostfolio/common/types';

import { Type as ActivityType } from '@prisma/client';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { isString } from 'lodash';

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
  @IsString()
  range?: DateRange;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  tags?: string;
}
