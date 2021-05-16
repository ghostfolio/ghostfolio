import { PortfolioPosition } from '@ghostfolio/helper/interfaces';

import { EvaluationResult } from './evaluation-result.interface';

export interface RuleInterface {
  evaluate(
    aPortfolioPositionMap: {
      [symbol: string]: PortfolioPosition;
    },
    aFees: number,
    aRuleSettingsMap: {
      [key: string]: any;
    }
  ): EvaluationResult;
}
