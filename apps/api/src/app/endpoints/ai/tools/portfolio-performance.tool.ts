import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';

import { subDays } from 'date-fns';
import { tool } from 'ai';
import { z } from 'zod';

export function getPortfolioPerformanceTool(deps: {
  dataProviderService: DataProviderService;
  prismaService: PrismaService;
  userId: string;
}) {
  return tool({
    description:
      "Get the user's portfolio performance including total return, net performance percentage, and current net worth. Supports date-range filtering: 1d (today), wtd (week-to-date), mtd (month-to-date), ytd (year-to-date), 1y (1 year), 5y (5 years), max (all-time).",
    parameters: z.object({
      dateRange: z
        .enum(["1d", "mtd", "wtd", "ytd", "1y", "5y", "max"])
        .optional()
        .default("max")
        .describe(
          'Time period: "ytd" for year-to-date, "1y" for last year, "5y" for 5 years, "mtd" for month-to-date, "wtd" for week-to-date, "1d" for today, "max" for all-time'
        )
    }),
    execute: async ({ dateRange }) => {
      // Get all orders for this user with their symbol profiles
      const orders = await deps.prismaService.order.findMany({
        where: { userId: deps.userId },
        select: {
          type: true,
          quantity: true,
          unitPrice: true,
          date: true,
          symbolProfileId: true
        }
      });

      // Get all symbol profiles referenced by orders
      const profileIds = [...new Set(orders.map((o) => o.symbolProfileId))];
      const profiles = await deps.prismaService.symbolProfile.findMany({
        where: { id: { in: profileIds } },
        select: {
          id: true,
          symbol: true,
          dataSource: true,
          name: true,
          currency: true
        }
      });
      const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

      if (dateRange === "max") {
        return computeAllTimePerformance(deps, orders, profileMap);
      }

      return computePeriodPerformance(deps, orders, profileMap, dateRange);
    }
  });
}

async function computeAllTimePerformance(
  deps: { dataProviderService: DataProviderService },
  orders: {
    type: string;
    quantity: number;
    unitPrice: number;
    symbolProfileId: string;
  }[],
  profileMap: Record<
    string,
    {
      id: string;
      symbol: string;
      dataSource: any;
      name: string;
      currency: string;
    }
  >
) {
  const positionMap: Record<
    string,
    {
      quantity: number;
      totalCost: number;
      symbol: string;
      dataSource: any;
      name: string;
    }
  > = {};

  for (const order of orders) {
    const profile = profileMap[order.symbolProfileId];
    if (!profile) continue;
    const sym = profile.symbol;
    if (!positionMap[sym]) {
      positionMap[sym] = {
        quantity: 0,
        totalCost: 0,
        symbol: sym,
        dataSource: profile.dataSource,
        name: profile.name
      };
    }
    if (order.type === "BUY") {
      positionMap[sym].quantity += order.quantity;
      positionMap[sym].totalCost += order.quantity * order.unitPrice;
    } else if (order.type === "SELL") {
      positionMap[sym].quantity -= order.quantity;
      positionMap[sym].totalCost -= order.quantity * order.unitPrice;
    }
  }

  const activePositions = Object.values(positionMap).filter(
    (p) => p.quantity > 0
  );

  if (activePositions.length === 0) {
    return {
      performance: {
        currentNetWorth: 0,
        totalInvestment: 0,
        netPerformance: 0,
        netPerformancePercentage: "0.00%"
      },
      holdings: []
    };
  }

  const items = activePositions.map((p) => ({
    dataSource: p.dataSource,
    symbol: p.symbol
  }));

  const quotes = await deps.dataProviderService.getQuotes({ items });

  let totalInvestment = 0;
  let currentValue = 0;
  const holdingPerformance = [];

  for (const pos of activePositions) {
    const quote = quotes[pos.symbol];
    const currentPrice = quote?.marketPrice ?? 0;
    const posValue = pos.quantity * currentPrice;
    const posCost = pos.totalCost;
    const posGain = posValue - posCost;
    const posGainPct = posCost > 0 ? (posGain / posCost) * 100 : 0;

    totalInvestment += posCost;
    currentValue += posValue;

    holdingPerformance.push({
      symbol: pos.symbol,
      name: pos.name,
      quantity: pos.quantity,
      avgCostPerShare: +(posCost / pos.quantity).toFixed(2),
      currentPrice: +currentPrice.toFixed(2),
      investedValue: +posCost.toFixed(2),
      currentValue: +posValue.toFixed(2),
      gain: +posGain.toFixed(2),
      gainPercentage: `${posGainPct.toFixed(2)}%`
    });
  }

  const netPerformance = currentValue - totalInvestment;
  const netPerformancePercentage =
    totalInvestment > 0 ? (netPerformance / totalInvestment) * 100 : 0;

  return {
    performance: {
      currentNetWorth: +currentValue.toFixed(2),
      totalInvestment: +totalInvestment.toFixed(2),
      netPerformance: +netPerformance.toFixed(2),
      netPerformancePercentage: `${netPerformancePercentage.toFixed(2)}%`
    },
    holdings: holdingPerformance
  };
}

