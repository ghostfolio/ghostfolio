import {
  isAccountBalanceInFuture,
  resetHours
} from '@ghostfolio/common/helper';

import {
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';
import { parseISO } from 'date-fns';

@ValidatorConstraint({ name: 'isNotInTheFuture' })
export class IsNotInTheFutureConstraint implements ValidatorConstraintInterface {
  public defaultMessage() {
    return '$property must not be a date in the future';
  }

  public validate(aDate: unknown) {
    // IsISO8601 refuses a value which is not a string
    if (typeof aDate !== 'string') {
      return true;
    }

    return !isAccountBalanceInFuture({ date: resetHours(parseISO(aDate)) });
  }
}
