import { LogPerformance } from '@ghostfolio/api/aop/logging.interceptor';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { getFactor } from '@ghostfolio/api/helper/portfolio.helper';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import { DATE_FORMAT, parseDate, resetHours } from '@ghostfolio/common/helper';
import { Filter, HistoricalDataItem } from '@ghostfolio/common/interfaces';
import { DateRange } from '@ghostfolio/common/types';

import { Inject, Logger } from '@nestjs/common';
import { Big } from 'big.js';
import {
  addDays,
  differenceInDays,
  eachDayOfInterval,
  endOfDay,
  format,
  isAfter,
  isBefore,
  subDays
} from 'date-fns';

import { CurrentRateService } from '../../current-rate.service';
import { DateQuery } from '../../interfaces/date-query.interface';
import { PortfolioOrder } from '../../interfaces/portfolio-order.interface';
import { TWRPortfolioCalculator } from '../twr/portfolio-calculator';

export class CPRPortfolioCalculator extends TWRPortfolioCalculator {
  private holdings: { [date: string]: { [symbol: string]: Big } } = {};
  private holdingCurrencies: { [symbol: string]: string } = {};

  constructor(
    {
      accountBalanceItems,
      activities,
      configurationService,
      currency,
      currentRateService,
      exchangeRateDataService,
      redisCacheService,
      userId,
      filters
    }: {
      accountBalanceItems: HistoricalDataItem[];
      activities: Activity[];
      configurationService: ConfigurationService;
      currency: string;
      currentRateService: CurrentRateService;
      exchangeRateDataService: ExchangeRateDataService;
      redisCacheService: RedisCacheService;
      filters: Filter[];
      userId: string;
    },
    @Inject()
    private orderService: OrderService
  ) {
    super({
      accountBalanceItems,
      activities,
      configurationService,
      currency,
      filters,
      currentRateService,
      exchangeRateDataService,
      redisCacheService,
      userId
    });
  }

  @LogPerformance
  public async getChart({
    dateRange = 'max',
    withDataDecimation = true,
    withTimeWeightedReturn = false
  }: {
    dateRange?: DateRange;
    withDataDecimation?: boolean;
    withTimeWeightedReturn?: boolean;
  }): Promise<HistoricalDataItem[]> {
    const { endDate, startDate } = getIntervalFromDateRange(
      dateRange,
      this.getStartDate()
    );

    const daysInMarket = differenceInDays(endDate, startDate) + 1;
    const step = withDataDecimation
      ? Math.round(
          daysInMarket /
            Math.min(
              daysInMarket,
              this.configurationService.get('MAX_CHART_ITEMS')
            )
        )
      : 1;

    let item = await super.getPerformance({
      end: endDate,
      start: startDate
    });

    if (!withTimeWeightedReturn) {
      return item.chart;
    } else {
      let itemResult = item.chart;
      let dates = itemResult.map((item) => parseDate(item.date));
      let timeWeighted = await this.getTimeWeightedChartData({
        dates
      });

      return itemResult.map((item) => {
        let timeWeightedItem = timeWeighted.find(
          (timeWeightedItem) => timeWeightedItem.date === item.date
        );
        if (timeWeightedItem) {
          item.timeWeightedPerformance =
            timeWeightedItem.netPerformanceInPercentage;
          item.timeWeightedPerformanceWithCurrencyEffect =
            timeWeightedItem.netPerformanceInPercentageWithCurrencyEffect;
        }

        return item;
      });
    }
  }

