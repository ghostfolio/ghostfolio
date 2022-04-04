import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { UserSettings } from '@ghostfolio/api/models/interfaces/user-settings.interface';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import {
  PortfolioDetails,
  PortfolioPosition
} from '@ghostfolio/common/interfaces';

import { Rule } from '../../rule';

export class AccountClusterRiskInitialInvestment extends Rule<Settings> {
  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private accounts: PortfolioDetails['accounts']
  ) {
    super(exchangeRateDataService, {
      name: 'Initial Investment'
    });
  }

  public evaluate(ruleSettings?: Settings) {
    const accounts: {
      [symbol: string]: Pick<PortfolioPosition, 'name'> & {
        investment: number;
      };
    } = {};

    for (const [accountId, account] of Object.entries(this.accounts)) {
      accounts[accountId] = {
        name: account.name,
        investment: account.original
      };
    }

    let maxItem;
    let totalInvestment = 0;

    for (const account of Object.values(accounts)) {
      if (!maxItem) {
        maxItem = account;
      }

      // Calculate total investment
      totalInvestment += account.investment;

      // Find maximum
      if (account.investment > maxItem?.investment) {
        maxItem = account;
      }
    }

    const maxInvestmentRatio = maxItem.investment / totalInvestment;

    if (maxInvestmentRatio > ruleSettings.threshold) {
      return {
        evaluation: `Over ${
          ruleSettings.threshold * 100
        }% of your initial investment is at ${maxItem.name} (${(
          maxInvestmentRatio * 100
        ).toPrecision(3)}%)`,
        value: false
      };
    }

    return {
      evaluation: `The major part of your initial investment is at ${
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
  isActive: boolean;
  threshold: number;
}
