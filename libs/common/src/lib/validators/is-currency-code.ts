import { isValidCurrencyCode } from '@ghostfolio/common/helper';

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';

export function IsCurrencyCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      propertyName,
      constraints: [],
      options: validationOptions,
      target: object.constructor,
      validator: IsExtendedCurrencyConstraint
    });
  };
}

@ValidatorConstraint({ async: false })
export class IsExtendedCurrencyConstraint implements ValidatorConstraintInterface {
  public defaultMessage() {
    return '$property must be a valid ISO4217 currency code';
  }

  public validate(currency: string) {
    return isValidCurrencyCode(currency);
  }
}
