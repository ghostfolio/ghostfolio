import { EntityLogoImageSourceService } from '@ghostfolio/ui/entity-logo/entity-logo-image-source.service';

import { CommonModule } from '@angular/common';
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
  imports: [CommonModule],
  providers: [EntityLogoImageSourceService],
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

  public src: string;

  public constructor(
    private readonly imageSourceService: EntityLogoImageSourceService
  ) {}

  public ngOnChanges() {
    if (this.dataSource && this.symbol) {
      this.src = this.imageSourceService.getLogoUrlByDataSourceAndSymbol(
        this.dataSource,
        this.symbol
      );
    } else if (this.url) {
      this.src = this.imageSourceService.getLogoUrlByUrl(this.url);
    }
  }
}
