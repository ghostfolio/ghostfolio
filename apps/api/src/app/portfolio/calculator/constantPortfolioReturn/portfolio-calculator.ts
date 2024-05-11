import { LogPerformance } from '@ghostfolio/api/aop/logging.interceptor';
import {
  getFactor,
  getInterval
} from '@ghostfolio/api/helper/portfolio.helper';
import { MAX_CHART_ITEMS } from '@ghostfolio/common/config';
import { DATE_FORMAT, parseDate, resetHours } from '@ghostfolio/common/helper';
import { HistoricalDataItem } from '@ghostfolio/common/interfaces';
import { DateRange } from '@ghostfolio/common/types';

import { Big } from 'big.js';
import { addDays, differenceInDays, eachDayOfInterval, format } from 'date-fns';

import { PortfolioOrder } from '../../interfaces/portfolio-order.interface';
import { TWRPortfolioCalculator } from '../twr/portfolio-calculator';

export class CPRPortfolioCalculator extends TWRPortfolioCalculator {
  private holdings: { [date: string]: { [symbol: string]: Big } } = {};
  private holdingCurrencies: { [symbol: string]: string } = {};

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
    const { endDate, startDate } = getInterval(dateRange, this.getStartDate());

    const daysInMarket = differenceInDays(endDate, startDate) + 1;
    const step = withDataDecimation
      ? Math.round(daysInMarket / Math.min(daysInMarket, MAX_CHART_ITEMS))
      : 1;

    let item = super.getChartData({
      step,
      end: endDate,
      start: startDate
    });

    if (!withTimeWeightedReturn) {
      return item;
    }

    if (withTimeWeightedReturn) {
      let timeWeighted = await this.getTimeWeightedChartData({
        step,
        end: endDate,
        start: startDate
      });

      return item.then((data) => {
        return data.map((item) => {
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
      });
    }

    return item;
  }

  @LogPerformance
  private async getTimeWeightedChartData({
    end = new Date(Date.now()),
    start,
    step = 1
  }: {
    end?: Date;
    start: Date;
    step?: number;
  }): Promise<HistoricalDataItem[]> {
    const timelineHoldings = this.getHoldings(start, end);
    const calculationDates = Object.keys(timelineHoldings)
      .filter((date) => {
        let parsed = parseDate(date);
        parsed >= start && parsed <= end;
      })
      .sort();
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

    for (let i = 1; i < calculationDates.length; i++) {
      const date = calculationDates[i];
      const previousDate = calculationDates[i - 1];
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
        totalInvestment = newTotalInvestment;
      }

      previousNetPerformanceInPercentage =
        previousNetPerformanceInPercentage.mul(
          netPerformanceInPercentage.plus(1)
        );
      previousNetPerformanceInPercentageWithCurrencyEffect =
        previousNetPerformanceInPercentageWithCurrencyEffect.mul(
          netPerformanceInPercentageWithCurrencyEffect.plus(1)
        );

      data.push({
        date,
        netPerformanceInPercentage:
          previousNetPerformanceInPercentage.toNumber(),
        netPerformanceInPercentageWithCurrencyEffect:
          previousNetPerformanceInPercentageWithCurrencyEffect.toNumber()
      });
    }

    return data;
  }

  @LogPerformance
  private async handleSingleHolding(
    previousDate: string,
    holding: string,
    date: string,
    totalInvestment,
    timelineHoldings: { [date: string]: { [symbol: string]: Big } },
    netPerformanceInPercentage,
    netPerformanceInPercentageWithCurrencyEffect,
    newTotalInvestment
  ) {
    const previousPrice = this.marketMap[previousDate][holding];
    const currentPrice = this.marketMap[date][holding];
    const previousPriceInBaseCurrency =
      await this.exchangeRateDataService.toCurrencyAtDate(
        previousPrice.toNumber(),
        this.getCurrency(holding),
        this.currency,
        parseDate(previousDate)
      );
    const portfolioWeight = totalInvestment
      ? timelineHoldings[previousDate][holding]
          .mul(previousPriceInBaseCurrency)
          .div(totalInvestment)
      : 0;

    netPerformanceInPercentage = netPerformanceInPercentage.plus(
      currentPrice.div(previousPrice).minus(1).mul(portfolioWeight)
    );

    const priceInBaseCurrency =
      await this.exchangeRateDataService.toCurrencyAtDate(
        currentPrice.toNumber(),
        this.getCurrency(holding),
        this.currency,
        parseDate(date)
      );
    netPerformanceInPercentageWithCurrencyEffect =
      netPerformanceInPercentageWithCurrencyEffect.plus(
        new Big(priceInBaseCurrency)
          .div(new Big(previousPriceInBaseCurrency))
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
  private getCurrency(symbol: string) {
    if (!this.holdingCurrencies[symbol]) {
      this.holdingCurrencies[symbol] = this.activities.find(
        (a) => a.SymbolProfile.symbol === symbol
      ).SymbolProfile.currency;
    }

    return this.holdingCurrencies[symbol];
  }

  @LogPerformance
  private getHoldings(start: Date, end: Date) {
    if (
      this.holdings &&
      Object.keys(this.holdings).some((h) => parseDate(h) >= end) &&
      Object.keys(this.holdings).some((h) => parseDate(h) <= start)
    ) {
      return this.holdings;
    }

    this.computeHoldings(start, end);
    return this.holdings;
  }

  @LogPerformance
  private computeHoldings(start: Date, end: Date) {
    const investmentByDate = this.getInvestmentByDate();
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
  private calculateInitialHoldings(
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
  private getInvestmentByDate(): { [date: string]: PortfolioOrder[] } {
    return this.activities.reduce((groupedByDate, order) => {
      if (!groupedByDate[order.date]) {
        groupedByDate[order.date] = [];
      }

      groupedByDate[order.date].push(order);

      return groupedByDate;
    }, {});
  }
}
