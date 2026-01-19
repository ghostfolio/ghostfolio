import { Activity } from '@ghostfolio/common/interfaces';

export interface PortfolioOrder extends Pick<Activity, 'tags' | 'type'> {
  date: string;
  fee: Big;
  feeInBaseCurrency: Big;
  quantity: Big;
  SymbolProfile: Pick<
    Activity['SymbolProfile'],
    'assetSubClass' | 'currency' | 'dataSource' | 'name' | 'symbol' | 'userId'
  >;
  unitPrice: Big;
}
