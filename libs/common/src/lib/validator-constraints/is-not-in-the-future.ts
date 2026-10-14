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

  public validate(aDate: string) {
    return !isAccountBalanceInFuture({ date: resetHours(parseISO(aDate)) });
  }
}
