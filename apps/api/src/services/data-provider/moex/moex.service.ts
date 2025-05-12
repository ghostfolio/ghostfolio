import {
  DataProviderInterface,
  GetDividendsParams,
  GetHistoricalParams,
  GetQuotesParams,
  GetSearchParams
} from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import { YahooFinanceService } from '@ghostfolio/api/services/data-provider/yahoo-finance/yahoo-finance.service';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import {
  DataProviderInfo,
  LookupResponse
} from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { $Enums, SymbolProfile } from '@prisma/client';
import {
  subYears,
  format,
  startOfYesterday,
  subDays,
  differenceInDays,
  addYears,
  differenceInMilliseconds
} from 'date-fns';
import { createMoexCLient } from 'moex-iss-api-client';
import {
  IGetSecuritiesParams,
  TGetSecuritiesParamsGroupBy
} from 'moex-iss-api-client/dist/client/security/requestTypes';
import { ISecuritiesResponse } from 'moex-iss-api-client/dist/client/security/responseTypes';

const moexClient = createMoexCLient();

declare interface ResponseData {
  columns: string[];
  data: (string | number | null)[][];
}

declare interface Response<T> {
  data: T;
  issError: string;
}

function response_data_to_map(
  response: ResponseData,
  keyColumnName: string
): Map<string | number, Map<string, string | number>> {
  const result = new Map<string | number, Map<string, string | number>>();

  response.data.forEach((x) => {
    const item = new Map<string, string | number>();
    response.columns.forEach((c, i) => item.set(c, x[i]));
    result.set(item.get(keyColumnName), item);
  });

  return result;
}

function getCurrency(currency: string): string {
  if (currency === 'SUR' || currency === 'RUR') return 'RUB';

  return currency;
}

/// So, we try to guess sectors of security by looking into indexes,
/// in which this security was put by MOEX
const indexToSectorMapping = new Map<string, string[]>([
  ['MOEXOG', ['Energy']], // MOEX Oil and Gas Index
  ['MOEXEU', ['Utilities']], // MOEX Electric Utilities Index
  ['MOEXTL', ['Communication Services']], // MOEX Telecommunication Index
  ['MOEXMM', ['Basic Materials', 'Industrial']], // MOEX Metals and Mining Index
  ['MOEXFN', ['Financial Services']], // MOEX Financials Index
  ['MOEXCN', ['Consumer Defensive', 'Consumer Cyclical', 'Healthcare']], // MOEX Consumer Index
  ['MOEXCH', ['Basic Materials']], // MOEX Chemicals Index
  ['MOEXIT', ['Technology']], // MOEX Information Technologies Index
  ['MOEXRE', ['Real Estate']], // MOEX Real Estate Index
  ['MOEXTN', ['Consumer Cyclical', 'Industrial']] // MOEX Transportation Index
]);

async function getSectors(
  symbol: string
): Promise<{ name: string; weight: number }[]> {
  const indicesResponse: Response<{ indices: ResponseData }> =
    await moexClient.security.getSecurityIndexes({ security: symbol });
  const errorMessage = indicesResponse.issError;
  if (errorMessage) {
    Logger.warn(errorMessage, 'MoexService.getSectors');
    return [];
  }

  const indices = response_data_to_map(indicesResponse.data.indices, 'SECID');

  const sectorIncluded = new Set<string>();
  const sectors = new Array<{ name: string; weight: number }>();

  for (const [indexCode, indexSectors] of indexToSectorMapping.entries()) {
    const index = indices.get(indexCode);
    if (!index) {
      continue;
    }

    if (sectorIncluded.has(indexCode)) {
      continue;
    }

    sectorIncluded.add(indexCode);
    indexSectors.forEach((x) => sectors.push({ name: x, weight: 1.0 }));
  }

  return sectors;
}

