import { groupBy } from '@ghostfolio/common/helper';
import {
  PortfolioPosition,
  TimelinePosition
} from '@ghostfolio/common/interfaces';
import { Currency } from '@prisma/client';

import { ExchangeRateDataService } from '../services/exchange-rate-data.service';
import { EvaluationResult } from './interfaces/evaluation-result.interface';
import { RuleInterface } from './interfaces/rule.interface';
import { UserSettings } from '@ghostfolio/api/models/interfaces/user-settings.interface';
import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';

export abstract class Rule<T extends RuleSettings> implements RuleInterface<T> {
  private name: string;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    {
      name
    }: {
      name: string;
    }
  ) {
    this.name = name;
  }

  public abstract evaluate(aRuleSettings: T): EvaluationResult;

  public abstract getSettings(aUserSettings: UserSettings): T;

  public getName() {
    return this.name;
  }

  public groupCurrentPositionsByAttribute(
    positions: TimelinePosition[],
    attribute: keyof TimelinePosition,
    baseCurrency: Currency
  ) {
    return Array.from(groupBy(attribute, positions).entries()).map(
      ([attributeValue, objs]) => ({
        groupKey: attributeValue,
        investment: objs.reduce(
          (previousValue, currentValue) =>
            previousValue + currentValue.investment.toNumber(),
          0
        ),
        value: objs.reduce(
          (previousValue, currentValue) =>
            previousValue +
            this.exchangeRateDataService.toCurrency(
              currentValue.quantity.mul(currentValue.marketPrice).toNumber(),
              currentValue.currency,
              baseCurrency
            ),
          0
        )
      })
    );
  }
}
