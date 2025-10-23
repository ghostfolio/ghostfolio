import { ActivityResponse } from '@ghostfolio/common/interfaces';

export interface PortfolioOrder
  extends Pick<ActivityResponse, 'tags' | 'type'> {
  date: string;
  fee: Big;
  quantity: Big;
  SymbolProfile: Pick<
    ActivityResponse['SymbolProfile'],
    'currency' | 'dataSource' | 'name' | 'symbol' | 'userId'
  >;
  unitPrice: Big;
}