  @LogPerformance
  public async getUnfilteredNetWorth(currency: string): Promise<Big> {
    const activities = await this.orderService.getOrders({
      userId: this.userId,
      userCurrency: currency,
      types: ['BUY', 'SELL', 'STAKE'],
      withExcludedAccounts: true
    });
    const orders = this.activitiesToPortfolioOrder(activities.activities);
    const start = orders.reduce(
      (date, order) =>
        parseDate(date.date).getTime() < parseDate(order.date).getTime()
          ? date
          : order,
      { date: orders[0].date }
    ).date;

    const end = new Date(Date.now());

    const holdings = await this.getHoldings(orders, parseDate(start), end);
    const marketMap = await this.currentRateService.getValues({
      dataGatheringItems: this.mapToDataGatheringItems(orders),
      dateQuery: { in: [end] }
    });
    const endString = format(end, DATE_FORMAT);
    let exchangeRates = await Promise.all(
      Object.keys(holdings[endString]).map(async (holding) => {
        let symbol = marketMap.values.find((m) => m.symbol === holding);
        let symbolCurrency = this.getCurrencyFromActivities(orders, holding);
        let exchangeRate = await this.exchangeRateDataService.toCurrencyAtDate(
          1,
          symbolCurrency,
          this.currency,
          end
        );
        return { symbolCurrency, exchangeRate };
      })
    );
    let currencyRates = exchangeRates.reduce<{ [currency: string]: number }>(
      (all, currency): { [currency: string]: number } => {
        all[currency.symbolCurrency] ??= currency.exchangeRate;
        return all;
      },
      {}
    );

    let totalInvestment = await Object.keys(holdings[endString]).reduce(
      (sum, holding) => {
        if (!holdings[endString][holding].toNumber()) {
          return sum;
        }
        let symbol = marketMap.values.find((m) => m.symbol === holding);

        if (symbol?.marketPrice === undefined) {
          Logger.warn(
            `Missing historical market data for ${holding} (${end})`,
            'PortfolioCalculator'
          );
          return sum;
        } else {
          let symbolCurrency = this.getCurrency(holding);
          let price = new Big(currencyRates[symbolCurrency]).mul(
            symbol.marketPrice
          );
          return sum.plus(new Big(price).mul(holdings[endString][holding]));
        }
      },
      new Big(0)
    );
    return totalInvestment;
  }

  @LogPerformance
  protected async getTimeWeightedChartData({
    dates
  }: {
    dates?: Date[];
  }): Promise<HistoricalDataItem[]> {
    dates = dates.sort((a, b) => a.getTime() - b.getTime());
    const start = dates[0];
    const end = dates[dates.length - 1];
    let marketMapTask = this.computeMarketMap({
      gte: start,
      lt: addDays(end, 1)
    });
    const timelineHoldings = await this.getHoldings(
      this.activities,
      start,
      end
    );

    let data: HistoricalDataItem[] = [];
    const startString = format(start, DATE_FORMAT);

    data.push({
      date: startString,
      netPerformanceInPercentage: 0,
      netPerformanceInPercentageWithCurrencyEffect: 0,
      investmentValueWithCurrencyEffect: 0,
      netPerformance: 0,
      netPerformanceWithCurrencyEffect: 0,
      netWorth: 0,
      totalAccountBalance: 0,
      totalInvestment: 0,
      totalInvestmentValueWithCurrencyEffect: 0,
      value: 0,
      valueWithCurrencyEffect: 0
    });

    this.marketMap = await marketMapTask;

    let totalInvestment = Object.keys(timelineHoldings[startString]).reduce(
      (sum, holding) => {
        return sum.plus(
          timelineHoldings[startString][holding].mul(
            this.marketMap[startString][holding] ?? new Big(0)
          )
        );
      },
      new Big(0)
    );

    let previousNetPerformanceInPercentage = new Big(0);
    let previousNetPerformanceInPercentageWithCurrencyEffect = new Big(0);

    for (let i = 1; i < dates.length; i++) {
      const date = format(dates[i], DATE_FORMAT);
      const previousDate = format(dates[i - 1], DATE_FORMAT);
      const holdings = timelineHoldings[previousDate];
      let newTotalInvestment = new Big(0);
      let netPerformanceInPercentage = new Big(0);
      let netPerformanceInPercentageWithCurrencyEffect = new Big(0);

      for (const holding of Object.keys(holdings)) {
        ({
          netPerformanceInPercentage,
          netPerformanceInPercentageWithCurrencyEffect,
          newTotalInvestment
        } = await this.handleSingleHolding(
          previousDate,
          holding,
          date,
          totalInvestment,
          timelineHoldings,
          netPerformanceInPercentage,
          netPerformanceInPercentageWithCurrencyEffect,
          newTotalInvestment
        ));
      }
      totalInvestment = newTotalInvestment;

      previousNetPerformanceInPercentage = previousNetPerformanceInPercentage
        .plus(1)
        .mul(netPerformanceInPercentage.plus(1))
        .minus(1);
      previousNetPerformanceInPercentageWithCurrencyEffect =
        previousNetPerformanceInPercentageWithCurrencyEffect
          .plus(1)
          .mul(netPerformanceInPercentageWithCurrencyEffect.plus(1))
          .minus(1);

      data.push({
        date,
        netPerformanceInPercentage: previousNetPerformanceInPercentage
          .mul(100)
          .toNumber(),
        netPerformanceInPercentageWithCurrencyEffect:
          previousNetPerformanceInPercentageWithCurrencyEffect
            .mul(100)
            .toNumber()
      });
    }

    return data;
  }

