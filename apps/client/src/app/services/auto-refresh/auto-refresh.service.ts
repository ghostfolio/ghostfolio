import { Service, signal } from '@angular/core';
import { EMPTY, fromEvent, Observable, timer } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  share,
  startWith,
  switchMap
} from 'rxjs/operators';

export const AUTO_REFRESH_INTERVAL_MS = 5000;
export const AUTO_REFRESH_INTERVAL_STORAGE_KEY = 'gf-auto-refresh-ms';

/**
 * Returns the refresh interval of this device: the stored override (between
 * 1 second and 1 minute) or the default.
 */
export function getAutoRefreshInterval(
  storage?: Pick<Storage, 'getItem'>
): number {
  try {
    const value = Number(
      (storage ?? globalThis.localStorage)?.getItem(
        AUTO_REFRESH_INTERVAL_STORAGE_KEY
      )
    );

    return Number.isFinite(value) && value >= 1000 && value <= 60_000
      ? value
      : AUTO_REFRESH_INTERVAL_MS;
  } catch {
    return AUTO_REFRESH_INTERVAL_MS;
  }
}

/**
 * Emits at a fixed interval while the page is visible so that pages can
 * refresh their numbers silently. The timer stops while the tab is hidden
 * and fires once immediately when the tab becomes visible again.
 */
@Service()
export class AutoRefreshService {
  public readonly lastUpdated = signal<Date | null>(null);
  public readonly refresh$: Observable<void>;

  public constructor() {
    let isFirstActivation = true;

    this.refresh$ = fromEvent(document, 'visibilitychange').pipe(
      startWith(undefined),
      map(() => document.visibilityState === 'visible'),
      distinctUntilChanged(),
      switchMap((isVisible) => {
        if (!isVisible) {
          return EMPTY;
        }

        const interval = getAutoRefreshInterval();
        const dueTime = isFirstActivation ? interval : 0;

        isFirstActivation = false;

        return timer(dueTime, interval).pipe(map(() => undefined));
      }),
      share()
    );
  }

  /**
   * To be called by a page after it has silently refreshed its numbers.
   */
  public markUpdated() {
    this.lastUpdated.set(new Date());
  }
}
