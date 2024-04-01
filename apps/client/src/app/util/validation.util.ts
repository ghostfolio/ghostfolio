import { FormGroup } from '@angular/forms';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export function validateObjectForForm<T>(
  obj: T,
  ctor: { new (): T },
  form: FormGroup,
  onSuccess: () => void
): void {
  const objInstance = plainToInstance(ctor, obj);

  validate(objInstance as object).then((errors) => {
    if (errors.length === 0) {
      onSuccess();
    } else {
      errors.forEach((error) => {
        const formControl = form.get(error.property);
        if (formControl) {
          formControl.setErrors({
            validationError: Object.values(error.constraints)[0]
          });
        }
      });
    }
  });
}
