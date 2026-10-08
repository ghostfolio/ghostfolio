import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DEFAULT_LOCALE } from '@ghostfolio/common/config';
import {
  AssetProfileIdentifier,
  Benchmark,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
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
import { RouterModule } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';

import { HomeWatchlistService } from './home-watchlist.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfBenchmarkComponent,
    GfFabComponent,
    GfPremiumIndicatorComponent,
    RouterModule
  ],
  providers: [HomeWatchlistService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-home-watchlist',
  styleUrls: ['./home-watchlist.scss'],
  templateUrl: './home-watchlist.html'
})
export class GfHomeWatchlistComponent implements OnInit {
  protected readonly DEFAULT_LOCALE = DEFAULT_LOCALE;
  protected readonly internalRoutes = internalRoutes;

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
  private readonly homeWatchlistService = inject(HomeWatchlistService);
  private readonly userService = inject(UserService);

  public constructor() {
    this.homeWatchlistService.refresh$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadWatchlistData();
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
}
