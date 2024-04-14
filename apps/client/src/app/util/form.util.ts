import { FormGroup } from '@angular/forms';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export async function validateObjectForForm<T>({
  classDto,
  form,
  object
}: {
  classDto: { new (): T };
  form: FormGroup;
  object: T;
}): Promise<void> {
  const objectInstance = plainToInstance(classDto, object);
  const errors = await validate(objectInstance as object);

  if (errors.length === 0) {
    return Promise.resolve();
  }

  for (const error of errors) {
    const formControl = form.get(error.property);

    if (formControl) {
      formControl.setErrors({
        validationError: Object.values(error.constraints)[0]
      });
    }
  }

  return Promise.reject(errors);
}
