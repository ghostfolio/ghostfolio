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
      key: AccountClusterRiskCurrentInvestment.name,
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

    if (maxInvestmentRatio > ruleSettings.thresholdMax) {
      return {
        evaluation: `Over ${
          ruleSettings.thresholdMax * 100
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
        ruleSettings.thresholdMax * 100
      }%`,
      value: true
    };
  }

  public getSettings({ baseCurrency, xRayRules }: UserSettings): Settings {
    return {
      baseCurrency,
      isActive: xRayRules?.[this.getKey()].isActive ?? true,
      thresholdMax: xRayRules?.[this.getKey()]?.thresholdMax ?? 0.5
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMax: number;
}
