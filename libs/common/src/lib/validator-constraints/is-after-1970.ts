import { isValidDateAfter1970 } from '@ghostfolio/common/helper';

import {
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';
import { format } from 'date-fns';

@ValidatorConstraint({ name: 'isAfter1970' })
export class IsAfter1970Constraint implements ValidatorConstraintInterface {
  public defaultMessage() {
    return `date must be after ${format(new Date(0), 'yyyy')}`;
  }

  public validate(aDate: Date | string) {
    return isValidDateAfter1970(aDate);
  }
}
