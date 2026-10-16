import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PortfolioPosition } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';
import { InvestmentPlanAllocation, SignalType } from '@prisma/client';

export interface RebalancingAction {
  amount: number;
  currentWeight: number;
  currentValue: number;
  deviation: number;
  groupId: string;
  name: string;
  reason: string;
  symbols: string[];
  targetWeight: number;
  type: 'BUY' | 'SELL' | 'OK';
}

/**
 * The actual market value set against the Long-term Growth Target of the plan
 * (see docs/dev/notes/capital-pool.md). It is information beside the weights,
 * not their base: the weights and the buy/sell amounts always refer to what is
 * actually held, so the weights of a fully assigned portfolio add up to 100%.
 */
export interface CapitalStatus {
  actual: number;
  /** target - actual: positive = still to deploy, negative = above target */
  gap: number;
  reason: string;
  status: 'ABOVE_TARGET' | 'BELOW_TARGET' | 'ON_TARGET' | 'UNSET';
  target: number;
}

export interface RebalancingResult {
  actions: RebalancingAction[];
  capital: CapitalStatus;
  hasTriggered: boolean;
  /** Actual market value of the holdings, the base of all weights */
  totalValue: number;
}

/**
 * `getDetails` returns the holdings as a list. Rebalancing works on the value
 * per symbol; the same symbol held under two data sources adds up.
 */
export function toHoldingValuesBySymbol(
  holdings: Pick<PortfolioPosition, 'assetProfile' | 'valueInBaseCurrency'>[]
): { [symbol: string]: Pick<PortfolioPosition, 'valueInBaseCurrency'> } {
  const valuesBySymbol: {
    [symbol: string]: Pick<PortfolioPosition, 'valueInBaseCurrency'>;
  } = {};

  for (const { assetProfile, valueInBaseCurrency } of holdings ?? []) {
    const symbol = assetProfile.symbol;

    valuesBySymbol[symbol] = {
      valueInBaseCurrency:
        (valuesBySymbol[symbol]?.valueInBaseCurrency ?? 0) +
        (valueInBaseCurrency ?? 0)
    };
  }

  return valuesBySymbol;
}

@Injectable()
export class RebalancingService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async calculateRebalancing(
    allocations: InvestmentPlanAllocation[],
    holdings: {
      [symbol: string]: Pick<PortfolioPosition, 'valueInBaseCurrency'>;
    },
    longTermGrowthTarget = 0
  ): Promise<RebalancingResult> {
    const totalValue = Object.values(holdings).reduce(
      (sum, h) => sum + (h.valueInBaseCurrency ?? 0),
      0
    );
    const capital = this.buildCapitalStatus(totalValue, longTermGrowthTarget);

    if (!allocations.length || totalValue === 0) {
      return { actions: [], capital, hasTriggered: false, totalValue: 0 };
    }

    const actions: RebalancingAction[] = [];
    let hasTriggered = false;

    const groups = new Map<string, InvestmentPlanAllocation[]>();
    for (const allocation of allocations) {
      const group = groups.get(allocation.groupId) ?? [];
      group.push(allocation);
      groups.set(allocation.groupId, group);
    }

    for (const [groupId, group] of groups) {
      const { targetWeight, rebalanceThreshold } = group[0];
      const symbols = group.map(({ symbol }) => symbol);
      const name = group[0].name || symbols.join(', ');

      const currentValue = symbols.reduce(
        (sum, symbol) => sum + (holdings[symbol]?.valueInBaseCurrency ?? 0),
        0
      );
      const currentWeight = (currentValue / totalValue) * 100;
      const deviation = currentWeight - targetWeight;
      const adjustmentValue =
        (totalValue * (targetWeight - currentWeight)) / 100;

      let type: 'BUY' | 'SELL' | 'OK' = 'OK';
      if (Math.abs(deviation) >= rebalanceThreshold) {
        type = adjustmentValue > 0 ? 'BUY' : 'SELL';
        hasTriggered = true;
      }

      actions.push({
        amount: Math.abs(adjustmentValue),
        currentValue,
        currentWeight,
        deviation,
        groupId,
        name,
        reason: this.buildReason(name, currentWeight, targetWeight, deviation),
        symbols,
        targetWeight,
        type
      });
    }

    return { actions, capital, hasTriggered, totalValue };
  }

  public async generateRebalancingSignals(
    planId: string,
    allocations: InvestmentPlanAllocation[],
    holdings: {
      [symbol: string]: Pick<PortfolioPosition, 'valueInBaseCurrency'>;
    },
    longTermGrowthTarget = 0
  ): Promise<void> {
    const result = await this.calculateRebalancing(
      allocations,
      holdings,
      longTermGrowthTarget
    );
    if (!result.hasTriggered) return;

    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    for (const action of result.actions) {
      if (action.type === 'OK') continue;

      const symbol = action.symbols.join(', ');

      const existing = await this.prismaService.investmentSignal.findFirst({
        where: {
          date: { gte: startOfWeek },
          planId,
          symbol,
          type:
            action.type === 'BUY'
              ? SignalType.REBALANCE_BUY
              : SignalType.REBALANCE_SELL
        }
      });
      if (existing) continue;

      await this.prismaService.investmentSignal.create({
        data: {
          amount: action.amount,
          date: new Date(),
          planId,
          reason: action.reason,
          symbol,
          type:
            action.type === 'BUY'
              ? SignalType.REBALANCE_BUY
              : SignalType.REBALANCE_SELL
        }
      });
    }
  }

  private buildCapitalStatus(actual: number, target: number): CapitalStatus {
    if (!(target > 0)) {
      return { actual, gap: 0, reason: '', status: 'UNSET', target: 0 };
    }

    const gap = target - actual;
    const money = (value: number) =>
      Math.round(Math.abs(value)).toLocaleString('en-US');

    // Within 0.5% of the target counts as on target
    if (Math.abs(gap) <= target * 0.005) {
      return {
        actual,
        gap,
        reason: 'Holdings are on the target capital',
        status: 'ON_TARGET',
        target
      };
    }

    return gap > 0
      ? {
          actual,
          gap,
          reason: `${money(gap)} of the ${money(target)} target capital is not deployed yet`,
          status: 'BELOW_TARGET',
          target
        }
      : {
          actual,
          gap,
          reason: `Holdings are ${money(gap)} above the ${money(target)} target capital; consider selling that part to lower the risk`,
          status: 'ABOVE_TARGET',
          target
        };
  }

  private buildReason(
    symbol: string,
    current: number,
    target: number,
    deviation: number
  ): string {
    const dir = deviation > 0 ? 'overweight' : 'underweight';
    return `${symbol} is ${dir} by ${Math.abs(deviation).toFixed(1)}% (current ${current.toFixed(1)}%, target ${target.toFixed(1)}%)`;
  }
}