  @LogPerformance
  protected async handleSingleHolding(
    previousDate: string,
    holding: string,
    date: string,
    totalInvestment: Big,
    timelineHoldings: { [date: string]: { [symbol: string]: Big } },
    netPerformanceInPercentage: Big,
    netPerformanceInPercentageWithCurrencyEffect: Big,
    newTotalInvestment: Big
  ) {
    const previousPrice = this.marketMap[previousDate][holding];
    const currentPrice = this.marketMap[date][holding] ?? previousPrice;
    const previousHolding = timelineHoldings[previousDate][holding];

    const priceInBaseCurrency = currentPrice
      ? new Big(
          await this.exchangeRateDataService.toCurrencyAtDate(
            currentPrice?.toNumber() ?? 0,
            this.getCurrency(holding),
            this.currency,
            parseDate(date)
          )
        )
      : new Big(0);

    if (previousHolding.eq(0)) {
      return {
        netPerformanceInPercentage: netPerformanceInPercentage,
        netPerformanceInPercentageWithCurrencyEffect:
          netPerformanceInPercentageWithCurrencyEffect,
        newTotalInvestment: newTotalInvestment.plus(
          timelineHoldings[date][holding].mul(priceInBaseCurrency)
        )
      };
    }
    if (previousPrice === undefined || currentPrice === undefined) {
      Logger.warn(
        `Missing historical market data for ${holding} (${previousPrice === undefined ? previousDate : date}})`,
        'PortfolioCalculator'
      );
      return {
        netPerformanceInPercentage: netPerformanceInPercentage,
        netPerformanceInPercentageWithCurrencyEffect:
          netPerformanceInPercentageWithCurrencyEffect,
        newTotalInvestment: newTotalInvestment.plus(
          timelineHoldings[date][holding].mul(priceInBaseCurrency)
        )
      };
    }
    const previousPriceInBaseCurrency = previousPrice
      ? new Big(
          await this.exchangeRateDataService.toCurrencyAtDate(
            previousPrice?.toNumber() ?? 0,
            this.getCurrency(holding),
            this.currency,
            parseDate(previousDate)
          )
        )
      : new Big(0);
    const portfolioWeight = totalInvestment.toNumber()
      ? previousHolding.mul(previousPriceInBaseCurrency).div(totalInvestment)
      : new Big(0);

    netPerformanceInPercentage = netPerformanceInPercentage.plus(
      currentPrice.div(previousPrice).minus(1).mul(portfolioWeight)
    );

    netPerformanceInPercentageWithCurrencyEffect =
      netPerformanceInPercentageWithCurrencyEffect.plus(
        priceInBaseCurrency
          .div(previousPriceInBaseCurrency)
          .minus(1)
          .mul(portfolioWeight)
      );

    newTotalInvestment = newTotalInvestment.plus(
      timelineHoldings[date][holding].mul(priceInBaseCurrency)
    );
    return {
      netPerformanceInPercentage,
      netPerformanceInPercentageWithCurrencyEffect,
      newTotalInvestment
    };
  }

  @LogPerformance
  protected getCurrency(symbol: string) {
    return this.getCurrencyFromActivities(this.activities, symbol);
  }

  @LogPerformance
  protected getCurrencyFromActivities(
    activities: PortfolioOrder[],
    symbol: string
  ) {
    if (!this.holdingCurrencies[symbol]) {
      this.holdingCurrencies[symbol] = activities.find(
        (a) => a.SymbolProfile.symbol === symbol
      ).SymbolProfile.currency;
    }

    return this.holdingCurrencies[symbol];
  }

  @LogPerformance
  protected async getHoldings(
    activities: PortfolioOrder[],
    start: Date,
    end: Date
  ) {
    if (
      this.holdings &&
      Object.keys(this.holdings).some((h) =>
        isAfter(parseDate(h), subDays(end, 1))
      ) &&
      Object.keys(this.holdings).some((h) =>
        isBefore(parseDate(h), addDays(start, 1))
      )
    ) {
      return this.holdings;
    }

    this.computeHoldings(activities, start, end);
    return this.holdings;
  }

  @LogPerformance
  protected async computeHoldings(
    activities: PortfolioOrder[],
    start: Date,
    end: Date
  ) {
    const investmentByDate = this.getInvestmentByDate(activities);
    this.calculateHoldings(investmentByDate, start, end);
  }

