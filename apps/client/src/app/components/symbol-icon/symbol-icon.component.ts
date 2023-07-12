import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { DataSource } from '@prisma/client';

@Component({
  selector: 'gf-symbol-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './symbol-icon.component.html',
  styleUrls: ['./symbol-icon.component.scss']
})
export class SymbolIconComponent implements OnChanges {
  @Input() dataSource: DataSource;
  @Input() size: 'large';
  @Input() symbol: string;
  @Input() tooltip: string;
  @Input() url: string;

  public src: string;

  public constructor() {}

  public ngOnChanges() {
    if (this.dataSource && this.symbol) {
      this.src = `../api/v1/logo/${this.dataSource}/${this.symbol}`;
    } else if (this.url) {
      this.src = `../api/v1/logo?url=${this.url}`;
    }
  }
}
