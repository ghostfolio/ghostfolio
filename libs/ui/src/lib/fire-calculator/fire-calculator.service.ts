import { Injectable } from '@angular/core';
import Big from 'big.js';

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
}
