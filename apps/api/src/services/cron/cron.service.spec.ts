import { SchedulerRegistry } from '@nestjs/schedule';

import { CronService } from './cron.service';

describe('CronService', () => {
  let configurationService: { get: jest.Mock };
  let cronService: CronService;
  let dataGatheringService: {
    gatherHourlyMarketData: jest.Mock;
    gatherRecentMarketData: jest.Mock;
  };
  let propertyService: { getByKey: jest.Mock };
  let schedulerRegistry: SchedulerRegistry;

  const createCronService = (intervalInMinutes: number) => {
    configurationService.get.mockReturnValue(intervalInMinutes);

    return new CronService(
      configurationService as never,
      dataGatheringService as never,
      propertyService as never,
      schedulerRegistry,
      {} as never,
      {} as never,
      {} as never
    );
  };

  beforeEach(() => {
    jest.useFakeTimers();

    configurationService = { get: jest.fn() };
    dataGatheringService = {
      gatherHourlyMarketData: jest.fn().mockResolvedValue(undefined),
      gatherRecentMarketData: jest.fn().mockResolvedValue(undefined)
    };
    propertyService = { getByKey: jest.fn().mockResolvedValue(undefined) };
    schedulerRegistry = new SchedulerRegistry();
  });

  afterEach(() => {
    cronService?.onModuleDestroy();

    jest.useRealTimers();
  });

  it('gathers the market data every hour by default', async () => {
    cronService = createCronService(60);
    cronService.onModuleInit();

    await jest.advanceTimersByTimeAsync(59 * 60 * 1000);
    expect(dataGatheringService.gatherHourlyMarketData).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(60 * 1000);
    expect(dataGatheringService.gatherHourlyMarketData).toHaveBeenCalledTimes(
      1
    );
    expect(dataGatheringService.gatherRecentMarketData).toHaveBeenCalledTimes(
      1
    );
  });

  it('gathers the market data in the configured interval', async () => {
    cronService = createCronService(5);
    cronService.onModuleInit();

    await jest.advanceTimersByTimeAsync(15 * 60 * 1000);

    expect(dataGatheringService.gatherHourlyMarketData).toHaveBeenCalledTimes(
      3
    );
  });

  it('does not gather more often than once per minute', async () => {
    cronService = createCronService(0);
    cronService.onModuleInit();

    await jest.advanceTimersByTimeAsync(60 * 1000);

    expect(dataGatheringService.gatherHourlyMarketData).toHaveBeenCalledTimes(
      1
    );
  });

  it('does not gather the market data if the data gathering is disabled', async () => {
    propertyService.getByKey.mockResolvedValue(false);

    cronService = createCronService(60);
    await cronService.runHourlyMarketDataGathering();

    expect(dataGatheringService.gatherHourlyMarketData).not.toHaveBeenCalled();
  });

  it('skips a run while the previous run is still in progress', async () => {
    let finish: () => void = () => undefined;

    dataGatheringService.gatherHourlyMarketData.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      })
    );

    cronService = createCronService(60);

    const firstRun = cronService.runHourlyMarketDataGathering();

    // Let the first run reach the pending data gathering
    await jest.advanceTimersByTimeAsync(0);

    await cronService.runHourlyMarketDataGathering();

    expect(dataGatheringService.gatherHourlyMarketData).toHaveBeenCalledTimes(
      1
    );

    finish();
    await firstRun;

    await cronService.runHourlyMarketDataGathering();

    expect(dataGatheringService.gatherHourlyMarketData).toHaveBeenCalledTimes(
      2
    );
  });

  it('keeps running after a failed run', async () => {
    dataGatheringService.gatherHourlyMarketData.mockRejectedValueOnce(
      new Error('Provider unavailable')
    );

    cronService = createCronService(60);

    await cronService.runHourlyMarketDataGathering();
    await cronService.runHourlyMarketDataGathering();

    expect(dataGatheringService.gatherHourlyMarketData).toHaveBeenCalledTimes(
      2
    );
  });
});
