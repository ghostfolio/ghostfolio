import { PortfolioPosition } from '@ghostfolio/helper/interfaces';
import { ExchangeRateDataService } from 'apps/api/src/services/exchange-rate-data.service';

import { Rule } from '../../rule';

export class AccountClusterRiskSingleAccount extends Rule {
  public constructor(public exchangeRateDataService: ExchangeRateDataService) {
    super(exchangeRateDataService, {
      name: 'Single Account'
    });
  }

  public evaluate(positions: { [symbol: string]: PortfolioPosition }) {
    const accounts: string[] = [];

    Object.values(positions).forEach((position) => {
      for (const [account] of Object.entries(position.accounts)) {
        if (!accounts.includes(account)) {
          accounts.push(account);
        }
      }
    });

    if (accounts.length === 1) {
      return {
        evaluation: `All your investment is managed by a single account`,
        value: false
      };
    }

    return {
      evaluation: `Your investment is managed by ${accounts.length} accounts`,
      value: true
    };
  }
}
