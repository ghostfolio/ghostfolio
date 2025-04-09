export class AssetProfileDelistedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssetProfileDelistedError';
  }
}