  private calculateHoldings(
    investmentByDate: { [date: string]: PortfolioOrder[] },
    start: Date,
    end: Date
  ) {
    const transactionDates = Object.keys(investmentByDate).sort();
    let dates = eachDayOfInterval({ start, end }, { step: 1 })
      .map((date) => {
        return resetHours(date);
      })
      .sort((a, b) => a.getTime() - b.getTime());
    let currentHoldings: { [date: string]: { [symbol: string]: Big } } = {};

    this.calculateInitialHoldings(investmentByDate, start, currentHoldings);

    for (let i = 1; i < dates.length; i++) {
      const dateString = format(dates[i], DATE_FORMAT);
      const previousDateString = format(dates[i - 1], DATE_FORMAT);
      if (transactionDates.some((d) => d === dateString)) {
        let holdings = { ...currentHoldings[previousDateString] };
        investmentByDate[dateString].forEach((trade) => {
          holdings[trade.SymbolProfile.symbol] ??= new Big(0);
          holdings[trade.SymbolProfile.symbol] = holdings[
            trade.SymbolProfile.symbol
          ].plus(trade.quantity.mul(getFactor(trade.type)));
        });
        currentHoldings[dateString] = holdings;
      } else {
        currentHoldings[dateString] = currentHoldings[previousDateString];
      }
    }

    this.holdings = currentHoldings;
  }

  @LogPerformance
  protected calculateInitialHoldings(
    investmentByDate: { [date: string]: PortfolioOrder[] },
    start: Date,
    currentHoldings: { [date: string]: { [symbol: string]: Big } }
  ) {
    const preRangeTrades = Object.keys(investmentByDate)
      .filter((date) => resetHours(new Date(date)) <= start)
      .map((date) => investmentByDate[date])
      .reduce((a, b) => a.concat(b), [])
      .reduce((groupBySymbol, trade) => {
        if (!groupBySymbol[trade.SymbolProfile.symbol]) {
          groupBySymbol[trade.SymbolProfile.symbol] = [];
        }

        groupBySymbol[trade.SymbolProfile.symbol].push(trade);

        return groupBySymbol;
      }, {});

    currentHoldings[format(start, DATE_FORMAT)] = {};

    for (const symbol of Object.keys(preRangeTrades)) {
      const trades: PortfolioOrder[] = preRangeTrades[symbol];
      let startQuantity = trades.reduce((sum, trade) => {
        return sum.plus(trade.quantity.mul(getFactor(trade.type)));
      }, new Big(0));
      currentHoldings[format(start, DATE_FORMAT)][symbol] = startQuantity;
    }
  }

  @LogPerformance
  protected getInvestmentByDate(activities: PortfolioOrder[]): {
    [date: string]: PortfolioOrder[];
  } {
    return activities.reduce((groupedByDate, order) => {
      if (!groupedByDate[order.date]) {
        groupedByDate[order.date] = [];
      }

      groupedByDate[order.date].push(order);

      return groupedByDate;
    }, {});
  }

  @LogPerformance
  protected mapToDataGatheringItems(
    orders: PortfolioOrder[]
  ): IDataGatheringItem[] {
    return orders
      .map((activity) => {
        return {
          symbol: activity.SymbolProfile.symbol,
          dataSource: activity.SymbolProfile.dataSource
        };
      })
      .filter(
        (gathering, i, arr) =>
          arr.findIndex((t) => t.symbol === gathering.symbol) === i
      );
  }

  @LogPerformance
  protected async computeMarketMap(dateQuery: DateQuery): Promise<{
    [date: string]: { [symbol: string]: Big };
  }> {
    const dataGatheringItems: IDataGatheringItem[] =
      this.mapToDataGatheringItems(this.activities);
    const { values: marketSymbols } = await this.currentRateService.getValues({
      dataGatheringItems,
      dateQuery
    });

    const marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    } = {};

    for (const marketSymbol of marketSymbols) {
      const date = format(marketSymbol.date, DATE_FORMAT);

      if (!marketSymbolMap[date]) {
        marketSymbolMap[date] = {};
      }

      if (marketSymbol.marketPrice) {
        marketSymbolMap[date][marketSymbol.symbol] = new Big(
          marketSymbol.marketPrice
        );
      }
    }

    return marketSymbolMap;
  }

  @LogPerformance
  protected activitiesToPortfolioOrder(
    activities: Activity[]
  ): PortfolioOrder[] {
    return activities
      .map(
        ({
          date,
          fee,
          quantity,
          SymbolProfile,
          tags = [],
          type,
          unitPrice
        }) => {
          if (isAfter(date, new Date(Date.now()))) {
            // Adapt date to today if activity is in future (e.g. liability)
            // to include it in the interval
            date = endOfDay(new Date(Date.now()));
          }

          return {
            SymbolProfile,
            tags,
            type,
            date: format(date, DATE_FORMAT),
            fee: new Big(fee),
            quantity: new Big(quantity),
            unitPrice: new Big(unitPrice)
          };
        }
      )
      .sort((a, b) => {
        return a.date?.localeCompare(b.date);
      });
  }
}
