import { BenchmarkService } from './benchmark.service';

describe('BenchmarkService', () => {
  let benchmarkService: BenchmarkService;

  beforeAll(async () => {
    benchmarkService = new BenchmarkService(
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    );
  });

  it('calculateChangeInPercentage', async () => {
    expect(benchmarkService.calculateChangeInPercentage(1, 2)).toEqual(1);
    expect(benchmarkService.calculateChangeInPercentage(2, 2)).toEqual(0);
    expect(benchmarkService.calculateChangeInPercentage(2, 1)).toEqual(-0.5);
  });
});
