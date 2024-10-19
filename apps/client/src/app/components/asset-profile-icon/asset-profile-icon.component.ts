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
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-asset-profile-icon',
  standalone: true,
  styleUrls: ['./asset-profile-icon.component.scss'],
  templateUrl: './asset-profile-icon.component.html'
})
export class GfAssetProfileIconComponent implements OnChanges {
  @Input() dataSource: DataSource;
  @Input() size: 'large';
  @Input() symbol: string;
  @Input() tooltip: string;
  @Input() url: string;

  public src: string;

  public ngOnChanges() {
    if (this.dataSource && this.symbol) {
      this.src = `../api/v1/logo/${this.dataSource}/${this.symbol}`;
    } else if (this.url) {
      this.src = `../api/v1/logo?url=${this.url}`;
    }
  }
}
