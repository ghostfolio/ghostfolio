import { GfAccessTableComponent } from '@ghostfolio/client/components/access-table/access-table.component';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import { Access, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { GfFabComponent } from '@ghostfolio/ui/fab';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, eyeOffOutline, eyeOutline } from 'ionicons/icons';
import { EMPTY } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfAccessTableComponent,
    GfFabComponent,
    GfPremiumIndicatorComponent,
    IonIcon,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-user-account-access',
  styleUrls: ['./user-account-access.scss'],
  templateUrl: './user-account-access.html'
})
export class GfUserAccountAccessComponent {
  protected accessesGet: Access[];
  protected accessesGive: Access[];
  protected hasImpersonationId: boolean;
  protected hasPermissionToCreateAccess: boolean;
  protected hasPermissionToDeleteAccess: boolean;
  protected hasPermissionToUpdateOwnAccessToken: boolean;
  protected readonly internalRoutes = internalRoutes;
  protected isAccessTokenHidden = true;
  protected readonly updateOwnAccessTokenForm = new FormGroup({
    accessToken: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });
  protected user: User;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly impersonationStorageService = inject(
    ImpersonationStorageService
  );
  private readonly notificationService = inject(NotificationService);
  private readonly userService = inject(UserService);

  public constructor() {
    const { globalPermissions } = this.dataService.fetchInfo();

    this.hasPermissionToDeleteAccess = hasPermission(
      globalPermissions,
      permissions.deleteAccess
    );

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;

        this.changeDetectorRef.markForCheck();
      });

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToCreateAccess = hasPermission(
            this.user.permissions,
            permissions.createAccess
          );

          this.hasPermissionToDeleteAccess = hasPermission(
            this.user.permissions,
            permissions.deleteAccess
          );

          this.hasPermissionToUpdateOwnAccessToken = hasPermission(
            this.user.permissions,
            permissions.updateOwnAccessToken
          );

          this.update();

          this.changeDetectorRef.markForCheck();
        }
      });

    addIcons({ addOutline, eyeOffOutline, eyeOutline });
  }

  protected onDeleteAccess(aId: string) {
    this.dataService
      .deleteAccess(aId)
      .pipe(
        catchError(() => {
          this.notificationService.alert({
            title: $localize`Oops! Could not revoke the granted access.`
          });

          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.update();
      });
  }

  protected onDeleteReceivedAccess(aId: string) {
    this.dataService
      .deleteAccess(aId)
      .pipe(
        switchMap(() => {
          return this.userService.get(true);
        }),
        catchError(() => {
          this.notificationService.alert({
            title: $localize`Oops! Could not remove the received access.`
          });

          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  protected onGenerateAccessToken() {
    this.notificationService.confirm({
      confirmFn: () => {
        this.dataService
          .updateOwnAccessToken({
            accessToken:
              this.updateOwnAccessTokenForm.controls.accessToken.value
          })
          .pipe(
            catchError(() => {
              this.notificationService.alert({
                title: $localize`Oops! Incorrect Security Token.`
              });

              return EMPTY;
            }),
            takeUntilDestroyed(this.destroyRef)
          )
          .subscribe(({ accessToken }) => {
            this.notificationService.alert({
              discardFn: () => {
                this.userService.signOut();

                document.location.href = `/${document.documentElement.lang}`;
              },
              message: accessToken,
              title: $localize`Security token`
            });
          });
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to generate a new security token?`
    });
  }

  private update() {
    this.accessesGet = this.user.access.map(
      ({ alias, expiresAt, id, lastUsedAt, scopes }) => {
        return {
          expiresAt,
          id,
          lastUsedAt,
          scopes,
          alias: alias ?? '',
          grantee: $localize`Me`,
          type: 'PRIVATE'
        };
      }
    );

    this.dataService
      .fetchAccesses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((accesses) => {
        this.accessesGive = accesses;

        this.changeDetectorRef.markForCheck();
      });
  }
}
