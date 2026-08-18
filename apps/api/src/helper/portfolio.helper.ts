import { PortfolioDetails } from '@ghostfolio/common/interfaces';

import { Type as ActivityType } from '@prisma/client';

/**
 * Replaces the absolute values of the accounts, holdings and platforms with
 * their share of the portfolio. Every share is relative to the same total,
 * which includes the cash positions, so that the shares add up to 100%.
 */
export function convertValuesToPercentages({
  accounts,
  holdings,
  platforms
}: {
  accounts: PortfolioDetails['accounts'];
  holdings: PortfolioDetails['holdings'];
  platforms: PortfolioDetails['platforms'];
}) {
  const totalInvestment = Object.values(holdings)
    .map(({ investment }) => {
      return investment;
    })
    .reduce((a, b) => {
      return a + b;
    }, 0);

  const totalValue = Object.values(holdings)
    .map(({ valueInBaseCurrency }) => {
      return valueInBaseCurrency;
    })
    .reduce((a, b) => {
      return a + b;
    }, 0);

  for (const portfolioPosition of Object.values(holdings)) {
    portfolioPosition.investment = totalInvestment
      ? portfolioPosition.investment / totalInvestment
      : 0;
    portfolioPosition.valueInPercentage = totalValue
      ? portfolioPosition.valueInBaseCurrency / totalValue
      : 0;
  }

  for (const account of Object.values(accounts)) {
    account.valueInPercentage = totalValue
      ? account.valueInBaseCurrency / totalValue
      : 0;
  }

  for (const platform of Object.values(platforms)) {
    platform.valueInPercentage = totalValue
      ? platform.valueInBaseCurrency / totalValue
      : 0;
  }
}

export function getFactor(activityType: ActivityType) {
  let factor: number;

  switch (activityType) {
    case 'BUY':
      factor = 1;
      break;
    case 'SELL':
      factor = -1;
      break;
    default:
      factor = 0;
      break;
  }

  return factor;
}
