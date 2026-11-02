import { isValidDateRange } from '@ghostfolio/common/helper';

import {
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidDateRange' })
export class IsValidDateRangeConstraint implements ValidatorConstraintInterface {
  public defaultMessage() {
    return '$property must be a named date range or a calendar year which is not in the future';
  }

  public validate(aDateRange: unknown) {
    return typeof aDateRange === 'string' && isValidDateRange(aDateRange);
  }
}
