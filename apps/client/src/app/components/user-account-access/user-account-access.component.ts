import { CreateAccessDto } from '@ghostfolio/api/app/access/create-access.dto';
import { GfPortfolioAccessTableModule } from '@ghostfolio/client/components/access-table/access-table.module';
import { ConfirmationDialogType } from '@ghostfolio/client/core/notification/confirmation-dialog/confirmation-dialog.type';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { Access, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, eyeOffOutline, eyeOutline } from 'ionicons/icons';
import { DeviceDetectorService } from 'ngx-device-detector';
import { EMPTY, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { CreateOrUpdateAccessDialog } from './create-or-update-access-dialog/create-or-update-access-dialog.component';
import { GfCreateOrUpdateAccessDialogModule } from './create-or-update-access-dialog/create-or-update-access-dialog.module';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'has-fab' },
  imports: [
    CommonModule,
    GfCreateOrUpdateAccessDialogModule,
    GfPortfolioAccessTableModule,
    GfPremiumIndicatorComponent,
    IonIcon,
    MatButtonModule,
    MatDialogModule,
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
export class GfUserAccountAccessComponent implements OnDestroy, OnInit {
  public accessesGet: Access[];
  public accessesGive: Access[];
  public deviceType: string;
  public hasPermissionToCreateAccess: boolean;
  public hasPermissionToDeleteAccess: boolean;
  public hasPermissionToUpdateOwnAccessToken: boolean;
  public isAccessTokenHidden = true;
  public updateOwnAccessTokenForm = this.formBuilder.group({
    accessToken: ['', Validators.required]
  });
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private tokenStorageService: TokenStorageService,
    private userService: UserService
  ) {
    const { globalPermissions } = this.dataService.fetchInfo();

    this.hasPermissionToDeleteAccess = hasPermission(
      globalPermissions,
      permissions.deleteAccess
    );

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
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

          this.changeDetectorRef.markForCheck();
        }
      });

    this.route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (params['createDialog']) {
          this.openCreateAccessDialog();
        }
      });

    addIcons({ addOutline, eyeOffOutline, eyeOutline });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.update();
  }

  public onDeleteAccess(aId: string) {
    this.dataService
      .deleteAccess(aId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: () => {
          this.update();
        }
      });
  }

  public onGenerateAccessToken() {
    this.notificationService.confirm({
      confirmFn: () => {
        this.dataService
          .updateOwnAccessToken({
            accessToken: this.updateOwnAccessTokenForm.get('accessToken').value
          })
          .pipe(
            catchError(() => {
              this.notificationService.alert({
                title: $localize`Oops! Incorrect Security Token.`
              });

              return EMPTY;
            }),
            takeUntil(this.unsubscribeSubject)
          )
          .subscribe(({ accessToken }) => {
            this.notificationService.alert({
              discardFn: () => {
                this.tokenStorageService.signOut();
                this.userService.remove();

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

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private openCreateAccessDialog() {
    const dialogRef = this.dialog.open(CreateOrUpdateAccessDialog, {
      data: {
        access: {
          alias: '',
          permissions: ['READ_RESTRICTED'],
          type: 'PRIVATE'
        }
      },
      height: this.deviceType === 'mobile' ? '98vh' : undefined,
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef.afterClosed().subscribe((access: CreateAccessDto | null) => {
      if (access) {
        this.update();
      }

      this.router.navigate(['.'], { relativeTo: this.route });
    });
  }

  private update() {
    this.accessesGet = this.user.access.map(({ alias, id, permissions }) => {
      return {
        alias,
        id,
        permissions,
        grantee: $localize`Me`,
        type: 'PRIVATE'
      };
    });

    this.dataService
      .fetchAccesses()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((accesses) => {
        this.accessesGive = accesses;

        this.changeDetectorRef.markForCheck();
      });
  }
}
