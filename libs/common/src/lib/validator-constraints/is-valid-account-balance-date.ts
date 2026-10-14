import { isValidAccountBalanceDate } from '@ghostfolio/common/helper';

import {
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidAccountBalanceDate' })
export class IsValidAccountBalanceDateConstraint implements ValidatorConstraintInterface {
  public defaultMessage() {
    return '$property must be a valid date which is not in the future';
  }

  public validate(aDate: unknown) {
    // IsISO8601 refuses a value which is not a string
    if (typeof aDate !== 'string') {
      return true;
    }

    return isValidAccountBalanceDate(aDate);
  }
}
