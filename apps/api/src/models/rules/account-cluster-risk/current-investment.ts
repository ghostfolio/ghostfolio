import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { PortfolioPosition } from '@ghostfolio/common/interfaces';

import { Rule } from '../../rule';

export class AccountClusterRiskCurrentInvestment extends Rule {
  public constructor(public exchangeRateDataService: ExchangeRateDataService) {
    super(exchangeRateDataService, {
      name: 'Current Investment'
    });
  }

  public evaluate(
    aPositions: { [symbol: string]: PortfolioPosition },
    aFees: number,
    aRuleSettingsMap?: {
      [key: string]: any;
    }
  ) {
    const ruleSettings =
      aRuleSettingsMap[AccountClusterRiskCurrentInvestment.name];

    const accounts: {
      [symbol: string]: Pick<PortfolioPosition, 'name'> & {
        investment: number;
      };
    } = {};

    Object.values(aPositions).forEach((position) => {
      for (const [account, { current }] of Object.entries(position.accounts)) {
        if (accounts[account]?.investment) {
          accounts[account].investment += current;
        } else {
          accounts[account] = {
            investment: current,
            name: account
          };
        }
      }
    });

    let maxItem;
    let totalInvestment = 0;

    Object.values(accounts).forEach((account) => {
      if (!maxItem) {
        maxItem = account;
      }

      // Calculate total investment
      totalInvestment += account.investment;

      // Find maximum
      if (account.investment > maxItem?.investment) {
        maxItem = account;
      }
    });

    const maxInvestmentRatio = maxItem.investment / totalInvestment;

    if (maxInvestmentRatio > ruleSettings.threshold) {
      return {
        evaluation: `Over ${
          ruleSettings.threshold * 100
        }% of your current investment is at ${maxItem.name} (${(
          maxInvestmentRatio * 100
        ).toPrecision(3)}%)`,
        value: false
      };
    }

    return {
      evaluation: `The major part of your current investment is at ${
        maxItem.name
      } (${(maxInvestmentRatio * 100).toPrecision(3)}%) and does not exceed ${
        ruleSettings.threshold * 100
      }%`,
      value: true
    };
  }
}
