import { DataService } from '@ghostfolio/client/services/data.service';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import type { DataSource } from '@prisma/client';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { catchError, map, type Observable, of, Subject, takeUntil } from 'rxjs';

import { DataProviderStatus } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgxSkeletonLoaderModule],
  selector: 'gf-data-provider-status',
  standalone: true,
  templateUrl: './data-provider-status.component.html'
})
export class GfDataProviderStatusComponent implements OnDestroy, OnInit {
  @Input() dataSource: DataSource;

  public status$: Observable<DataProviderStatus>;

  private unsubscribeSubject = new Subject<void>();

  public constructor(private dataService: DataService) {}

  public ngOnInit() {
    this.status$ = this.dataService
      .fetchDataProviderHealth(this.dataSource)
      .pipe(
        catchError(() => {
          return of({ isHealthy: false });
        }),
        map(() => {
          return { isHealthy: true };
        }),
        takeUntil(this.unsubscribeSubject)
      );
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
