import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { UserSettings } from '@ghostfolio/common/interfaces';

import { Rule } from '../../rule';

export class FeeRatioInitialInvestment extends Rule<Settings> {
  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    private totalInvestment: number,
    private fees: number
  ) {
    super(exchangeRateDataService, {
      name: 'Initial Investment'
    });
  }

  public evaluate(ruleSettings: Settings) {
    const feeRatio = this.fees / this.totalInvestment;

    if (feeRatio > ruleSettings.threshold) {
      return {
        evaluation: `The fees do exceed ${
          ruleSettings.threshold * 100
        }% of your initial investment (${(feeRatio * 100).toPrecision(3)}%)`,
        value: false
      };
    }

    return {
      evaluation: `The fees do not exceed ${
        ruleSettings.threshold * 100
      }% of your initial investment (${(feeRatio * 100).toPrecision(3)}%)`,
      value: true
    };
  }

  public getSettings(aUserSettings: UserSettings): Settings {
    return {
      baseCurrency: aUserSettings.baseCurrency,
      isActive: true,
      threshold: 0.01
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  threshold: number;
}
