import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { Benchmark, User } from '@ghostfolio/common/interfaces';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { forkJoin, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import { CreateWatchlistItemDialog } from './create-watchlist-item-dialog/create-watchlist-item-dialog.component';
import { CreateWatchlistItemDialogParams } from './create-watchlist-item-dialog/interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-home-watchlist',
  styleUrls: ['./home-watchlist.scss'],
  templateUrl: './home-watchlist.html',
  standalone: false
})
export class HomeWatchlistComponent implements OnDestroy, OnInit {
  public deviceType: string;
  public user: User;
  public watchlist: Benchmark[];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (params['createWatchlistItemDialog']) {
          this.openCreateWatchlistItemDialog();
        }
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnInit() {
    this.loadWatchlistData();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private loadWatchlistData() {
    forkJoin({
      watchlistItems: this.dataService.fetchWatchlist(),
      allBenchmarks: this.dataService
        .fetchBenchmarks()
        .pipe(map((response) => response.benchmarks))
    })
      .pipe(
        takeUntil(this.unsubscribeSubject),
        map(({ watchlistItems, allBenchmarks }) => {
          const watchlistLookup = new Set(
            watchlistItems.map((item) => `${item.dataSource}:${item.symbol}`)
          );
          return allBenchmarks.filter((benchmark) =>
            watchlistLookup.has(`${benchmark.dataSource}:${benchmark.symbol}`)
          );
        })
      )
      .subscribe({
        next: (filteredBenchmarks) => {
          this.watchlist = filteredBenchmarks;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private openCreateWatchlistItemDialog() {
    this.userService
      .get()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((user) => {
        this.user = user;

        const dialogRef = this.dialog.open(CreateWatchlistItemDialog, {
          autoFocus: false,
          data: {
            deviceType: this.deviceType,
            locale: this.user?.settings?.locale
          } as CreateWatchlistItemDialogParams,
          width: this.deviceType === 'mobile' ? '100vw' : '50rem'
        });

        dialogRef
          .afterClosed()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe(({ dataSource, symbol } = {}) => {
            if (dataSource && symbol) {
              this.dataService
                .postWatchlist({ dataSource, symbol })
                .pipe(takeUntil(this.unsubscribeSubject))
                .subscribe({
                  next: () => this.loadWatchlistData()
                });
            }
            this.router.navigate(['.'], { relativeTo: this.route });
          });
      });
  }
}
