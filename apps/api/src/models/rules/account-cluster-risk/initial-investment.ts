import { PortfolioPosition } from '@ghostfolio/common/interfaces';
import { ExchangeRateDataService } from 'apps/api/src/services/exchange-rate-data.service';

import { Rule } from '../../rule';
import { UserSettings } from '@ghostfolio/api/models/interfaces/user-settings.interface';
import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';

export class AccountClusterRiskInitialInvestment extends Rule<Settings> {
  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private accounts: {
      [account: string]: { current: number; original: number };
    }
  ) {
    super(exchangeRateDataService, {
      name: 'Initial Investment'
    });
  }

  public evaluate(ruleSettings?: Settings) {
    const platforms: {
      [symbol: string]: Pick<PortfolioPosition, 'name'> & {
        investment: number;
      };
    } = {};

    for (const account of Object.keys(this.accounts)) {
      platforms[account] = {
        name: account,
        investment: this.accounts[account].original
      };
    }

    let maxItem;
    let totalInvestment = 0;

    Object.values(platforms).forEach((platform) => {
      if (!maxItem) {
        maxItem = platform;
      }

      // Calculate total investment
      totalInvestment += platform.investment;

      // Find maximum
      if (platform.investment > maxItem?.investment) {
        maxItem = platform;
      }
    });

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
