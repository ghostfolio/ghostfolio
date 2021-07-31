import { groupBy } from '@ghostfolio/common/helper';
import { PortfolioPosition } from '@ghostfolio/common/interfaces';
import { Currency } from '@prisma/client';

import { ExchangeRateDataService } from '../services/exchange-rate-data.service';
import { EvaluationResult } from './interfaces/evaluation-result.interface';
import { RuleInterface } from './interfaces/rule.interface';
import { UserSettings } from '@ghostfolio/api/models/interfaces/user-settings.interface';
import { RuleSettings } from '@ghostfolio/api/models/interfaces/rule-settings.interface';

export abstract class Rule<T extends RuleSettings> implements RuleInterface<T> {
  private name: string;

  public constructor(
    public exchangeRateDataService: ExchangeRateDataService,
    {
      name
    }: {
      name: string;
    }
  ) {
    this.name = name;
  }

  public abstract evaluate(
    aPortfolioPositionMap: {
      [symbol: string]: PortfolioPosition;
    },
    aFees: number,
    aRuleSettings: T
  ): EvaluationResult;

  public abstract getSettings(aUserSettings: UserSettings): T;

  public getName() {
    return this.name;
  }

  public groupPositionsByAttribute(
    aPositions: { [symbol: string]: PortfolioPosition },
    aAttribute: keyof PortfolioPosition,
    aBaseCurrency: Currency
  ) {
    return Array.from(
      groupBy(aAttribute, Object.values(aPositions)).entries()
    ).map(([attributeValue, objs]) => ({
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
            currentValue.quantity * currentValue.marketPrice,
            currentValue.currency,
            aBaseCurrency
          ),
        0
      )
    }));
  }
}
