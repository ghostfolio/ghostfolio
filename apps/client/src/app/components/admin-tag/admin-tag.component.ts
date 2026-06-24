import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DEFAULT_PAGE_SIZE } from '@ghostfolio/common/config';
import { CreateTagDto, UpdateTagDto } from '@ghostfolio/common/dtos';
import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import { getLocale, getLowercase } from '@ghostfolio/common/helper';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
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
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    RouterModule
  ],
  selector: 'gf-admin-tag',
  styleUrls: ['./admin-tag.component.scss'],
  templateUrl: './admin-tag.component.html'
})
export class GfAdminTagComponent implements OnInit {
  public readonly locale = input(getLocale());

  protected dataSource = new MatTableDataSource<Tag>();
  protected readonly displayedColumns = [
    'name',
    'userId',
    'activities',
    'actions'
  ];
  protected readonly pageSize = DEFAULT_PAGE_SIZE;
  protected tags: Tag[];

  private readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );
  private readonly paginator = viewChild.required(MatPaginator);
  private readonly sort = viewChild.required(MatSort);

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly dialog = inject(MatDialog);
  private readonly notificationService = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public constructor() {
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

            if (tag) {
              this.openUpdateTagDialog(tag);
            }
          } else {
            this.router.navigate(['.'], { relativeTo: this.route });
          }
        }
      });

    addIcons({ createOutline, ellipsisHorizontal, trashOutline });
  }

  public ngOnInit() {
    this.fetchTags();
  }

  protected onDeleteTag(aId: string) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.deleteTag(aId);
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete this tag?`
    });
  }

  protected onUpdateTag({ id }: Tag) {
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
        this.dataSource.paginator = this.paginator();
        this.dataSource.sort = this.sort();
        this.dataSource.sortingDataAccessor = getLowercase;

        this.dataService.updateInfo();

        this.changeDetectorRef.markForCheck();
      });
  }

  private openCreateTagDialog() {
    const dialogRef = this.dialog.open<
      GfCreateOrUpdateTagDialogComponent,
      CreateOrUpdateTagDialogParams
    >(GfCreateOrUpdateTagDialogComponent, {
      data: {} satisfies CreateOrUpdateTagDialogParams,
      height: this.deviceType() === 'mobile' ? '98vh' : undefined,
      width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
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
      } satisfies CreateOrUpdateTagDialogParams,
      height: this.deviceType() === 'mobile' ? '98vh' : undefined,
      width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
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