async function getDividendsFromMoex({
  from,
  symbol,
  to
}: GetDividendsParams): Promise<{
  [date: string]: IDataProviderHistoricalResponse;
}> {
  const response: Response<{ dividends: ResponseData }> =
    await moexClient.request(`securities/${symbol}/dividends`);
  if (response.issError) {
    Logger.warn(response.issError, 'MoexService.getDividends');
    return {};
  }

  const dividends = response_data_to_map(
    response.data.dividends,
    'registryclosedate'
  );
  const result: {
    [date: string]: IDataProviderHistoricalResponse;
  } = {};

  for (const [key, value] of dividends.entries()) {
    const date = new Date(key);

    if (date < from || date > to) {
      continue;
    }

    const price = value.get('value');
    if (typeof price === 'number') result[key] = { marketPrice: price };
  }

  return result;
}

async function readBatchedResponse<T>(
  getNextBatch: (start: number) => Promise<Response<T>>,
  extractor: (batch: Response<T>) => ResponseData
): Promise<ResponseData> {
  let batch: ResponseData;
  const wholeResponse: ResponseData = { columns: [], data: [] };

  do {
    const response: Response<T> = await getNextBatch(wholeResponse.data.length);
    if (response === undefined) {
      break;
    }
    if (response.issError) {
      Logger.warn(response.issError, 'MoexService.readBatchedResponse');
      break;
    }

    batch = extractor(response);
    if (wholeResponse.columns.length === 0) {
      wholeResponse.columns = batch.columns;
    }

    wholeResponse.data = [...wholeResponse.data, ...batch.data];
  } while (batch.data.length > 0);

  return wholeResponse;
}

interface SecurityTypeMap {
  [key: string]: [$Enums.AssetClass?, $Enums.AssetSubClass?];
}

