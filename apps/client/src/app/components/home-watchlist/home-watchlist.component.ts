import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  AssetProfileIdentifier,
  Benchmark,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { GfBenchmarkComponent } from '@ghostfolio/ui/benchmark';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CreateWatchlistItemDialogComponent } from './create-watchlist-item-dialog/create-watchlist-item-dialog.component';
import { CreateWatchlistItemDialogParams } from './create-watchlist-item-dialog/interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfBenchmarkComponent,
    GfPremiumIndicatorComponent,
    MatButtonModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-home-watchlist',
  styleUrls: ['./home-watchlist.scss'],
  templateUrl: './home-watchlist.html'
})
export class HomeWatchlistComponent implements OnDestroy, OnInit {
  public deviceType: string;
  public hasImpersonationId: boolean;
  public hasPermissionToCreateWatchlistItem: boolean;
  public hasPermissionToDeleteWatchlistItem: boolean;
  public user: User;
  public watchlist: Benchmark[];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private impersonationStorageService: ImpersonationStorageService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });

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

          this.hasPermissionToCreateWatchlistItem =
            !this.hasImpersonationId &&
            hasPermission(
              this.user.permissions,
              permissions.createWatchlistItem
            );
          this.hasPermissionToDeleteWatchlistItem =
            !this.hasImpersonationId &&
            hasPermission(
              this.user.permissions,
              permissions.deleteWatchlistItem
            );

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnInit() {
    this.loadWatchlistData();
  }

  public onWatchlistItemDeleted({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    this.dataService
      .deleteWatchlistItem({ dataSource, symbol })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: () => {
          return this.loadWatchlistData();
        }
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private loadWatchlistData() {
    this.dataService
      .fetchWatchlist()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ watchlist }) => {
        this.watchlist = watchlist.map(({ dataSource, symbol }) => ({
          dataSource,
          symbol,
          marketCondition: null,
          name: symbol,
          performances: null,
          trend50d: 'UNKNOWN',
          trend200d: 'UNKNOWN'
        }));

        this.changeDetectorRef.markForCheck();
      });
  }

  private openCreateWatchlistItemDialog() {
    this.userService
      .get()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((user) => {
        this.user = user;

        const dialogRef = this.dialog.open(CreateWatchlistItemDialogComponent, {
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
                .postWatchlistItem({ dataSource, symbol })
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
