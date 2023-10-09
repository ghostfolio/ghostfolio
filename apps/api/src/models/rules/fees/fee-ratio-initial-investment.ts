import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { UserSettings } from '@ghostfolio/common/interfaces';

export class FeeRatioInitialInvestment extends Rule<Settings> {
  private fees: number;
  private totalInvestment: number;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    totalInvestment: number,
    fees: number
  ) {
    super(exchangeRateDataService, {
      name: 'Fee Ratio'
    });

    this.fees = fees;
    this.totalInvestment = totalInvestment;
  }

  public evaluate(ruleSettings: Settings) {
    const feeRatio = this.totalInvestment
      ? this.fees / this.totalInvestment
      : 0;

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
