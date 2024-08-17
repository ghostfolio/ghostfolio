import {
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';
import { format, isAfter } from 'date-fns';

@ValidatorConstraint({ name: 'isAfter1970' })
export class IsAfter1970Constraint implements ValidatorConstraintInterface {
  public defaultMessage() {
    return `date must be after ${format(new Date(0), 'yyyy')}`;
  }

  public validate(aDate: Date) {
    return isAfter(aDate, new Date(0));
  }
}
