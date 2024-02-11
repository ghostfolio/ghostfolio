import { resolveFearAndGreedIndex } from '@ghostfolio/common/helper';
import { translate } from '@ghostfolio/ui/i18n';

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit
} from '@angular/core';

@Component({
  selector: 'gf-fear-and-greed-index',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fear-and-greed-index.component.html',
  styleUrls: ['./fear-and-greed-index.component.scss']
})
export class FearAndGreedIndexComponent implements OnChanges, OnInit {
  @Input() fearAndGreedIndex: number;

  public fearAndGreedIndexEmoji: string;
  public fearAndGreedIndexText: string;

  public constructor() {}

  public ngOnInit() {}

  public ngOnChanges() {
    const { emoji, key } = resolveFearAndGreedIndex(this.fearAndGreedIndex);

    this.fearAndGreedIndexEmoji = emoji;
    this.fearAndGreedIndexText = translate(key);
  }
}
