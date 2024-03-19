import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import {
  PortfolioDetails,
  PortfolioPosition,
  UserSettings
} from '@ghostfolio/common/interfaces';

export class AccountClusterRiskCurrentInvestment extends Rule<Settings> {
  private accounts: PortfolioDetails['accounts'];

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    accounts: PortfolioDetails['accounts']
  ) {
    super(exchangeRateDataService, {
      name: 'Investment'
    });

    this.accounts = accounts;
  }

  public evaluate(ruleSettings: Settings) {
    const accounts: {
      [symbol: string]: Pick<PortfolioPosition, 'name'> & {
        investment: number;
      };
    } = {};

    for (const [accountId, account] of Object.entries(this.accounts)) {
      accounts[accountId] = {
        name: account.name,
        investment: account.valueInBaseCurrency
      };
    }

    let maxItem: (typeof accounts)[0];
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

    const maxInvestmentRatio = maxItem?.investment / totalInvestment || 0;

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
