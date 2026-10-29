/**
 * An error whose message is written for the caller. A filter passes such a
 * message on, while it hides the message of every other error, because that
 * message can carry internals of the application.
 */
export class CallerFacingError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = 'CallerFacingError';
  }
}
