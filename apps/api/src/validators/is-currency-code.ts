import { isDerivedCurrency } from '@ghostfolio/common/helper';

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';
import { isISO4217CurrencyCode } from 'class-validator';

export function IsCurrencyCode(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
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
export class IsExtendedCurrencyConstraint
  implements ValidatorConstraintInterface
{
  public defaultMessage() {
    return '$property must be a valid ISO4217 currency code';
  }

  public validate(currency: string) {
    // Return true if currency is a derived currency or a standard ISO 4217 code
    return (
      isDerivedCurrency(currency) ||
      (this.isUpperCase(currency) && isISO4217CurrencyCode(currency))
    );
  }

  private isUpperCase(aString: string) {
    return aString === aString?.toUpperCase();
  }
}
