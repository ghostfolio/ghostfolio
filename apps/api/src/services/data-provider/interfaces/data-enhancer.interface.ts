import { IDataProviderResponse } from '@ghostfolio/api/services/interfaces/interfaces';

export interface DataEnhancerInterface {
  enhance({
    response,
    symbol
  }: {
    response: IDataProviderResponse;
    symbol: string;
  }): Promise<IDataProviderResponse>;
}
