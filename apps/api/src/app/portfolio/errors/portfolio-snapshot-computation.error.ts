export class PortfolioSnapshotComputationError extends Error {
  public constructor(message: string) {
    super(message);

    this.name = 'PortfolioSnapshotComputationError';
  }
}
