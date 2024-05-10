export class PortfolioChangedEvent {
  private userId: string;

  public constructor({ userId }: { userId: string }) {
    this.userId = userId;
  }

  public static getName() {
    return 'portfolio.changed';
  }

  public getUserId() {
    return this.userId;
  }
}
