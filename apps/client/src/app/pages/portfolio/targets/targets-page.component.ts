import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { Filter, PortfolioTargetProfile, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import {
  calculatePortfolioTargets,
  TargetAllocationResult
} from '@ghostfolio/common/portfolio-targets/portfolio-targets-calculator';
import { hasScope, scopes } from '@ghostfolio/common/scopes';
import { AssetClass } from '@ghostfolio/prisma/enums';
import { translate } from '@ghostfolio/ui/i18n';
import { DataService } from '@ghostfolio/ui/services';

import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { finalize, switchMap } from 'rxjs';

import { GfTargetConfigurationDialogComponent } from './target-configuration-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  selector: 'gf-targets-page',
  styleUrls: ['./targets-page.component.scss'],
  templateUrl: './targets-page.component.html'
})
export class GfTargetsPageComponent implements OnInit {
  protected user: User;
  protected profile?: PortfolioTargetProfile;
  protected result?: TargetAllocationResult;
  protected selectedAccountId = '';
  protected isLoading = true;
  protected isSaving = false;
  protected hasError = false;
  protected canEdit = false;
  protected readonly labels: Record<string, string> = Object.fromEntries(
    Object.values(AssetClass).map((assetClass) => [assetClass, translate(assetClass)])
  );
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly impersonationService = inject(ImpersonationStorageService);
  private readonly userService = inject(UserService);
  private isImpersonating = false;

  public ngOnInit() {
    this.impersonationService.onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        this.isImpersonating = !!id;
        this.updateEditingPermission();
      });

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (!state?.user) {
          return;
        }
        this.user = state.user;
        this.profile = this.user.settings.portfolioTargets?.profiles.find(
          ({ id }) => id === this.user.settings.portfolioTargets?.activeProfileId
        );
        this.updateEditingPermission();
        this.fetchAllocations();
      });
  }

  protected get accounts() {
    return this.user?.accounts ?? [];
  }

  protected get hasReadValues() {
    return hasScope(this.user?.scopes, scopes.portfolioReadValues) &&
      !this.user?.settings?.isRestrictedView;
  }

  protected get displayedRows() {
    return this.result?.rows ?? [];
  }

  protected formatClass(assetClass: string) {
    return assetClass === UNKNOWN_KEY
      ? $localize`Unclassified`
      : this.labels[assetClass] ?? assetClass;
  }

  protected changeAccount(accountId: string) {
    this.selectedAccountId = accountId;
    this.fetchAllocations();
  }

  protected openConfiguration() {
    if (!this.canEdit || !this.user) {
      return;
    }

    const ref = this.dialog.open(GfTargetConfigurationDialogComponent, {
      autoFocus: false,
      maxWidth: '96vw',
      width: '820px',
      data: { profile: this.profile, user: this.user }
    });

    ref.afterClosed().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile?: PortfolioTargetProfile) => {
        if (!profile) {
          return;
        }
        this.isSaving = true;
        this.dataService.putUserSetting({
          portfolioTargets: {
            version: 1,
            activeProfileId: 'global',
            profiles: [{ ...profile, id: 'global' }]
          }
        }).pipe(
          switchMap(() => this.userService.get(true)),
          finalize(() => {
            this.isSaving = false;
            this.changeDetectorRef.markForCheck();
          }),
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          error: () => {
            this.hasError = true;
            this.changeDetectorRef.markForCheck();
          }
        });
      });
  }

  private updateEditingPermission() {
    this.canEdit = !!this.user && !this.isImpersonating &&
      hasPermission(this.user.permissions, permissions.updateUserSettings);
    this.changeDetectorRef.markForCheck();
  }

  private fetchAllocations() {
    if (!this.user) {
      return;
    }

    this.isLoading = true;
    this.hasError = false;
    this.result = undefined;

    const filters: Filter[] = this.selectedAccountId
      ? [{ type: 'ACCOUNT', id: this.selectedAccountId }]
      : [];

    this.dataService.fetchPortfolioDetails({ filters })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (details) => {
          if (this.profile) {
            if (!this.hasReadValues || ('hasError' in details && details.hasError)) {
              this.result = undefined;
              this.hasError = true;
            } else {
              this.result = calculatePortfolioTargets({
                details,
                targets: this.profile.allocations,
                tolerance: this.profile.tolerance
              });
            }
          }
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.hasError = true;
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }
}
