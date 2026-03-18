import { FamilyOfficeDataService } from '@ghostfolio/client/services/family-office-data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { NotificationService } from '@ghostfolio/ui/notifications';

import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
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

import { GfAddAssetDialogComponent } from './add-asset-dialog/add-asset-dialog.component';
import { GfAddMemberDialogComponent } from './add-member-dialog/add-member-dialog.component';
import { GfRecordValuationDialogComponent } from './record-valuation-dialog/record-valuation-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [
    CommonModule,
    MatButtonModule,
    MatTableModule,
    MatTabsModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-partnership-detail-page',
  styleUrls: ['./partnership-detail-page.scss'],
  templateUrl: './partnership-detail-page.html'
})
export class GfPartnershipDetailPageComponent implements OnInit {
  public assetColumns = [
    'name',
    'assetType',
    'acquisitionCost',
    'currentValue'
  ];
  public deviceType: string;
  public entities: any[] = [];
  public hasPermissionToDelete = false;
  public hasPermissionToUpdate = false;
  public memberColumns = [
    'entityName',
    'classType',
    'ownershipPercent',
    'capitalCommitment',
    'capitalContributed'
  ];
  public partnership: any;
  public user: User;
  public valuationColumns = ['date', 'nav', 'source'];
  public valuations: any[] = [];

  private partnershipId: string;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
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
    this.partnershipId = this.route.snapshot.paramMap.get('id');

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;
          this.hasPermissionToUpdate = hasPermission(
            this.user.permissions,
            permissions.updatePartnership
          );
          this.hasPermissionToDelete = hasPermission(
            this.user.permissions,
            permissions.deletePartnership
          );
          this.changeDetectorRef.markForCheck();
        }
      });

    this.fetchPartnershipDetail();
    this.fetchValuations();
    this.fetchEntities();
  }

  public onAddMember() {
    const dialogRef = this.dialog.open(GfAddMemberDialogComponent, {
      data: { entities: this.entities },
      height: this.deviceType === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          this.familyOfficeDataService
            .addPartnershipMember(this.partnershipId, result)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.fetchPartnershipDetail();
            });
        }
      });
  }

  public onAddAsset() {
    const dialogRef = this.dialog.open(GfAddAssetDialogComponent, {
      data: { currency: this.partnership?.currency ?? 'USD' },
      height: this.deviceType === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          this.familyOfficeDataService
            .addPartnershipAsset(this.partnershipId, result)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.fetchPartnershipDetail();
            });
        }
      });
  }

  public onRecordValuation() {
    const dialogRef = this.dialog.open(GfRecordValuationDialogComponent, {
      data: { currency: this.partnership?.currency ?? 'USD' },
      height: this.deviceType === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          this.familyOfficeDataService
            .createPartnershipValuation(this.partnershipId, result)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.fetchPartnershipDetail();
              this.fetchValuations();
            });
        }
      });
  }

  public onDeletePartnership() {
    this.notificationService.confirm({
      confirmFn: () => {
        this.familyOfficeDataService
          .deletePartnership(this.partnershipId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            this.router.navigate(['/partnerships']);
          });
      },
      confirmType: undefined,
      message: $localize`Do you really want to delete this partnership?`,
      title: $localize`Delete Partnership`
    });
  }

  private fetchEntities() {
    this.familyOfficeDataService
      .fetchEntities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((entities) => {
        this.entities = entities;
        this.changeDetectorRef.markForCheck();
      });
  }

  private fetchPartnershipDetail() {
    this.familyOfficeDataService
      .fetchPartnership(this.partnershipId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((partnership) => {
        this.partnership = partnership;
        this.changeDetectorRef.markForCheck();
      });
  }

  private fetchValuations() {
    this.familyOfficeDataService
      .fetchPartnershipValuations(this.partnershipId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((valuations) => {
        this.valuations = valuations;
        this.changeDetectorRef.markForCheck();
      });
  }
}
