import { PortfolioPosition } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-position.interface';

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