async function computePeriodPerformance(
  deps: {
    dataProviderService: DataProviderService;
    prismaService: PrismaService;
  },
  orders: {
    type: string;
    quantity: number;
    unitPrice: number;
    date: Date;
    symbolProfileId: string;
  }[],
  profileMap: Record<
    string,
    {
      id: string;
      symbol: string;
      dataSource: any;
      name: string;
      currency: string;
    }
  >,
  dateRange: "1d" | "mtd" | "wtd" | "ytd" | "1y" | "5y"
) {
  const { startDate, endDate } = getIntervalFromDateRange(dateRange);

  // Partition orders into before-period and during-period
  const ordersBeforePeriod = orders.filter(
    (o) => new Date(o.date) < startDate
  );
  const ordersDuringPeriod = orders.filter(
    (o) => new Date(o.date) >= startDate && new Date(o.date) <= endDate
  );

  // Build positions at start of period from orders before period
  const startPositions: Record<
    string,
    {
      quantity: number;
      costBasis: number;
      symbol: string;
      dataSource: any;
      name: string;
    }
  > = {};

  for (const order of ordersBeforePeriod) {
    const profile = profileMap[order.symbolProfileId];
    if (!profile) continue;
    const sym = profile.symbol;
    if (!startPositions[sym]) {
      startPositions[sym] = {
        quantity: 0,
        costBasis: 0,
        symbol: sym,
        dataSource: profile.dataSource,
        name: profile.name
      };
    }
    if (order.type === "BUY") {
      startPositions[sym].quantity += order.quantity;
      startPositions[sym].costBasis += order.quantity * order.unitPrice;
    } else if (order.type === "SELL") {
      startPositions[sym].quantity -= order.quantity;
      startPositions[sym].costBasis -= order.quantity * order.unitPrice;
    }
  }

  const activeStartPositions = Object.values(startPositions).filter(
    (p) => p.quantity > 0
  );

  // Fetch historical prices from the data provider (Yahoo Finance) for the
  // period start date. Use a 7-day window to account for weekends/holidays.
  const startPriceMap: Record<string, number> = {};

  if (activeStartPositions.length > 0) {
    const items = activeStartPositions.map((p) => ({
      dataSource: p.dataSource,
      symbol: p.symbol
    }));

    const historicalData = await deps.dataProviderService.getHistoricalRaw({
      assetProfileIdentifiers: items,
      from: subDays(startDate, 7),
      to: startDate
    });

    for (const pos of activeStartPositions) {
      const symbolData = historicalData[pos.symbol];
      if (symbolData) {
        // Get the most recent price in the window (closest to startDate)
        const dates = Object.keys(symbolData).sort();
        const latestDate = dates[dates.length - 1];
        if (latestDate && symbolData[latestDate]?.marketPrice != null) {
          startPriceMap[pos.symbol] = Number(
            symbolData[latestDate].marketPrice
          );
        }
      }
    }
  }

  // Compute startValue using historical prices, with cost-basis fallback
  let startValue = 0;
  const warnings: string[] = [];

  for (const pos of activeStartPositions) {
    const historicalPrice = startPriceMap[pos.symbol];
    if (historicalPrice != null) {
      startValue += pos.quantity * historicalPrice;
    } else {
      startValue += pos.costBasis;
      warnings.push(
        `No historical price found for ${pos.symbol} at period start; using cost basis as fallback.`
      );
    }
  }

  // Apply orders during period to get end positions and track net cash flows
  const endPositions: Record<
    string,
    { quantity: number; symbol: string; dataSource: any; name: string }
  > = {};

  for (const pos of activeStartPositions) {
    endPositions[pos.symbol] = {
      quantity: pos.quantity,
      symbol: pos.symbol,
      dataSource: pos.dataSource,
      name: pos.name
    };
  }

  let netCashFlow = 0;

  for (const order of ordersDuringPeriod) {
    const profile = profileMap[order.symbolProfileId];
    if (!profile) continue;
    const sym = profile.symbol;
    if (!endPositions[sym]) {
      endPositions[sym] = {
        quantity: 0,
        symbol: sym,
        dataSource: profile.dataSource,
        name: profile.name
      };
    }
    if (order.type === "BUY") {
      endPositions[sym].quantity += order.quantity;
      netCashFlow += order.quantity * order.unitPrice;
    } else if (order.type === "SELL") {
      endPositions[sym].quantity -= order.quantity;
      netCashFlow -= order.quantity * order.unitPrice;
    }
  }

  // Get current prices for end positions
  const activeEndPositions = Object.values(endPositions).filter(
    (p) => p.quantity > 0
  );

  if (activeEndPositions.length === 0 && activeStartPositions.length === 0) {
    return {
      dateRange,
      periodStart: startDate.toISOString().split("T")[0],
      periodEnd: endDate.toISOString().split("T")[0],
      performance: {
        startValue: 0,
        endValue: 0,
        netCashFlow: 0,
        periodGain: 0,
        periodGainPercentage: "0.00%"
      },
      holdings: []
    };
  }

  let endValue = 0;
  const holdingPerformance = [];

  if (activeEndPositions.length > 0) {
    const items = activeEndPositions.map((p) => ({
      dataSource: p.dataSource,
      symbol: p.symbol
    }));
    const quotes = await deps.dataProviderService.getQuotes({ items });

    for (const pos of activeEndPositions) {
      const quote = quotes[pos.symbol];
      const currentPrice = quote?.marketPrice ?? 0;
      const posValue = pos.quantity * currentPrice;
      endValue += posValue;

      holdingPerformance.push({
        symbol: pos.symbol,
        name: pos.name,
        quantity: pos.quantity,
        currentPrice: +currentPrice.toFixed(2),
        currentValue: +posValue.toFixed(2)
      });
    }
  }

  const periodGain = endValue - startValue - netCashFlow;
  const denominator = startValue > 0 ? startValue : Math.abs(netCashFlow);
  const periodGainPercentage =
    denominator > 0 ? (periodGain / denominator) * 100 : 0;

  const result: Record<string, any> = {
    dateRange,
    periodStart: startDate.toISOString().split("T")[0],
    periodEnd: endDate.toISOString().split("T")[0],
    performance: {
      startValue: +startValue.toFixed(2),
      endValue: +endValue.toFixed(2),
      netCashFlow: +netCashFlow.toFixed(2),
      periodGain: +periodGain.toFixed(2),
      periodGainPercentage: `${periodGainPercentage.toFixed(2)}%`
    },
    holdings: holdingPerformance
  };

  if (warnings.length > 0) {
    result.warnings = warnings;
  }

  return result;
}
