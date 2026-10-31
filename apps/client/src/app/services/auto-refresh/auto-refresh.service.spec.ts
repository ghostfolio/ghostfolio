import {
  AUTO_REFRESH_INTERVAL_MS,
  AUTO_REFRESH_INTERVAL_STORAGE_KEY,
  AutoRefreshService,
  getAutoRefreshInterval
} from './auto-refresh.service';

describe('AutoRefreshService', () => {
  const setVisibility = (state: 'hidden' | 'visible') => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => state
    });
    document.dispatchEvent(new Event('visibilitychange'));
  };

  beforeEach(() => {
    jest.useFakeTimers();
    setVisibility('visible');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('emits at the interval while the page is visible', () => {
    const service = new AutoRefreshService();
    const next = jest.fn();
    const subscription = service.refresh$.subscribe(next);

    jest.advanceTimersByTime(AUTO_REFRESH_INTERVAL_MS - 1);
    expect(next).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(next).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(AUTO_REFRESH_INTERVAL_MS * 2);
    expect(next).toHaveBeenCalledTimes(3);

    subscription.unsubscribe();
  });

  it('pauses while hidden and refreshes immediately when visible again', () => {
    const service = new AutoRefreshService();
    const next = jest.fn();
    const subscription = service.refresh$.subscribe(next);

    setVisibility('hidden');
    jest.advanceTimersByTime(AUTO_REFRESH_INTERVAL_MS * 3);
    expect(next).not.toHaveBeenCalled();

    setVisibility('visible');
    jest.advanceTimersByTime(0);
    expect(next).toHaveBeenCalledTimes(1);

    subscription.unsubscribe();
  });
});

describe('getAutoRefreshInterval', () => {
  const storageWith = (value: string | null) => ({
    getItem: (key: string) =>
      key === AUTO_REFRESH_INTERVAL_STORAGE_KEY ? value : null
  });

  it('returns the default without an override', () => {
    expect(getAutoRefreshInterval(storageWith(null))).toBe(
      AUTO_REFRESH_INTERVAL_MS
    );
  });

  it('returns a valid override', () => {
    expect(getAutoRefreshInterval(storageWith('1000'))).toBe(1000);
    expect(getAutoRefreshInterval(storageWith('30000'))).toBe(30_000);
  });

  it('ignores an override outside of 1 second to 1 minute', () => {
    expect(getAutoRefreshInterval(storageWith('200'))).toBe(
      AUTO_REFRESH_INTERVAL_MS
    );
    expect(getAutoRefreshInterval(storageWith('600000'))).toBe(
      AUTO_REFRESH_INTERVAL_MS
    );
    expect(getAutoRefreshInterval(storageWith('abc'))).toBe(
      AUTO_REFRESH_INTERVAL_MS
    );
  });
});
