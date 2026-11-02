import { DEFAULT_DATE_RANGE } from '@ghostfolio/common/config';
import { DateRange } from '@ghostfolio/common/types';
import { IsValidDateRangeConstraint } from '@ghostfolio/common/validator-constraints/is-valid-date-range';

import { Validate } from 'class-validator';

import { FilterDto } from './filter.dto';

export class DateRangeFilterDto extends FilterDto {
  @Validate(IsValidDateRangeConstraint)
  range?: DateRange = DEFAULT_DATE_RANGE;
}
