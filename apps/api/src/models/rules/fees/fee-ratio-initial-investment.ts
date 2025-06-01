import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';
import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { DEFAULT_LANGUAGE_CODE } from '@ghostfolio/common/config';
import { UserSettings } from '@ghostfolio/common/interfaces';

export class FeeRatioInitialInvestment extends Rule<Settings> {
  private fees: number;
  private i18nService = new I18nService();
  private totalInvestment: number;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    totalInvestment: number,
    fees: number
  ) {
    super(exchangeRateDataService, {
      key: FeeRatioInitialInvestment.name,
      name: 'Fee Ratio'
    });

    this.fees = fees;
    this.totalInvestment = totalInvestment;
  }

  public evaluate(ruleSettings: Settings) {
    const feeRatio = this.totalInvestment
      ? this.fees / this.totalInvestment
      : 0;

    if (feeRatio > ruleSettings.thresholdMax) {
      const evaluation = this.i18nService.getTranslation({
        id: 'rule.fee-ratio-initial-investment.exceed',
        languageCode: DEFAULT_LANGUAGE_CODE,
        placeholders: {
          feeRatio: (ruleSettings.thresholdMax * 100).toFixed(2),
          thresholdMax: (feeRatio * 100).toPrecision(3)
        }
      });

      return {
        evaluation,
        value: false
      };
    }

    const evaluation = this.i18nService.getTranslation({
      id: 'rule.fee-ratio-initial-investment.not-exceed',
      languageCode: DEFAULT_LANGUAGE_CODE,
      placeholders: {
        feeRatio: (feeRatio * 100).toPrecision(3),
        thresholdMax: (ruleSettings.thresholdMax * 100).toFixed(2)
      }
    });

    return {
      evaluation,
      value: true
    };
  }

  public getConfiguration() {
    return {
      threshold: {
        max: 0.1,
        min: 0,
        step: 0.0025,
        unit: '%'
      },
      thresholdMax: true
    };
  }

  public getSettings({ baseCurrency, xRayRules }: UserSettings): Settings {
    return {
      baseCurrency,
      isActive: xRayRules?.[this.getKey()].isActive ?? true,
      thresholdMax: xRayRules?.[this.getKey()]?.thresholdMax ?? 0.01
    };
  }
}

interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMax: number;
}
