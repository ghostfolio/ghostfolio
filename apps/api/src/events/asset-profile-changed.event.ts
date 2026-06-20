import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

export class AssetProfileChangedEvent {
  public constructor(
    public readonly data: AssetProfileIdentifier & { currency: string }
  ) {}

  public static getName(): string {
    return 'assetProfile.changed';
  }

  public getCurrency() {
    return this.data.currency;
  }

  public getDataSource() {
    return this.data.dataSource;
  }

  public getSymbol() {
    return this.data.symbol;
  }
}
