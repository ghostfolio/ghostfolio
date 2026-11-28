import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  TAG_ID_EXCLUDE_FROM_ANALYSIS,
  UNKNOWN_KEY
} from '@ghostfolio/common/config';
import {
  AccountsResponse,
  Filter,
  PortfolioTargetProfile,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import {
  calculatePortfolioTargets,
  TargetAllocationResult,
  TargetAllocationRow
} from '@ghostfolio/common/portfolio-targets/portfolio-targets-calculator';
import { hasScope, scopes } from '@ghostfolio/common/scopes';
import { AssetClass } from '@ghostfolio/prisma/enums';
import { translate } from '@ghostfolio/ui/i18n';
import { DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  LOCALE_ID,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { of, Subscription, finalize, switchMap } from 'rxjs';

import { GfTargetConfigurationDialogComponent } from './target-configuration-dialog.component';
import {
  GfTargetPercentPipe,
  getTargetNumberLocale
} from './target-percent.pipe';
import { getTargetProfileName } from './target-presets';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfTargetPercentPipe,
    GfValueComponent,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule
  ],
  selector: 'gf-targets-page',
  styleUrls: ['./targets-page.scss'],
  templateUrl: './targets-page.html'
})
export class GfTargetsPageComponent implements OnInit {
  protected user?: User;
  protected accounts: AccountsResponse['accounts'] = [];
  protected hasSaveError = false;
  protected profile?: PortfolioTargetProfile;
  protected result?: TargetAllocationResult;
  protected selectedAccountId = '';
  protected isLoading = true;
  protected isSaving = false;
  protected hasError = false;
  protected canEdit = false;
  protected readonly labels: Record<string, string> = Object.fromEntries(
    Object.values(AssetClass).map((assetClass) => [
      assetClass,
      translate(assetClass)
    ])
  );
  private readonly defaultLocale = inject(LOCALE_ID);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly impersonationService = inject(ImpersonationStorageService);
  private readonly userService = inject(UserService);
  private isImpersonating = false;
  private allocationRequest?: Subscription;
  private draftProfile?: PortfolioTargetProfile;
  private contextVersion = 0;

