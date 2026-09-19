import { XRayRuleKey } from '@ghostfolio/api/models/types/x-ray-rule-key.type';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import {
  PortfolioPosition,
  PortfolioReportRule,
  RuleSettings
} from '@ghostfolio/common/interfaces';

import { Big } from 'big.js';
import { groupBy } from 'lodash';

import { EvaluationResult } from './interfaces/evaluation-result.interface';
import { RuleInterface } from './interfaces/rule.interface';

export abstract class Rule<T extends RuleSettings> implements RuleInterface<T> {
  protected exchangeRateDataService: ExchangeRateDataService;

  private key: XRayRuleKey;
  private languageCode: string;

  public constructor({
    exchangeRateDataService,
    key,
    languageCode
  }: {
    exchangeRateDataService: ExchangeRateDataService;
    key: XRayRuleKey;
    languageCode: string;
  }) {
    this.exchangeRateDataService = exchangeRateDataService;
    this.key = key;
    this.languageCode = languageCode;
  }

  public getKey() {
    return this.key;
  }

  public getLanguageCode() {
    return this.languageCode;
  }

  public groupCurrentHoldingsByAttribute(
    holdings: PortfolioPosition[],
    attribute: `assetProfile.${Extract<keyof PortfolioPosition['assetProfile'], string>}`,
    baseCurrency: string
  ) {
    return Object.entries(groupBy(holdings, attribute)).map(
      ([attributeValue, objs]) => ({
        groupKey: attributeValue,
        investment: objs.reduce(
          (previousValue, currentValue) =>
            previousValue + currentValue.investment,
          0
        ),
        value: objs.reduce(
          (previousValue, currentValue) =>
            previousValue +
            this.exchangeRateDataService.toCurrency(
              new Big(currentValue.quantity)
                .mul(currentValue.marketPrice ?? 0)
                .toNumber(),
              currentValue.assetProfile.currency ?? baseCurrency,
              baseCurrency
            ),
          0
        )
      })
    );
  }

  public abstract evaluate(aRuleSettings: T): EvaluationResult;

  public abstract getConfiguration(): Partial<
    PortfolioReportRule['configuration']
  >;

  public abstract getName(): string;
}
