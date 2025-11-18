import { resolveFearAndGreedIndex } from '@ghostfolio/common/helper';
import { translate } from '@ghostfolio/ui/i18n';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgxSkeletonLoaderModule],
  selector: 'gf-fear-and-greed-index',
  styleUrls: ['./fear-and-greed-index.component.scss'],
  templateUrl: './fear-and-greed-index.component.html'
})
export class GfFearAndGreedIndexComponent implements OnChanges {
  @Input() fearAndGreedIndex: number;

  public fearAndGreedIndexEmoji: string;
  public fearAndGreedIndexText: string;

  public ngOnChanges() {
    const { emoji, key } = resolveFearAndGreedIndex(this.fearAndGreedIndex);

    this.fearAndGreedIndexEmoji = emoji;
    this.fearAndGreedIndexText = translate(key);
  }
}
