import { getFactor } from '@ghostfolio/api/helper/portfolio.helper';
import { DATE_FORMAT, parseDate, resetHours } from '@ghostfolio/common/helper';
import {
  HistoricalDataItem,
  SymbolMetrics,
  UniqueAsset
} from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot, TimelinePosition } from '@ghostfolio/common/models';

import { Big } from 'big.js';
import { addDays, eachDayOfInterval, format } from 'date-fns';

import { PortfolioOrder } from '../../interfaces/portfolio-order.interface';
import { TWRPortfolioCalculator } from '../twr/portfolio-calculator';

export class CPRPortfolioCalculator extends TWRPortfolioCalculator {
  private holdings: { [date: string]: { [symbol: string]: Big } } = {};
  private holdingCurrencies: { [symbol: string]: string } = {};

  protected calculateOverallPerformance(
    positions: TimelinePosition[]
  ): PortfolioSnapshot {
    return super.calculateOverallPerformance(positions);
  }

  protected getSymbolMetrics({
    dataSource,
    end,
    exchangeRates,
    isChartMode = false,
    marketSymbolMap,
    start,
    step = 1,
    symbol
  }: {
    end: Date;
    exchangeRates: { [dateString: string]: number };
    isChartMode?: boolean;
    marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    };
    start: Date;
    step?: number;
  } & UniqueAsset): SymbolMetrics {
    return super.getSymbolMetrics({
      dataSource,
      end,
      exchangeRates,
      isChartMode,
      marketSymbolMap,
      start,
      step,
      symbol
    });
  }

  public override async getChartData({
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
            this.marketMap[startString][holding]
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

  private getCurrency(symbol: string) {
    if (!this.holdingCurrencies[symbol]) {
      this.holdingCurrencies[symbol] = this.activities.find(
        (a) => a.SymbolProfile.symbol === symbol
      ).SymbolProfile.currency;
    }

    return this.holdingCurrencies[symbol];
  }

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
