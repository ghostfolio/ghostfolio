import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable, Logger } from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  SymbolProfile
} from '@prisma/client';
import bent from 'bent';
import { format, differenceInDays, addDays, subDays } from 'date-fns';

@Injectable()
export class CoinGeckoDataService implements DataProviderInterface {
  private readonly URL = 'https://api.coingecko.com/api/v3';
  private COINLIST = [];
  private DEFAULT_CURRENCY: string;
  private DB = {};

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {
    this.DEFAULT_CURRENCY = this.configurationService
      .get('BASE_CURRENCY')
      .toUpperCase();
    this.DB = {};
  }

  public canHandle(symbol: string) {
    return true;
  }

  public async getDividends({
    from,
    granularity = 'day',
    symbol,
    to
  }: {
    from: Date;
    granularity: Granularity;
    symbol: string;
    to: Date;
  }) {
    return {};
  }

  public async getCoinList() {
    // TODO: Some caching refresh after X?
    if (this.COINLIST.length == 0) {
      const req = bent(`${this.URL}/coins/list`, 'GET', 'json', 200);
      const response = await req();
      this.COINLIST = response;
    }
  }

  public async getAssetProfile(
    aSymbol: string
  ): Promise<Partial<SymbolProfile>> {
    return {
      assetClass: AssetClass.CASH,
      assetSubClass: AssetSubClass.CRYPTOCURRENCY,
      currency: this.DEFAULT_CURRENCY.toUpperCase(),
      dataSource: this.getName(),
      name: aSymbol,
      symbol: aSymbol
    };
  }

  public async popolateDb(datefrom: Date, symbol: string) {
    let start_day;
    let end_day;
    datefrom.setHours(0, 0, 1);
    start_day = Math.round(datefrom.getTime() / 1000);
    end_day = Math.round(new Date().getTime() / 1000);
    const targeturl = `${
      this.URL
    }/coins/${symbol.toLowerCase()}/market_chart/range?vs_currency=${this.DEFAULT_CURRENCY.toLowerCase()}&from=${start_day}&to=${end_day}`;
    const req = bent(targeturl, 'GET', 'json', 200);
    const response = await req();
    if (response.prices.length) {
      for (const iter of response.prices) {
        let day = new Date(iter[0]);
        day.setHours(0, 0, 1, 1);
        let dayepoch = Math.round(day.getTime() / 1000);
        this.DB[dayepoch] = iter[1];
      }
    }
  }

  public async getDayStat(datein: Date, symbol: string) {
    let out = { marketPrice: 0 };
    let prevday = subDays(datein, 1);
    datein.setHours(0, 0, 1, 1);
    let start_day = Math.round(datein.getTime() / 1000);
    let prev_day = Math.round(prevday.getTime() / 1000);
    out['marketPrice'] = this.DB[start_day];
    if (prev_day in this.DB) {
      out['performance'] = this.DB[start_day] / this.DB[prev_day];
    } else {
      out['performance'] = 0;
    }
    return out;
  }

  public async getHistorical(
    aSymbol: string,
    aGranularity: Granularity = 'day',
    from: Date,
    to: Date
  ): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    let out = {};
    out[aSymbol] = {};
    const total_days = Math.abs(differenceInDays(from, to)) + 1;
    await this.popolateDb(from, aSymbol);
    for (const iter of Array(total_days).keys()) {
      let day = addDays(from, iter);
      let datestr = format(day, DATE_FORMAT);
      out[aSymbol][datestr] = await this.getDayStat(day, aSymbol);
    }

    return out;
  }

  public getMaxNumberOfSymbolsPerRequest() {
    // Safe Rate Limit: https://www.coingecko.com/en/api/pricing#general
    return 20;
  }

  public getName(): DataSource {
    return DataSource.COINGECKO;
  }

  public async getQuotes(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    var results = {};

    if (aSymbols.length <= 0) {
      return {};
    }
    try {
      for (const coin of aSymbols) {
        const coinlower = coin.toLowerCase();
        const req = bent(
          `${
            this.URL
          }/simple/price?ids=${coinlower}&vs_currencies=${this.DEFAULT_CURRENCY.toLowerCase()}`,
          'GET',
          'json',
          200
        );
        const response = await req();
        const price = response[coinlower][this.DEFAULT_CURRENCY.toLowerCase()];

        results[coin] = {
          currency: this.DEFAULT_CURRENCY,
          dataSource: DataSource.COINGECKO,
          marketPrice: price,
          marketState: 'closed'
        };
      }

      return results;
    } catch (error) {
      Logger.error(error, 'CoinGecko');
      return {};
    }
  }

  public async search(aQuery: string): Promise<{ items: LookupItem[] }> {
    await this.getCoinList();
    if (aQuery.length <= 2) {
      return { items: [] };
    }
    var coins = [];

    for (const coiniter of this.COINLIST) {
      if (coiniter.id.toLowerCase().includes(aQuery)) {
        coins.push({
          symbol: coiniter.id.toUpperCase(),
          currency: this.DEFAULT_CURRENCY,
          dataSource: this.getName(),
          name: `${coiniter.name} (From CoinGecko)`
        });
      }
    }
    return { items: coins };
  }
}