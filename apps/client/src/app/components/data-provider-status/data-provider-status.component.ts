import { DataService } from '@ghostfolio/client/services/data.service';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import type { DataSource } from '@prisma/client';
import { catchError, map, type Observable, of } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  selector: 'gf-data-provider-status',
  standalone: true,
  templateUrl: './data-provider-status.component.html'
})
export class GfDataProviderStatusComponent implements OnInit {
  @Input() dataSource: DataSource;

  public status$: Observable<{ isHealthy: boolean }>;

  public constructor(private dataService: DataService) {}

  public ngOnInit() {
    this.status$ = this.dataService
      .fetchDataProviderHealth(this.dataSource)
      .pipe(
        map(() => ({ isHealthy: true })),
        catchError(() => of({ isHealthy: false }))
      );
  }
}
