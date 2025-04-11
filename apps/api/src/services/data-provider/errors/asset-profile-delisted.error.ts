export class AssetProfileDelistedError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'AssetProfileDelistedError';
  }
}