/// MOEX security types were obtained here:  https://iss.moex.com/iss/index.json (add `?lang=en` for english)
/// | id   | security_type_name    | ghostfolio_assetclass | ghostfolio_assetsubclass |
/// | ---- | --------------------- | --------------------- | ------------------------ |
/// | 1    | preferred_share       | EQUITY                | STOCK                    |
/// | 2    | corporate_bond        | FIXED_INCOME          | BOND                     |
/// | 3    | common_share          | EQUITY                | STOCK                    |
/// | 4    | cb_bond               | FIXED_INCOME          | BOND                     |
/// | 5    | currency              | LIQUIDITY             | CASH                     |
/// | 6    | futures               | COMMODITY             |                          |
/// | 7    | public_ppif           | EQUITY                | MUTUALFUND               |
/// | 8    | interval_ppif         | EQUITY                | MUTUALFUND               |
/// | 9    | private_ppif          | EQUITY                | MUTUALFUND               |
/// | 10   | state_bond            | FIXED_INCOME          | BOND                     |
/// | 41   | subfederal_bond       | FIXED_INCOME          | BOND                     |
/// | 42   | ifi_bond              | FIXED_INCOME          | BOND                     |
/// | 43   | exchange_bond         | FIXED_INCOME          | BOND                     |
/// | 44   | stock_index           |                       |                          |
/// | 45   | municipal_bond        | FIXED_INCOME          | BOND                     |
/// | 51   | depositary_receipt    | EQUITY                | STOCK                    |
/// | 52   | option                | COMMODITY             |                          |
/// | 53   | rts_index             |                       |                          |
/// | 54   | ofz_bond              | FIXED_INCOME          | BOND                     |
/// | 55   | etf_ppif              | EQUITY                | ETF                      |
/// | 57   | stock_mortgage        | REAL_ESTATE           |                          |
/// | 58   | gold_metal            | LIQUIDITY             | PRECIOUS_METAL           |
/// | 59   | silver_metal          | LIQUIDITY             | PRECIOUS_METAL           |
/// | 60   | euro_bond             | FIXED_INCOME          | BOND                     |
/// | 62   | currency_futures      | LIQUIDITY             | CASH                     |
/// | 63   | stock_deposit         | LIQUIDITY             | CASH                     |
/// | 73   | currency_fixing       | LIQUIDITY             | CASH                     |
/// | 74   | exchange_ppif         | EQUITY                | ETF                      |
/// | 75   | currency_index        | LIQUIDITY             | CASH                     |
/// | 76   | currency_wap          | LIQUIDITY             | CASH                     |
/// | 78   | non_exchange_bond     | FIXED_INCOME          | BOND                     |
/// | 84   | stock_index_eq        |                       |                          |
/// | 85   | stock_index_fi        |                       |                          |
/// | 86   | stock_index_mx        |                       |                          |
/// | 87   | stock_index_ie        |                       |                          |
/// | 88   | stock_index_if        |                       |                          |
/// | 89   | stock_index_ci        |                       |                          |
/// | 90   | stock_index_im        |                       |                          |
/// | 1030 | stock_index_namex     |                       |                          |
/// | 1031 | option_on_shares      | EQUITY                | STOCK                    |
/// | 1034 | stock_index_rusfar    |                       |                          |
/// | 1155 | stock_index_pf        |                       |                          |
/// | 1291 | option_on_currency    |                       |                          |
/// | 1293 | option_on_indices     |                       |                          |
/// | 1295 | option_on_commodities | COMMODITY             |                          |
/// | 1337 | futures_spread        | COMMODITY             |                          |
/// | 1338 | futures_collateral    | COMMODITY             |                          |
/// | 1347 | currency_otcindices   | LIQUIDITY             | CASH                     |
/// | 1352 | other_metal           | COMMODITY             | PRECIOUS_METAL           |
/// | 1403 | stock_index_ri        |                       |                          |
const securityTypeMap: SecurityTypeMap = {
  preferred_share: [$Enums.AssetClass.EQUITY, $Enums.AssetSubClass.STOCK],
  corporate_bond: [$Enums.AssetClass.FIXED_INCOME, $Enums.AssetSubClass.BOND],
  common_share: [$Enums.AssetClass.EQUITY, $Enums.AssetSubClass.STOCK],
  cb_bond: [$Enums.AssetClass.FIXED_INCOME, $Enums.AssetSubClass.BOND],
  currency: [$Enums.AssetClass.LIQUIDITY, $Enums.AssetSubClass.CASH],
  futures: [$Enums.AssetClass.COMMODITY],
  public_ppif: [$Enums.AssetClass.EQUITY, $Enums.AssetSubClass.MUTUALFUND],
  interval_ppif: [$Enums.AssetClass.EQUITY, $Enums.AssetSubClass.MUTUALFUND],
  private_ppif: [$Enums.AssetClass.EQUITY, $Enums.AssetSubClass.MUTUALFUND],
  state_bond: [$Enums.AssetClass.FIXED_INCOME, $Enums.AssetSubClass.BOND],
  subfederal_bond: [$Enums.AssetClass.FIXED_INCOME, $Enums.AssetSubClass.BOND],
  ifi_bond: [$Enums.AssetClass.FIXED_INCOME, $Enums.AssetSubClass.BOND],
  exchange_bond: [$Enums.AssetClass.FIXED_INCOME, $Enums.AssetSubClass.BOND],
  municipal_bond: [$Enums.AssetClass.FIXED_INCOME, $Enums.AssetSubClass.BOND],
  depositary_receipt: [$Enums.AssetClass.EQUITY, $Enums.AssetSubClass.STOCK],
  option: [$Enums.AssetClass.COMMODITY],
  etf_ppif: [$Enums.AssetClass.EQUITY, $Enums.AssetSubClass.ETF],
  stock_mortgage: [$Enums.AssetClass.REAL_ESTATE],
  gold_metal: [
    $Enums.AssetClass.LIQUIDITY,
    $Enums.AssetSubClass.PRECIOUS_METAL
  ],
  silver_metal: [
    $Enums.AssetClass.LIQUIDITY,
    $Enums.AssetSubClass.PRECIOUS_METAL
  ],
  currency_futures: [$Enums.AssetClass.LIQUIDITY, $Enums.AssetSubClass.CASH],
  stock_deposit: [$Enums.AssetClass.LIQUIDITY, $Enums.AssetSubClass.CASH],
  currency_fixing: [$Enums.AssetClass.LIQUIDITY, $Enums.AssetSubClass.CASH],
  exchange_ppif: [$Enums.AssetClass.EQUITY, $Enums.AssetSubClass.ETF],
  currency_index: [$Enums.AssetClass.LIQUIDITY, $Enums.AssetSubClass.CASH],
  currency_wap: [$Enums.AssetClass.LIQUIDITY, $Enums.AssetSubClass.CASH],
  non_exchange_bond: [
    $Enums.AssetClass.FIXED_INCOME,
    $Enums.AssetSubClass.BOND
  ],
  option_on_shares: [$Enums.AssetClass.EQUITY, $Enums.AssetSubClass.STOCK],
  option_on_commodities: [$Enums.AssetClass.COMMODITY],
  futures_spread: [$Enums.AssetClass.COMMODITY],
  futures_collateral: [$Enums.AssetClass.COMMODITY],
  currency_otcindices: [$Enums.AssetClass.LIQUIDITY, $Enums.AssetSubClass.CASH],
  other_metal: [
    $Enums.AssetClass.COMMODITY,
    $Enums.AssetSubClass.PRECIOUS_METAL
  ]
};

