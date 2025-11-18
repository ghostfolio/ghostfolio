import { FormGroup } from '@angular/forms';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export async function validateObjectForForm<T>({
  classDto,
  form,
  ignoreFields = [],
  object
}: {
  classDto: new () => T;
  form: FormGroup;
  ignoreFields?: string[];
  object: T;
}): Promise<void> {
  const objectInstance = plainToInstance(classDto, object);
  const errors = await validate(objectInstance as object);

  const nonIgnoredErrors = errors.filter(({ property }) => {
    return !ignoreFields.includes(property);
  });

  if (nonIgnoredErrors.length === 0) {
    return Promise.resolve();
  }

  for (const { constraints, property } of nonIgnoredErrors) {
    const formControl = form.get(property);

    if (formControl) {
      formControl.setErrors({
        validationError: Object.values(constraints)[0]
      });
    }

    const formControlInCustomCurrency = form.get(`${property}InCustomCurrency`);

    if (formControlInCustomCurrency) {
      formControlInCustomCurrency.setErrors({
        validationError: Object.values(constraints)[0]
      });
    }
  }

  return Promise.reject(nonIgnoredErrors);
}
