import { DataEnhancerInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-enhancer.interface';

import { HttpException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import ms from 'ms';

@Injectable()
export class DataEnhancerService {
  public constructor(
    @Inject('DataEnhancers')
    private readonly dataEnhancers: DataEnhancerInterface[]
  ) {}

  public async enhance(aName: string) {
    const dataEnhancer = this.dataEnhancers.find((dataEnhancer) => {
      return dataEnhancer.getName() === aName;
    });

    if (!dataEnhancer) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    try {
      const assetProfile = await dataEnhancer.enhance({
        requestTimeout: ms('30 seconds'),
        response: {
          assetClass: 'EQUITY',
          assetSubClass: 'ETF'
        },
        symbol: dataEnhancer.getTestSymbol()
      });

      if (
        (assetProfile.countries as unknown as Prisma.JsonArray)?.length > 0 &&
        (assetProfile.sectors as unknown as Prisma.JsonArray)?.length > 0
      ) {
        return true;
      }
    } catch {}

    return false;
  }
}
