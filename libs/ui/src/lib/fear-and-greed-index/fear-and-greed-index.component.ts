import { resolveFearAndGreedIndex } from '@ghostfolio/common/helper';
import { translate } from '@ghostfolio/ui/i18n';

import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, NgxSkeletonLoaderModule],
  selector: 'gf-fear-and-greed-index',
  styleUrls: ['./fear-and-greed-index.component.scss'],
  templateUrl: './fear-and-greed-index.component.html'
})
export class GfFearAndGreedIndexComponent {
  public readonly fearAndGreedIndex = input<number>();
  public readonly isLoading = input<boolean>(false);

  protected readonly placeholder = '—';

  protected readonly fearAndGreedIndexEmoji = computed(() => {
    return resolveFearAndGreedIndex(this.fearAndGreedIndex()).emoji;
  });

  protected readonly fearAndGreedIndexText = computed(() => {
    return translate(resolveFearAndGreedIndex(this.fearAndGreedIndex()).key);
  });
}
