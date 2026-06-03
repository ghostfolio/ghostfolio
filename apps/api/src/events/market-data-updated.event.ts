import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

export class MarketDataUpdatedEvent {
  public constructor(public readonly data: AssetProfileIdentifier) {}

  public static getName(): string {
    return 'market-data.updated';
  }
}
