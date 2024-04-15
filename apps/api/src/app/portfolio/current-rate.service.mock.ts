import { parseDate, resetHours } from '@ghostfolio/common/helper';

import { addDays, endOfDay, isBefore, isSameDay } from 'date-fns';

import { GetValueObject } from './interfaces/get-value-object.interface';
import { GetValuesObject } from './interfaces/get-values-object.interface';
import { GetValuesParams } from './interfaces/get-values-params.interface';

function mockGetValue(symbol: string, date: Date) {
  switch (symbol) {
    case 'BALN.SW':
      if (isSameDay(parseDate('2021-11-12'), date)) {
        return { marketPrice: 146 };
      } else if (isSameDay(parseDate('2021-11-22'), date)) {
        return { marketPrice: 142.9 };
      } else if (isSameDay(parseDate('2021-11-26'), date)) {
        return { marketPrice: 139.9 };
      } else if (isSameDay(parseDate('2021-11-30'), date)) {
        return { marketPrice: 136.6 };
      } else if (isSameDay(parseDate('2021-12-18'), date)) {
        return { marketPrice: 148.9 };
      }

      return { marketPrice: 0 };

    case 'BTCUSD':
      if (isSameDay(parseDate('2015-01-01'), date)) {
        return { marketPrice: 314.25 };
      } else if (isSameDay(parseDate('2017-12-31'), date)) {
        return { marketPrice: 14156.4 };
      } else if (isSameDay(parseDate('2018-01-01'), date)) {
        return { marketPrice: 13657.2 };
      }

      return { marketPrice: 0 };

    case 'GOOGL':
      if (isSameDay(parseDate('2023-01-03'), date)) {
        return { marketPrice: 89.12 };
      } else if (isSameDay(parseDate('2023-07-10'), date)) {
        return { marketPrice: 116.45 };
      }

      return { marketPrice: 0 };

    case 'MSFT':
      if (isSameDay(parseDate('2021-09-16'), date)) {
        return { marketPrice: 89.12 };
      } else if (isSameDay(parseDate('2021-11-16'), date)) {
        return { marketPrice: 339.51 };
      } else if (isSameDay(parseDate('2023-07-10'), date)) {
        return { marketPrice: 331.83 };
      }

      return { marketPrice: 0 };

    case 'NOVN.SW':
      if (isSameDay(parseDate('2022-04-11'), date)) {
        return { marketPrice: 87.8 };
      }

      return { marketPrice: 0 };

    default:
      return { marketPrice: 0 };
  }
}

export const CurrentRateServiceMock = {
  getValues: ({
    dataGatheringItems,
    dateQuery
  }: GetValuesParams): Promise<GetValuesObject> => {
    const values: GetValueObject[] = [];

    if (dateQuery.lt) {
      for (
        let date = resetHours(dateQuery.gte);
        isBefore(date, endOfDay(dateQuery.lt));
        date = addDays(date, 1)
      ) {
        for (const dataGatheringItem of dataGatheringItems) {
          values.push({
            date,
            dataSource: dataGatheringItem.dataSource,
            marketPrice: mockGetValue(dataGatheringItem.symbol, date)
              .marketPrice,
            symbol: dataGatheringItem.symbol
          });
        }
      }
    } else {
      for (const date of dateQuery.in) {
        for (const dataGatheringItem of dataGatheringItems) {
          values.push({
            date,
            dataSource: dataGatheringItem.dataSource,
            marketPrice: mockGetValue(dataGatheringItem.symbol, date)
              .marketPrice,
            symbol: dataGatheringItem.symbol
          });
        }
      }
    }

    return Promise.resolve({ values, dataProviderInfos: [], errors: [] });
  }
};
