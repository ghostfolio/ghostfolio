import Big from 'big.js';

export interface CashFlow {
  amount: number;
  date: Date;
}

export interface PerformanceMetrics {
  dpi: number;
  irr: number | null;
  periodicReturns: PeriodReturn[];
  rvpi: number;
  tvpi: number;
}

export interface PeriodReturn {
  endDate: string;
  endValue: number;
  return: number;
  startDate: string;
  startValue: number;
}

/**
 * Family Office Performance Calculator
 *
 * Computes:
 * - XIRR (IRR) using Newton-Raphson iteration with big.js
 * - TVPI: (distributions + NAV) / contributed
 * - DPI: distributions / contributed
 * - RVPI: NAV / contributed
 * - Modified Dietz periodic returns
 */
export class FamilyOfficePerformanceCalculator {
  /**
   * Compute DPI (Distributions to Paid-In)
   * DPI = total distributions / total contributions
   */
  public static computeDPI(
    totalDistributions: number,
    totalContributions: number
  ): number {
    if (totalContributions === 0) {
      return 0;
    }

    return new Big(totalDistributions)
      .div(totalContributions)
      .round(4)
      .toNumber();
  }

  /**
   * Compute Modified Dietz returns for a set of periods.
   * Each period: start value, end value, and cash flows within the period.
   */
  public static computeModifiedDietzReturns(
    periods: {
      cashFlows: CashFlow[];
      endDate: Date;
      endValue: number;
      startDate: Date;
      startValue: number;
    }[]
  ): PeriodReturn[] {
    return periods.map((period) => {
      const totalDays = this.daysBetween(period.startDate, period.endDate);

      if (totalDays === 0) {
        return {
          endDate: period.endDate.toISOString().split('T')[0],
          endValue: period.endValue,
          return: 0,
          startDate: period.startDate.toISOString().split('T')[0],
          startValue: period.startValue
        };
      }

      // Weighted cash flows
      let weightedFlows = new Big(0);
      let totalFlows = new Big(0);

      for (const cf of period.cashFlows) {
        const daysRemaining = this.daysBetween(cf.date, period.endDate);
        const weight = new Big(daysRemaining).div(totalDays);
        const amount = new Big(cf.amount);
        weightedFlows = weightedFlows.plus(amount.times(weight));
        totalFlows = totalFlows.plus(amount);
      }

      const startVal = new Big(period.startValue);
      const endVal = new Big(period.endValue);

      const denominator = startVal.plus(weightedFlows);

      if (denominator.eq(0)) {
        return {
          endDate: period.endDate.toISOString().split('T')[0],
          endValue: period.endValue,
          return: 0,
          startDate: period.startDate.toISOString().split('T')[0],
          startValue: period.startValue
        };
      }

      const periodReturn = endVal
        .minus(startVal)
        .minus(totalFlows)
        .div(denominator)
        .round(6)
        .toNumber();

      return {
        endDate: period.endDate.toISOString().split('T')[0],
        endValue: period.endValue,
        return: periodReturn,
        startDate: period.startDate.toISOString().split('T')[0],
        startValue: period.startValue
      };
    });
  }

  /**
   * Compute RVPI (Residual Value to Paid-In)
   * RVPI = current NAV / total contributions
   */
  public static computeRVPI(
    currentNAV: number,
    totalContributions: number
  ): number {
    if (totalContributions === 0) {
      return 0;
    }

    return new Big(currentNAV).div(totalContributions).round(4).toNumber();
  }

  /**
   * Compute TVPI (Total Value to Paid-In)
   * TVPI = (distributions + current NAV) / total contributions
   */
  public static computeTVPI(
    totalDistributions: number,
    currentNAV: number,
    totalContributions: number
  ): number {
    if (totalContributions === 0) {
      return 0;
    }

    return new Big(totalDistributions)
      .plus(currentNAV)
      .div(totalContributions)
      .round(4)
      .toNumber();
  }

  /**
   * Compute XIRR using Newton-Raphson iteration.
   * Cash flows are (date, amount) pairs where:
   * - Negative amounts are contributions (outflows)
   * - Positive amounts are distributions (inflows)
   * The final NAV is added as a positive cash flow at the end date.
   *
   * Returns annualized IRR as a decimal (e.g. 0.12 = 12%), or null if
   * the method does not converge.
   */
  public static computeXIRR(cashFlows: CashFlow[]): number | null {
    if (cashFlows.length < 2) {
      return null;
    }

    const sortedFlows = [...cashFlows].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    const firstDate = sortedFlows[0].date;

    // Convert to years from first date
    const flows = sortedFlows.map((cf) => ({
      amount: new Big(cf.amount),
      years: new Big(this.daysBetween(firstDate, cf.date)).div(365.25)
    }));

    // Newton-Raphson
    let rate = new Big(0.1); // initial guess 10%
    const maxIterations = 100;
    const tolerance = new Big(1e-7);

    for (let i = 0; i < maxIterations; i++) {
      let npv = new Big(0);
      let dnpv = new Big(0);

      for (const flow of flows) {
        const base = new Big(1).plus(rate);

        if (base.lte(0)) {
          // Avoid invalid base
          rate = rate.plus(0.1);
          continue;
        }

        const exponent = flow.years.toNumber();
        const discountFactor = Math.pow(base.toNumber(), -exponent);
        const df = new Big(discountFactor);

        npv = npv.plus(flow.amount.times(df));
        dnpv = dnpv.minus(
          flow.amount.times(new Big(exponent)).times(df).div(base)
        );
      }

      if (dnpv.abs().lt(tolerance)) {
        break;
      }

      const adjustment = npv.div(dnpv);
      rate = rate.minus(adjustment);

      if (npv.abs().lt(tolerance)) {
        return rate.round(6).toNumber();
      }
    }

    // Check final convergence
    let finalNpv = new Big(0);

    for (const flow of flows) {
      const base = new Big(1).plus(rate);

      if (base.lte(0)) {
        return null;
      }

      const exponent = flow.years.toNumber();
      const discountFactor = Math.pow(base.toNumber(), -exponent);
      finalNpv = finalNpv.plus(flow.amount.times(new Big(discountFactor)));
    }

    if (finalNpv.abs().lt(new Big(0.01))) {
      return rate.round(6).toNumber();
    }

    return null;
  }

  private static daysBetween(start: Date, end: Date): number {
    const msPerDay = 86400000;

    return Math.round((end.getTime() - start.getTime()) / msPerDay);
  }
}
