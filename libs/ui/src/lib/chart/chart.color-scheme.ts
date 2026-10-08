import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

export function onPrefersColorSchemeChange(callback: () => void) {
  fromEvent(window.matchMedia('(prefers-color-scheme: dark)'), 'change')
    .pipe(takeUntilDestroyed())
    .subscribe(callback);
}
