import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DEFAULT_LOCALE } from '@ghostfolio/common/config';
import {
  AssetProfileIdentifier,
  Benchmark,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { hasScope, scopes } from '@ghostfolio/common/scopes';
import { GfBenchmarkComponent } from '@ghostfolio/ui/benchmark';
import { GfFabComponent } from '@ghostfolio/ui/fab';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';

import { GfCreateWatchlistItemDialogComponent } from './create-watchlist-item-dialog/create-watchlist-item-dialog.component';
import { CreateWatchlistItemDialogParams } from './create-watchlist-item-dialog/interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfBenchmarkComponent,
    GfFabComponent,
    GfPremiumIndicatorComponent,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-home-watchlist',
  styleUrls: ['./home-watchlist.scss'],
  templateUrl: './home-watchlist.html'
})
export class GfHomeWatchlistComponent implements OnInit {
  protected hasPermissionToCreateWatchlistItem: boolean;
  protected hasPermissionToDeleteWatchlistItem: boolean;
  protected user: User;
  protected watchlist: Benchmark[];

  protected readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public constructor() {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params['createWatchlistItemDialog']) {
          this.openCreateWatchlistItemDialog();
        }
      });

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToCreateWatchlistItem =
            hasPermission(
              this.user.permissions,
              permissions.createWatchlistItem
            ) && hasScope(this.user.scopes, scopes.watchlistCreate);
          this.hasPermissionToDeleteWatchlistItem =
            hasPermission(
              this.user.permissions,
              permissions.deleteWatchlistItem
            ) && hasScope(this.user.scopes, scopes.watchlistDelete);

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnInit() {
    this.loadWatchlistData();
  }

  protected onWatchlistItemDeleted({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    this.dataService
      .deleteWatchlistItem({ dataSource, symbol })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          return this.loadWatchlistData();
        }
      });
  }

  private loadWatchlistData() {
    this.dataService
      .fetchWatchlist()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          this.watchlist = [];

          this.changeDetectorRef.markForCheck();
        },
        next: ({ watchlist }) => {
          this.watchlist = watchlist ?? [];

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private openCreateWatchlistItemDialog() {
    this.userService
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.user = user;

        if (
          !hasPermission(user?.permissions, permissions.createWatchlistItem) ||
          !hasScope(user?.scopes, scopes.watchlistCreate)
        ) {
          this.router.navigate(['.'], { relativeTo: this.route });

          return;
        }

        const dialogRef = this.dialog.open<
          GfCreateWatchlistItemDialogComponent,
          CreateWatchlistItemDialogParams
        >(GfCreateWatchlistItemDialogComponent, {
          data: {
            deviceType: this.deviceType(),
            locale: this.user?.settings?.locale ?? DEFAULT_LOCALE
          },
          width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
        });

        dialogRef
          .afterClosed()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(({ dataSource, symbol } = {}) => {
            if (dataSource && symbol) {
              this.dataService
                .postWatchlistItem({ dataSource, symbol })
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                  next: () => this.loadWatchlistData()
                });
            }

            this.router.navigate(['.'], { relativeTo: this.route });
          });
      });
  }
}
