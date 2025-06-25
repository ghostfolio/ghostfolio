import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { DataSource } from '@prisma/client';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { GfLogoComponent } from '../logo/logo.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, GfLogoComponent],
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
  @Input() useLogo = false;

  public src: string;

  public constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly http: HttpClient
  ) {}

  public ngOnChanges() {
    if (this.useLogo) {
      return;
    }

    if (this.dataSource && this.symbol) {
      this.src = `../api/v1/logo/${this.dataSource}/${this.symbol}`;
    } else if (this.url) {
      this.http
        .get<{ logoUrl: string }>(`../api/v1/logo?url=${this.url}`)
        .pipe(
          catchError(() => {
            return of({ logoUrl: '' });
          })
        )
        .subscribe(({ logoUrl }) => {
          this.src = logoUrl;
          this.changeDetectorRef.markForCheck();
        });
    }
  }
}
