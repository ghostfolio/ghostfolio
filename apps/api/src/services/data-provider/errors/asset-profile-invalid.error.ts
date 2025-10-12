export class AssetProfileInvalidError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = 'AssetProfileInvalidError';
  }
}
