import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { tool } from 'ai';
import { z } from 'zod';

export function getPortfolioPerformanceTool(deps: {
  dataProviderService: DataProviderService;
  prismaService: PrismaService;
  userId: string;
}) {
  return tool({
    description:
      "Get the user's portfolio performance including total return, net performance percentage, and current net worth",
    parameters: z.object({}),
    execute: async () => {
      // Get all orders for this user with their symbol profiles
      const orders = await deps.prismaService.order.findMany({
        where: { userId: deps.userId },
        select: {
          type: true,
          quantity: true,
          unitPrice: true,
          symbolProfileId: true
        }
      });

      // Get all symbol profiles referenced by orders
      const profileIds = [...new Set(orders.map(o => o.symbolProfileId))];
      const profiles = await deps.prismaService.symbolProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, symbol: true, dataSource: true, name: true, currency: true }
      });
      const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));

      // Compute cost basis from BUY orders and subtract SELL proceeds
      const positionMap: Record<string, { quantity: number; totalCost: number; symbol: string; dataSource: any; name: string }> = {};

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
        if (order.type === 'BUY') {
          positionMap[sym].quantity += order.quantity;
          positionMap[sym].totalCost += order.quantity * order.unitPrice;
        } else if (order.type === 'SELL') {
          positionMap[sym].quantity -= order.quantity;
          positionMap[sym].totalCost -= order.quantity * order.unitPrice;
        }
      }

      // Filter to positions with quantity > 0
      const activePositions = Object.values(positionMap).filter(p => p.quantity > 0);

      if (activePositions.length === 0) {
        return {
          performance: {
            currentNetWorth: 0,
            totalInvestment: 0,
            netPerformance: 0,
            netPerformancePercentage: '0.00%'
          },
          holdings: []
        };
      }

      // Get current market prices
      const items = activePositions.map(p => ({
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
      const netPerformancePercentage = totalInvestment > 0
        ? (netPerformance / totalInvestment) * 100
        : 0;

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
  });
}
