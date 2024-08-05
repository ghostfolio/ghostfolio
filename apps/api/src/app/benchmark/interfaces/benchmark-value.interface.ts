import { BenchmarkResponse } from '@ghostfolio/common/interfaces';

export interface BenchmarkValue {
  benchmarks: BenchmarkResponse['benchmarks'];
  expiration: number;
}
