import { IDataProviderResponse } from '@ghostfolio/api/services/interfaces/interfaces';

export interface DataEnhancerInterface {
  enhance(
    symbol: string,
    response: IDataProviderResponse
  ): Promise<IDataProviderResponse>;
}
