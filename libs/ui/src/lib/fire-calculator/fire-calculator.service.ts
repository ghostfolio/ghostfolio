import { Injectable } from '@angular/core';
import Big from 'big.js';

@Injectable()
export class FireCalculatorService {
  private readonly COMPOUND_PERIOD = 12;
  private readonly CONTRIBUTION_PERIOD = 12;

  /**
   * @constructor
   */
  public constructor() {}

  public calculateCompoundInterest({
    P,
    period,
    PMT,
    r
  }: {
    P: number;
    period: number;
    PMT: number;
    r: number;
  }) {
    let interest = new Big(0);
    const principal = new Big(P).plus(
      new Big(PMT).mul(this.CONTRIBUTION_PERIOD).mul(period)
    );
    let totalAmount = principal;

    if (r) {
      const compoundInterestForPrincipal = new Big(1)
        .plus(new Big(r).div(this.COMPOUND_PERIOD))
        .pow(new Big(this.COMPOUND_PERIOD).mul(period).toNumber());
      const compoundInterest = new Big(P).mul(compoundInterestForPrincipal);
      const contributionInterest = new Big(
        new Big(PMT).mul(compoundInterestForPrincipal.minus(1))
      ).div(new Big(r).div(this.CONTRIBUTION_PERIOD));
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