  public ngOnInit() {
    this.impersonationService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        this.contextVersion++;
        this.draftProfile = undefined;
        this.isImpersonating = !!id;
        this.allocationRequest?.unsubscribe();
        this.result = undefined;
        this.accounts = [];
        this.selectedAccountId = '';
        this.updateEditingPermission();
      });

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (!state?.user) {
          this.contextVersion++;
          this.allocationRequest?.unsubscribe();
          this.user = undefined;
          this.profile = undefined;
          this.result = undefined;
          this.accounts = [];
          this.draftProfile = undefined;
          this.isLoading = false;
          this.updateEditingPermission();
          return;
        }
        if (this.user?.id !== state.user.id) {
          this.contextVersion++;
          this.draftProfile = undefined;
          this.selectedAccountId = '';
        }
        this.user = state.user;
        this.profile = this.user.settings.portfolioTargets?.profiles.find(
          ({ id }) =>
            id === state.user.settings.portfolioTargets?.activeProfileId
        );
        this.updateEditingPermission();
        this.fetchAllocations();
      });
  }

  protected get profileName() {
    return this.profile ? getTargetProfileName(this.profile) : undefined;
  }

  protected get hasReadValues() {
    return (
      hasScope(this.user?.scopes, scopes.portfolioReadValues) &&
      !this.user?.settings?.isRestrictedView
    );
  }

  protected get displayedRows() {
    return this.result?.rows ?? [];
  }

  protected formatClass(assetClass: string) {
    return assetClass === UNKNOWN_KEY
      ? $localize`Unclassified`
      : (this.labels[assetClass] ?? assetClass);
  }

  protected allocationTooltip(row: TargetAllocationRow) {
    if (!this.hasReadValues || this.result?.status !== 'ready') {
      return '';
    }

    const locale = getTargetNumberLocale(
      this.user?.settings.locale,
      this.defaultLocale
    );
    const percent = new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: 2
    });
    const actual = percent.format(row.actual);
    const target = percent.format(row.target);
    const deviation = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
      signDisplay: 'exceptZero'
    }).format(row.drift * 100);
    const currency = this.user?.settings.baseCurrency;
    const value = currency
      ? new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          maximumFractionDigits: 2
        }).format(row.actual * this.result.totalValue)
      : undefined;

    return [
      this.formatClass(row.assetClass),
      value
        ? $localize`Actual: ${actual} (${value})`
        : $localize`Actual: ${actual}`,
      $localize`Target: ${target}`,
      $localize`Deviation: ${deviation} percentage points`,
      row.outOfTolerance
        ? $localize`Outside tolerance`
        : $localize`Within tolerance`
    ].join('\n');
  }

  protected changeAccount(accountId: string) {
    this.selectedAccountId = accountId;
    this.fetchAllocations();
  }

  protected openConfiguration() {
    if (!this.canEdit || !this.user || this.isSaving) {
      return;
    }

    const contextVersion = this.contextVersion;
    const ref = this.dialog.open(GfTargetConfigurationDialogComponent, {
      maxWidth: '96vw',
      width: '820px',
      data: { profile: this.draftProfile ?? this.profile, user: this.user }
    });

    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile?: PortfolioTargetProfile) => {
        if (
          !profile ||
          !this.canEdit ||
          this.isSaving ||
          contextVersion !== this.contextVersion
        ) {
          return;
        }
        this.draftProfile = profile;
        this.isSaving = true;
        this.hasSaveError = false;
        this.dataService
          .putUserSetting({
            portfolioTargets: {
              version: 1,
              activeProfileId: 'global',
              profiles: [{ ...profile, id: 'global' }]
            }
          })
          .pipe(
            switchMap(() => this.userService.get(true)),
            finalize(() => {
              this.isSaving = false;
              this.changeDetectorRef.markForCheck();
            }),
            takeUntilDestroyed(this.destroyRef)
          )
          .subscribe({
            next: () => {
              this.draftProfile = undefined;
            },
            error: () => {
              this.hasSaveError = true;
              this.changeDetectorRef.markForCheck();
            }
          });
      });
  }

  private updateEditingPermission() {
    this.canEdit =
      !!this.user &&
      !this.isImpersonating &&
      hasPermission(this.user.permissions, permissions.updateUserSettings);
    this.changeDetectorRef.markForCheck();
  }

  private fetchAllocations() {
    if (!this.user) {
      return;
    }

    this.allocationRequest?.unsubscribe();
    this.isLoading = true;
    this.hasError = false;
    this.result = undefined;
    this.changeDetectorRef.markForCheck();

    if (!this.hasReadValues) {
      this.accounts = [];
      this.isLoading = false;
      return;
    }

    this.allocationRequest = (
      hasScope(this.user.scopes, scopes.accountRead)
        ? this.dataService.fetchAccounts({ filters: [] })
        : of({ accounts: [] as AccountsResponse['accounts'] })
    )
      .pipe(
        switchMap(({ accounts }) => {
          this.accounts = accounts.filter(
            (account) =>
              !account.tags?.some(
                ({ id }) => id === TAG_ID_EXCLUDE_FROM_ANALYSIS
              )
          );
          if (!this.accounts.some(({ id }) => id === this.selectedAccountId)) {
            this.selectedAccountId = '';
          }
          const filters: Filter[] = this.selectedAccountId
            ? [{ type: 'ACCOUNT', id: this.selectedAccountId }]
            : [];
          return this.dataService.fetchPortfolioDetails({ filters });
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (details) => {
          if (this.profile) {
            if (!this.hasReadValues) {
              this.hasError = true;
            } else {
              this.result = calculatePortfolioTargets({
                details,
                targets: this.profile.allocations,
                tolerance: this.profile.tolerance
              });
              // Known negative exposures remain an unsupported financial case,
              // even when the backend also reports valuation errors. No
              // percentages are shown for either state.
              if (
                'hasError' in details &&
                details.hasError &&
                this.result.status !== 'unsupported'
              ) {
                this.result = undefined;
                this.hasError = true;
              }
            }
          }
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.accounts = [];
          this.hasError = true;
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }
}
