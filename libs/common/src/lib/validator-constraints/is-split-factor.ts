import {
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';

@ValidatorConstraint({ name: 'isSplitFactor' })
export class IsSplitFactorConstraint implements ValidatorConstraintInterface {
  public defaultMessage() {
    return 'factor must be a positive number other than 1';
  }

  public validate(aFactor: number) {
    return typeof aFactor === 'number' && aFactor > 0 && aFactor !== 1;
  }
}
