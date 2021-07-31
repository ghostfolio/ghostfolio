import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { PortfolioPosition } from '@ghostfolio/common/interfaces';

import { Rule } from '../../rule';
import { UserSettings } from '@ghostfolio/api/models/interfaces/user-settings.interface';
import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';

export class AccountClusterRiskCurrentInvestment extends Rule<Settings> {
  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private positions: { [symbol: string]: PortfolioPosition }
  ) {
    super(exchangeRateDataService, {
      name: 'Current Investment'
    });
  }

  public evaluate(ruleSettings: Settings) {
    const accounts: {
      [symbol: string]: Pick<PortfolioPosition, 'name'> & {
        investment: number;
      };
    } = {};

    Object.values(this.positions).forEach((position) => {
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

  public getSettings(aUserSettings: UserSettings): Settings {
    return {
      baseCurrency: aUserSettings.baseCurrency,
      isActive: true,
      threshold: 0.5
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  threshold: number;
}
