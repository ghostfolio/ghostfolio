import {
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';
import { isFuture } from 'date-fns';

@ValidatorConstraint({ name: 'isInTheFuture' })
export class IsInTheFutureConstraint implements ValidatorConstraintInterface {
  public defaultMessage() {
    return '$property must be a date in the future';
  }

  public validate(aDate: Date) {
    return isFuture(aDate);
  }
}
