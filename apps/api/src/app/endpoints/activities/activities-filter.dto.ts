import { FilterDto } from '@ghostfolio/api/dtos/filter.dto';
import { DateRange } from '@ghostfolio/common/types';
import { IsValidDateRangeConstraint } from '@ghostfolio/common/validator-constraints/is-valid-date-range';

import { Type as ActivityType } from '@prisma/client';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsEnum, IsOptional, Validate } from 'class-validator';
import { isString } from 'lodash-es';

export class ActivitiesFilterDto extends FilterDto {
  @IsEnum(ActivityType, { each: true })
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => {
    return isString(value) ? value.split(',') : value;
  })
  activityTypes?: ActivityType[];

  @IsOptional()
  @Validate(IsValidDateRangeConstraint)
  range?: DateRange;
}
