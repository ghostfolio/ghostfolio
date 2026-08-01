import { ActivitiesFilterDto } from '@ghostfolio/api/app/activities/activities-filter.dto';

import { Transform, TransformFnParams } from 'class-transformer';
import { IsOptional, IsUUID } from 'class-validator';
import { isString } from 'lodash';

export class GetExportDto extends ActivitiesFilterDto {
  @IsOptional()
  @IsUUID(undefined, { each: true })
  @Transform(({ value }: TransformFnParams) => {
    return isString(value) ? value.split(',') : value;
  })
  activityIds?: string[];
}
