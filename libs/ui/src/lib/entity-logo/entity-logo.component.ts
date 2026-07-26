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
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-entity-logo',
  styleUrls: ['./entity-logo.component.scss'],
  templateUrl: './entity-logo.component.html'
})
export class GfEntityLogoComponent implements OnChanges {
  @Input() dataSource: DataSource;
  @Input() size: 'large';
  @Input() symbol: string;
  @Input() tooltip: string;
  @Input() url: string;

  public src: string | undefined;

  public constructor(
    private readonly imageSourceService: EntityLogoImageSourceService
  ) {}

  public ngOnChanges() {
    if (this.dataSource && this.symbol) {
      const candidateSrc =
        this.imageSourceService.getLogoUrlByAssetProfileIdentifier({
          dataSource: this.dataSource,
          symbol: this.symbol
        });

      this.src = this.imageSourceService.hasFailed(candidateSrc)
        ? undefined
        : candidateSrc;
    } else if (this.url) {
      const candidateSrc = this.imageSourceService.getLogoUrlByUrl(this.url);

      this.src = this.imageSourceService.hasFailed(candidateSrc)
        ? undefined
        : candidateSrc;
    }
  }

  public onLogoError() {
    if (this.src) {
      this.imageSourceService.markAsFailed(this.src);
      this.src = undefined;
    }
  }
}
