import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';

export interface PortfolioOrder extends Pick<Activity, 'tags' | 'type'> {
  date: string;
  fee: Big;
  quantity: Big;
  SymbolProfile: Pick<
    Activity['SymbolProfile'],
    'currency' | 'dataSource' | 'name' | 'symbol'
  >;
  unitPrice: Big;
}
