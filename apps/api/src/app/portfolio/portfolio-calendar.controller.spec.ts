import { isRestrictedView } from '@ghostfolio/common/permissions';
import { scopes } from '@ghostfolio/common/scopes';

import 'reflect-metadata';

import { PortfolioController } from './portfolio.controller';

// Keep the actual permission helpers, but control restricted-view policy
// explicitly in this controller unit test.
jest.mock('@ghostfolio/common/permissions', () => ({
  ...jest.requireActual('@ghostfolio/common/permissions'),
  isRestrictedView: jest.fn(() => false)
}));

describe('Portfolio calendar controller access restrictions', () => {
  const periods = [{ startDate: '2026-01-02', endDate: '2026-01-03' }];
  const getCalendarPerformancePercentages = jest.fn(async () => [
    { ...periods[0], percentage: 3.25 }
  ]);

  const setup = (viewMode: string) =>
    Object.assign(Object.create(PortfolioController.prototype), {
      request: {
        user: {
          settings: { settings: { viewMode } }
        }
      },
      portfolioService: { getCalendarPerformancePercentages }
    }) as PortfolioController;

  beforeEach(() => {
    getCalendarPerformancePercentages.mockClear();
    jest.mocked(isRestrictedView).mockReturnValue(false);
  });

  it('does not disclose percentages without portfolio value scope', async () => {
    const controller = setup('DEFAULT');
    expect(
      await controller.getCalendarPerformance(
        {
          isActive: false,
          scopes: [],
          userId: 'synthetic-user',
          userSettings: {}
        },
        { periods }
      )
    ).toEqual(periods);
    expect(getCalendarPerformancePercentages).not.toHaveBeenCalled();
  });

  it('does not disclose percentages in Zen Mode', async () => {
    const controller = setup('ZEN');
    expect(
      await controller.getCalendarPerformance(
        {
          isActive: false,
          scopes: [scopes.portfolioReadValues],
          userId: 'synthetic-user',
          userSettings: {}
        },
        { periods }
      )
    ).toEqual(periods);
    expect(getCalendarPerformancePercentages).not.toHaveBeenCalled();
  });
  it('does not disclose percentages in a restricted view despite value scope', async () => {
    jest.mocked(isRestrictedView).mockReturnValue(true);
    const controller = setup('DEFAULT');
    expect(
      await controller.getCalendarPerformance(
        {
          isActive: false,
          scopes: [scopes.portfolioReadValues],
          userId: 'synthetic-user',
          userSettings: {}
        },
        { periods }
      )
    ).toEqual(periods);
    expect(getCalendarPerformancePercentages).not.toHaveBeenCalled();
  });

  it('delegates to the service when reading values is permitted', async () => {
    const controller = setup('DEFAULT');
    expect(
      await controller.getCalendarPerformance(
        {
          isActive: false,
          scopes: [scopes.portfolioReadValues],
          userId: 'synthetic-user',
          userSettings: {}
        },
        { periods }
      )
    ).toEqual([{ ...periods[0], percentage: 3.25 }]);
    expect(getCalendarPerformancePercentages).toHaveBeenCalledWith({
      periods,
      userId: 'synthetic-user'
    });
  });
});
