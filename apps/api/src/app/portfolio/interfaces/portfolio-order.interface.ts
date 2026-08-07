import { Activity } from '@ghostfolio/common/interfaces';

export interface PortfolioOrder extends Pick<Activity, 'tags' | 'type'> {
  assetProfile: Pick<
    Activity['assetProfile'],
    'assetSubClass' | 'currency' | 'dataSource' | 'name' | 'symbol' | 'userId'
  >;
  date: string;
  fee: Big;
  feeInBaseCurrency: Big;
  quantity: Big;
  unitPrice: Big;
}
