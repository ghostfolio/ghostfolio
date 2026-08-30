import { isDerivedCurrency } from '@ghostfolio/common/helper';

import {
  isISO4217CurrencyCode,
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

/**
 * Tells whether the value is acceptable as a currency, which is a derived
 * currency or a standard ISO 4217 code in upper case
 */
export function isValidCurrencyCode(aCurrency: string) {
  return (
    isDerivedCurrency(aCurrency) ||
    (aCurrency === aCurrency?.toUpperCase() && isISO4217CurrencyCode(aCurrency))
  );
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
