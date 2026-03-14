import { UserService } from '@ghostfolio/client/services/user/user.service';
import { CreateTagDto, UpdateTagDto } from '@ghostfolio/common/dtos';
import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import { getLocale } from '@ghostfolio/common/helper';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Input,
  OnInit,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { Tag } from '@prisma/client';
import { addIcons } from 'ionicons';
import {
  createOutline,
  ellipsisHorizontal,
  trashOutline
} from 'ionicons/icons';
import { get } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';

import { GfCreateOrUpdateTagDialogComponent } from './create-or-update-tag-dialog/create-or-update-tag-dialog.component';
import { CreateOrUpdateTagDialogParams } from './create-or-update-tag-dialog/interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule,
    RouterModule
  ],
  selector: 'gf-admin-tag',
  styleUrls: ['./admin-tag.component.scss'],
  templateUrl: './admin-tag.component.html'
})
export class GfAdminTagComponent implements OnInit {
  @Input() locale = getLocale();

  @ViewChild(MatSort) sort: MatSort;

  public dataSource = new MatTableDataSource<Tag>();
  public deviceType: string;
  public displayedColumns = ['name', 'userId', 'activities', 'actions'];
  public tags: Tag[];

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params['createTagDialog']) {
          this.openCreateTagDialog();
        } else if (params['editTagDialog']) {
          if (this.tags) {
            const tag = this.tags.find(({ id }) => {
              return id === params['tagId'];
            });

            this.openUpdateTagDialog(tag);
          } else {
            this.router.navigate(['.'], { relativeTo: this.route });
          }
        }
      });

    addIcons({ createOutline, ellipsisHorizontal, trashOutline });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.fetchTags();
  }

  public onDeleteTag(aId: string) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.deleteTag(aId);
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete this tag?`
    });
  }

  public onUpdateTag({ id }: Tag) {
    this.router.navigate([], {
      queryParams: { editTagDialog: true, tagId: id }
    });
  }

  private deleteTag(aId: string) {
    this.dataService
      .deleteTag(aId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.userService
            .get(true)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();

          this.fetchTags();
        }
      });
  }

  private fetchTags() {
    this.dataService
      .fetchTags()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tags) => {
        this.tags = tags;

        this.dataSource = new MatTableDataSource(this.tags);
        this.dataSource.sort = this.sort;
        this.dataSource.sortingDataAccessor = get;

        this.dataService.updateInfo();

        this.changeDetectorRef.markForCheck();
      });
  }

  private openCreateTagDialog() {
    const dialogRef = this.dialog.open<
      GfCreateOrUpdateTagDialogComponent,
      CreateOrUpdateTagDialogParams
    >(GfCreateOrUpdateTagDialogComponent, {
      data: {
        tag: {
          id: null,
          name: null
        }
      },
      height: this.deviceType === 'mobile' ? '98vh' : undefined,
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tag: CreateTagDto | null) => {
        if (tag) {
          this.dataService
            .postTag(tag)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.userService
                  .get(true)
                  .pipe(takeUntilDestroyed(this.destroyRef))
                  .subscribe();

                this.fetchTags();
              }
            });
        }

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }

  private openUpdateTagDialog({ id, name }: { id: string; name: string }) {
    const dialogRef = this.dialog.open<
      GfCreateOrUpdateTagDialogComponent,
      CreateOrUpdateTagDialogParams
    >(GfCreateOrUpdateTagDialogComponent, {
      data: {
        tag: {
          id,
          name
        }
      },
      height: this.deviceType === 'mobile' ? '98vh' : undefined,
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tag: UpdateTagDto | null) => {
        if (tag) {
          this.dataService
            .putTag(tag)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.userService
                  .get(true)
                  .pipe(takeUntilDestroyed(this.destroyRef))
                  .subscribe();

                this.fetchTags();
              }
            });
        }

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }
}
