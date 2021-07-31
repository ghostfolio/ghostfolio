import { PortfolioPosition } from '@ghostfolio/common/interfaces';
import { ExchangeRateDataService } from 'apps/api/src/services/exchange-rate-data.service';

import { Rule } from '../../rule';
import { UserSettings } from '@ghostfolio/api/models/interfaces/user-settings.interface';
import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';

export class AccountClusterRiskInitialInvestment extends Rule<Settings> {
  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private positions: { [symbol: string]: PortfolioPosition }
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

    Object.values(this.positions).forEach((position) => {
      for (const [account, { original }] of Object.entries(position.accounts)) {
        if (platforms[account]?.investment) {
          platforms[account].investment += original;
        } else {
          platforms[account] = {
            investment: original,
            name: account
          };
        }
      }
    });

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
