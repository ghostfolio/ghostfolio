import { isSplitRatio } from '@ghostfolio/common/helper';

import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';

@ValidatorConstraint({ name: 'isSplitRatio' })
export class IsSplitRatioConstraint implements ValidatorConstraintInterface {
  public defaultMessage() {
    return 'numerator and denominator must be different positive integers';
  }

  public validate(_: unknown, { object }: ValidationArguments) {
    return isSplitRatio(object as { denominator: number; numerator: number });
  }
}
