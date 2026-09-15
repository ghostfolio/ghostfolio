import { getEmojiFlag } from '@ghostfolio/common/helper';
import { EntityLogoImageSourceService } from '@ghostfolio/ui/entity-logo/entity-logo-image-source.service';

import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { DataSource } from '@prisma/client';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'align-items-center d-flex' },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-entity-logo',
  styleUrls: ['./entity-logo.component.scss'],
  templateUrl: './entity-logo.component.html'
})
export class GfEntityLogoComponent implements OnChanges {
  @Input() countryCode: string;
  @Input() dataSource: DataSource;
  @Input() hasPlaceholder = false;
  @Input() size: 'large';
  @Input() symbol: string;
  @Input() tooltip: string;
  @Input() url: string;

  public emojiFlag = '';
  public hasError = false;
  public src?: string;

  public constructor(
    private readonly imageSourceService: EntityLogoImageSourceService
  ) {}

  public ngOnChanges() {
    this.emojiFlag = '';
    this.hasError = false;
    this.src = undefined;

    if (this.countryCode) {
      this.emojiFlag = getEmojiFlag(this.countryCode);
    } else if (this.dataSource && this.symbol) {
      this.src = this.imageSourceService.getLogoUrlByAssetProfileIdentifier({
        dataSource: this.dataSource,
        symbol: this.symbol
      });
    } else if (this.url) {
      this.src = this.imageSourceService.getLogoUrlByUrl(this.url);
    }
  }

  public onError() {
    this.hasError = true;
  }
}
