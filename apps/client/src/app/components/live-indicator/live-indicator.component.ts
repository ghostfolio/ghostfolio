import { AutoRefreshService } from '@ghostfolio/client/services/auto-refresh/auto-refresh.service';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  viewChild
} from '@angular/core';

/**
 * A small dot which pulses each time the numbers of the page have been
 * refreshed in the background. The title shows the time of the last refresh.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-live-indicator',
  styleUrls: ['./live-indicator.component.scss'],
  template: `
    @if (lastUpdated()) {
      <span
        class="align-items-center d-flex"
        role="status"
        [attr.aria-label]="title()"
        [title]="title()"
      >
        <span #dot class="dot"></span>
      </span>
    }
  `
})
export class GfLiveIndicatorComponent {
  protected readonly lastUpdated = inject(AutoRefreshService).lastUpdated;

  protected readonly title = computed(() => {
    const lastUpdated = this.lastUpdated();

    return lastUpdated
      ? $localize`Live` +
          ' · ' +
          $localize`Updated` +
          ' ' +
          lastUpdated.toLocaleTimeString()
      : '';
  });

  private readonly dot = viewChild<ElementRef<HTMLElement>>('dot');

  public constructor() {
    effect(() => {
      this.lastUpdated();

      const element = this.dot()?.nativeElement;

      if (element) {
        element.classList.remove('pulse');

        // Force a reflow to restart the animation
        void element.offsetWidth;

        element.classList.add('pulse');
      }
    });
  }
}
