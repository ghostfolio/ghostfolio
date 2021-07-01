import { CurrentRateService } from '@ghostfolio/api/app/core/current-rate.service';
import { Currency } from '@prisma/client';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';

jest.mock('../../services/exchange-rate-data.service', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    exchangeRateDataService: jest.fn().mockImplementation(() => {
      return {
        toCurrency: (aValue: number,
                     aFromCurrency: Currency,
                     aToCurrency: Currency) => {
          return 1 * aValue;
        }
      }
    })
  };
});

// https://jestjs.io/docs/manual-mocks#mocking-node-modules
// jest.mock('?', () => {
//   return {
//     // eslint-disable-next-line @typescript-eslint/naming-convention
//     prismaService: jest.fn().mockImplementation(() => {
//       return {
//         marketData: {
//           findFirst: (data: any) => {
//             return {
//               marketPrice: 100
//             };
//           }
//         }
//       };
//     })
//   };
// });

xdescribe('CurrentRateService', () => {

  let exchangeRateDataService: ExchangeRateDataService;
  let prismaService: PrismaService;

  beforeEach(() => {
    exchangeRateDataService = new ExchangeRateDataService(undefined);
    prismaService = new PrismaService();
  });

  it('getValue', () => {
    const currentRateService = new CurrentRateService(exchangeRateDataService, prismaService);

    expect(currentRateService.getValue({
      date: new Date(),
      symbol: 'AIA',
      currency: Currency.USD,
      userCurrency: Currency.CHF
    })).toEqual(0);
  });

});
