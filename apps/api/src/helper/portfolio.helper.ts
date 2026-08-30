import { PortfolioDetails } from '@ghostfolio/common/interfaces';

import { Type as ActivityType } from '@prisma/client';

export function convertValuesToPercentages({
  accounts,
  holdings,
  platforms
}: {
  accounts: PortfolioDetails['accounts'];
  holdings: PortfolioDetails['holdings'];
  platforms: PortfolioDetails['platforms'];
}) {
  const totalInvestment = holdings
    .map(({ investment }) => {
      return investment;
    })
    .reduce((a, b) => {
      return a + b;
    }, 0);

  const totalValue = holdings
    .map(({ valueInBaseCurrency }) => {
      return valueInBaseCurrency;
    })
    .reduce((a, b) => {
      return a + b;
    }, 0);

  for (const holding of holdings) {
    holding.investment = totalInvestment
      ? holding.investment / totalInvestment
      : 0;
    holding.valueInPercentage = totalValue
      ? holding.valueInBaseCurrency / totalValue
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