@Injectable()
export class MoexService implements DataProviderInterface {
  public constructor(
    private readonly yahooFinanceService: YahooFinanceService
  ) {}

  canHandle(): boolean {
    return true;
  }

  async getAssetProfile({
    symbol
  }: {
    symbol: string;
  }): Promise<Partial<SymbolProfile>> {
    const securitySpecificationResponse =
      await moexClient.security.getSecuritySpecification({ security: symbol });
    const errorMessage = securitySpecificationResponse.issError;
    if (errorMessage) {
      Logger.warn(errorMessage, 'MoexService.getAssetProfile');
      return {};
    }

    const securitySpecification = response_data_to_map(
      securitySpecificationResponse.data.description,
      'name'
    );

    const issueDate = securitySpecification.get('ISSUEDATE');
    const faceunit = securitySpecification.get('FACEUNIT');
    const isin = securitySpecification.get('ISIN');
    const latname = securitySpecification.get('LATNAME');
    const shortname = securitySpecification.get('SHORTNAME');
    const name = securitySpecification.get('NAME');
    const secid = securitySpecification.get('SECID');
    const type = securitySpecification.get('TYPE');
    const [assetClass, assetSubClass] =
      securityTypeMap[type.get('value').toString()] ?? [];

    return {
      assetClass: assetClass,
      assetSubClass: assetSubClass,
      createdAt: issueDate ? new Date(issueDate.get('value')) : null,
      currency: faceunit
        ? getCurrency(faceunit.get('value').toString())
        : 'RUB',
      dataSource: this.getName(),
      id: symbol,
      isin: isin ? isin.get('value').toString() : null,
      name: (latname ?? shortname ?? name ?? secid).get('value').toString(),
      sectors: await getSectors(symbol),
      symbol: symbol,
      countries: isin
        ? [
            {
              code: isin.get('value').toString().substring(0, 2),
              weight: 1
            }
          ]
        : null
    };
  }

  getDataProviderInfo(): DataProviderInfo {
    return {
      isPremium: false
    };
  }

  // MOEX endpoint for dividends isn't documented and sometimes doesn't return newer dividends.
  // YAHOO endpoint for dividends sometimes doesn't respect date filters.
  // So, we'll requests dividends for 2 years more from both providers and merge data.
  // If dividends date from MOEX and YAHOO differs for 2 days or less, we'll assume it's the same payout given amount is the same.
  // Payouts considered the same if they differ less that 1/100 of the currency.
  async getDividends({ from, symbol, to }: GetDividendsParams): Promise<{
    [date: string]: IDataProviderHistoricalResponse;
  }> {
    const twoYearsAgo = subYears(from, 2);
    const twoYearsAhead = addYears(to, 2);
    const [dividends, dividendsFromYahoo] = await Promise.all([
      getDividendsFromMoex({ from: twoYearsAgo, symbol, to: twoYearsAhead }),
      this.yahooFinanceService.getDividends({
        from: twoYearsAgo,
        symbol: `${symbol}.ME`,
        to: twoYearsAhead
      })
    ]);

    const dateAlmostTheSame = (x: Date, y: Date) =>
      Math.abs(differenceInDays(x, y)) <= 2;
    const payoutsAlmostTheSame = (x: number, y: number) =>
      100 * Math.abs(x - y) < 1;

    for (const [yahooDateStr, yahooDividends] of Object.entries(
      dividendsFromYahoo
    )) {
      const yahooDate = new Date(yahooDateStr);
      const sameDividendIndex = Object.entries(dividends).findIndex(
        (x) =>
          dateAlmostTheSame(new Date(x[0]), yahooDate) &&
          payoutsAlmostTheSame(x[1].marketPrice, yahooDividends.marketPrice)
      );
      if (sameDividendIndex === -1) {
        dividends[yahooDateStr] = yahooDividends;
      }
    }

    const result: { [date: string]: IDataProviderHistoricalResponse } = {};

    Object.entries(dividends)
      .map(
        ([dateStr, dividends]) =>
          [dateStr, dividends, new Date(dateStr)] as [
            string,
            IDataProviderHistoricalResponse,
            Date
          ]
      )
      .filter(([, , date]) => date >= from)
      .filter(([, , date]) => date <= to)
      .sort(([, , a], [, , b]) => differenceInMilliseconds(a, b))
      .forEach(([dateStr, dividends]) => (result[dateStr] = dividends));

    return result;
  }

