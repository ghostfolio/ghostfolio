import { CallerFacingError } from '@ghostfolio/api/errors/caller-facing.error';

export class ImportValidationError extends CallerFacingError {
  public constructor(message: string) {
    super(message);

    this.name = 'ImportValidationError';
  }
}
