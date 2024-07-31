import { Big } from 'big.js';
import { isNumber } from 'lodash';

export function getAnnualizedPerformancePercent({
  daysInMarket,
  netPerformancePercentage
}: {
  daysInMarket: number;
  netPerformancePercentage: Big;
}): Big {
  if (isNumber(daysInMarket) && daysInMarket > 0) {
    const exponent = new Big(365).div(daysInMarket).toNumber();

    return new Big(
      Math.pow(netPerformancePercentage.plus(1).toNumber(), exponent)
    ).minus(1);
  }

  return new Big(0);
}
