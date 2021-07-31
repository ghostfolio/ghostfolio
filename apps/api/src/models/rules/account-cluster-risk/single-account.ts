import { PortfolioPosition } from '@ghostfolio/common/interfaces';
import { ExchangeRateDataService } from 'apps/api/src/services/exchange-rate-data.service';

import { Rule } from '../../rule';
import { UserSettings } from '@ghostfolio/api/models/interfaces/user-settings.interface';
import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';

export class AccountClusterRiskSingleAccount extends Rule<RuleSettings> {
  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private positions: { [symbol: string]: PortfolioPosition }
  ) {
    super(exchangeRateDataService, {
      name: 'Single Account'
    });
  }

  public evaluate() {
    const accounts: string[] = [];

    Object.values(this.positions).forEach((position) => {
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

  public getSettings(aUserSettings: UserSettings): RuleSettings {
    return {
      isActive: true
    };
  }
}
