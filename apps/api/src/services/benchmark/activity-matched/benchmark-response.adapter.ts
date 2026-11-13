import { LineChartItem } from '@ghostfolio/common/interfaces';

import { ActivityMatchedBenchmarkPipelineResult } from './activity-matched-benchmark.pipeline';

export function toBenchmarkMarketData(
  performance: ActivityMatchedBenchmarkPipelineResult['performance']
): LineChartItem[] {
  return performance.map(({ date, returnFraction }) => {
    const value = returnFraction.mul(100).toNumber();

    if (!Number.isFinite(value)) {
      throw new Error(`Invalid benchmark return: ${date}`);
    }

    return { date, value };
  });
}
