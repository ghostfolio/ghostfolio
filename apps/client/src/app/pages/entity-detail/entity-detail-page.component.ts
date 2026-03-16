import { FamilyOfficeDataService } from '@ghostfolio/client/services/family-office-data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { addOutline, arrowBackOutline } from 'ionicons/icons';
import { DeviceDetectorService } from 'ngx-device-detector';

import { GfAddOwnershipDialogComponent } from './add-ownership-dialog/add-ownership-dialog.component';
import { AddOwnershipDialogParams } from './add-ownership-dialog/interfaces/interfaces';

@Component({
  host: { class: 'page' },
  imports: [
    CommonModule,
    MatButtonModule,
    MatTableModule,
    MatTabsModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-entity-detail-page',
  styleUrls: ['./entity-detail-page.scss'],
  templateUrl: './entity-detail-page.html'
})
export class GfEntityDetailPageComponent implements OnInit {
  public accounts: { id: string; name: string }[] = [];
  public deviceType: string;
  public distributions: any[] = [];
  public distributionColumns = ['partnershipName', 'type', 'amount', 'date'];
  public entity: any;
  public hasPermissionToCreate = false;
  public hasPermissionToDelete = false;
  public hasPermissionToUpdate = false;
  public kDocuments: any[] = [];
  public kDocumentColumns = ['taxYear', 'partnershipName', 'status'];
  public membershipColumns = [
    'partnershipName',
    'ownershipPercent',
    'allocatedNav'
  ];
  public ownershipColumns = [
    'accountName',
    'ownershipPercent',
    'effectiveDate'
  ];
  public user: User;

  private entityId: string;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private familyOfficeDataService: FamilyOfficeDataService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    addIcons({ addOutline, arrowBackOutline });
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
  }

  public ngOnInit() {
    this.entityId = this.route.snapshot.paramMap.get('id');

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;
          this.hasPermissionToCreate = hasPermission(
            this.user.permissions,
            permissions.createEntity
          );
          this.hasPermissionToUpdate = hasPermission(
            this.user.permissions,
            permissions.updateEntity
          );
          this.hasPermissionToDelete = hasPermission(
            this.user.permissions,
            permissions.deleteEntity
          );
          this.changeDetectorRef.markForCheck();
        }
      });

    this.fetchEntityDetail();
    this.fetchDistributions();
    this.fetchKDocuments();
    this.fetchAccounts();
  }

  public onAddOwnership() {
    const dialogRef = this.dialog.open(GfAddOwnershipDialogComponent, {
      data: {
        entityId: this.entityId,
        accounts: this.accounts
      } as AddOwnershipDialogParams,
      height: this.deviceType === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          this.familyOfficeDataService
            .createOwnership(this.entityId, result)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.fetchEntityDetail();
            });
        }
      });
  }

  public onDeleteEntity() {
    this.notificationService.confirm({
      confirmFn: () => {
        this.familyOfficeDataService
          .deleteEntity(this.entityId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            this.router.navigate(['/entities']);
          });
      },
      confirmType: undefined,
      message: $localize`Do you really want to delete this entity?`,
      title: $localize`Delete Entity`
    });
  }

  private fetchAccounts() {
    this.dataService
      .fetchAccounts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ accounts }) => {
        this.accounts = accounts.map((a) => ({ id: a.id, name: a.name }));
        this.changeDetectorRef.markForCheck();
      });
  }

  private fetchEntityDetail() {
    this.familyOfficeDataService
      .fetchEntity(this.entityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((entity) => {
        this.entity = entity;
        this.changeDetectorRef.markForCheck();
      });
  }

  private fetchDistributions() {
    this.familyOfficeDataService
      .fetchEntityDistributions(this.entityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: any) => {
        this.distributions = result.distributions ?? [];
        this.changeDetectorRef.markForCheck();
      });
  }

  private fetchKDocuments() {
    this.familyOfficeDataService
      .fetchEntityKDocuments(this.entityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((kDocuments) => {
        this.kDocuments = kDocuments;
        this.changeDetectorRef.markForCheck();
      });
  }
}
