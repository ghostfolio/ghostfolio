import { BenchmarkService } from './benchmark.service';

describe('BenchmarkService', () => {
  let benchmarkService: BenchmarkService;

  beforeAll(async () => {
    benchmarkService = new BenchmarkService(null, null, null, null, null, null);
  });

  it('calculateChangeInPercentage', async () => {
    expect(benchmarkService.calculateChangeInPercentage(1, 2)).toEqual(1);
    expect(benchmarkService.calculateChangeInPercentage(2, 2)).toEqual(0);
    expect(benchmarkService.calculateChangeInPercentage(2, 1)).toEqual(-0.5);
  });

  it('getMarketCondition', async () => {
    expect(benchmarkService.getMarketCondition(0)).toEqual('ALL_TIME_HIGH');
    expect(benchmarkService.getMarketCondition(-5.90736454893e-9)).toEqual(
      'ALL_TIME_HIGH'
    );
    expect(benchmarkService.getMarketCondition(-0.1)).toEqual('NEUTRAL_MARKET');
    expect(benchmarkService.getMarketCondition(-0.19996)).toEqual(
      'BEAR_MARKET'
    );
    expect(benchmarkService.getMarketCondition(-0.2)).toEqual('BEAR_MARKET');
  });
});
