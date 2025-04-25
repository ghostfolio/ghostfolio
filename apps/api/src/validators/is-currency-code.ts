import { DERIVED_CURRENCIES } from '@ghostfolio/common/config';

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

  public validate(currency: any) {
    // Return true if currency is a standard ISO 4217 code or a derived currency
    return (
      this.isUpperCase(currency) &&
      (isISO4217CurrencyCode(currency) ||
        [
          ...DERIVED_CURRENCIES.map((derivedCurrency) => {
            return derivedCurrency.currency;
          }),
          'USX'
        ].includes(currency))
    );
  }

  private isUpperCase(aString: string) {
    return aString === aString?.toUpperCase();
  }
}
