export class ImportValidationError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = 'ImportValidationError';
  }
}
