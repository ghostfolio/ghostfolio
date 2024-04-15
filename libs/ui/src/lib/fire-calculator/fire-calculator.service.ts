import { Injectable } from '@angular/core';
import { Big } from 'big.js';

@Injectable()
export class FireCalculatorService {
  private readonly COMPOUND_PERIOD = 12;

  public constructor() {}

  public calculateCompoundInterest({
    P,
    periodInMonths,
    PMT,
    r
  }: {
    P: number;
    periodInMonths: number;
    PMT: number;
    r: number;
  }) {
    let interest = new Big(0);
    const principal = new Big(P).plus(new Big(PMT).mul(periodInMonths));
    let totalAmount = principal;

    if (r) {
      const compoundInterestForPrincipal = new Big(1)
        .plus(new Big(r).div(this.COMPOUND_PERIOD))
        .pow(periodInMonths);
      const compoundInterest = new Big(P).mul(compoundInterestForPrincipal);
      const contributionInterest = new Big(
        new Big(PMT).mul(compoundInterestForPrincipal.minus(1))
      ).div(new Big(r).div(this.COMPOUND_PERIOD));
      interest = compoundInterest.plus(contributionInterest).minus(principal);
      totalAmount = compoundInterest.plus(contributionInterest);
    }

    return {
      interest,
      principal,
      totalAmount
    };
  }

  public calculatePeriodsToRetire({
    P,
    PMT,
    r,
    totalAmount
  }: {
    P: number;
    PMT: number;
    r: number;
    totalAmount: number;
  }) {
    if (r == 0) {
      // No compound interest
      return (totalAmount - P) / PMT;
    } else if (totalAmount <= P) {
      return 0;
    }

    const periodInterest = new Big(r).div(this.COMPOUND_PERIOD);
    const numerator1: number = Math.log10(
      new Big(totalAmount).plus(new Big(PMT).div(periodInterest)).toNumber()
    );
    const numerator2: number = Math.log10(
      new Big(P).plus(new Big(PMT).div(periodInterest)).toNumber()
    );
    const denominator: number = Math.log10(
      new Big(1).plus(periodInterest).toNumber()
    );

    return (numerator1 - numerator2) / denominator;
  }
}
