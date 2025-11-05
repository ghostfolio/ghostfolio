export class AssetProfileChangedEvent {
  private static readonly eventName = 'asset-profile.changed';

  public constructor(
    public readonly currency: string,
    public readonly symbol: string
  ) {}

  public static getName(): string {
    return AssetProfileChangedEvent.eventName;
  }
}