  async getHistorical({ from, symbol, to }: GetHistoricalParams): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    const params: Record<string, any> = {
      sort_order: 'desc',
      marketprice_board: '1',
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd')
    };

    const historyResponse = await readBatchedResponse<{
      history: ResponseData;
    }>(
      async (x) => {
        params['start'] = x;
        return await moexClient.request(
          `history/engines/stock/markets/shares/securities/${symbol}`,
          params
        );
      },
      (x) => x.data.history
    );

    const history = response_data_to_map(historyResponse, 'TRADEDATE');

    const result: {
      [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
    } = {};
    result[symbol] = {};

    for (const [key, value] of history.entries()) {
      const price = value.get('LEGALCLOSEPRICE');
      if (typeof price === 'number')
        result[symbol][key] = { marketPrice: price };
    }

    return result;
  }

  getMaxNumberOfSymbolsPerRequest?(): number {
    return 1;
  }

  getName(): $Enums.DataSource {
    return $Enums.DataSource.MOEX;
  }

  async getQuotes({
    symbols
  }: GetQuotesParams): Promise<{ [symbol: string]: IDataProviderResponse }> {
    const result: { [symbol: string]: IDataProviderResponse } = {};

    for (const symbol of symbols) {
      const profile = await this.getAssetProfile({ symbol: symbol });

      for (
        let date = startOfYesterday();
        !result[symbol];
        date = subDays(date, 1)
      ) {
        const history = await this.getHistorical({
          from: date,
          to: date,
          symbol: symbol
        });

        for (const [, v] of Object.entries(history[symbol])) {
          result[symbol] = {
            currency: profile.currency,
            dataSource: profile.dataSource,
            marketPrice: v.marketPrice,
            marketState: 'closed'
          };
        }
      }
    }

    return result;
  }

  getTestSymbol(): string {
    return 'SBER';
  }

  async search({ query }: GetSearchParams): Promise<LookupResponse> {
    // MOEX doesn't support search for queries less than 3 symbols
    if (query.length < 3) {
      return { items: [] };
    }

    const params: IGetSecuritiesParams & TGetSecuritiesParamsGroupBy = {
      q: query
    };

    const searchResponse = await readBatchedResponse<ISecuritiesResponse>(
      async (x) => {
        params['start'] = x;
        return await moexClient.security.getSecurities(params);
      },
      (x) => x.data.securities
    );

    const search = response_data_to_map(searchResponse, 'secid');

    const result: LookupResponse = { items: [] };
    for (const k of search.keys()) {
      if (typeof k != 'string') {
        continue;
      }
      const profile = await this.getAssetProfile({ symbol: k });
      result.items.push({
        assetClass: profile.assetClass,
        assetSubClass: profile.assetSubClass,
        currency: profile.currency,
        dataProviderInfo: this.getDataProviderInfo(),
        dataSource: this.getName(),
        name: profile.name,
        symbol: k
      });
    }

    return result;
  }
}
