import { CreateTagDto } from '@ghostfolio/api/app/tag/create-tag.dto';
import { UpdateTagDto } from '@ghostfolio/api/app/tag/update-tag.dto';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { Tag } from '@prisma/client';
import { get } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, takeUntil } from 'rxjs';

import { CreateOrUpdateTagDialog } from './create-or-update-tag-dialog/create-or-update-tag-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-admin-tag',
  styleUrls: ['./admin-tag.component.scss'],
  templateUrl: './admin-tag.component.html'
})
export class AdminTagComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort) sort: MatSort;

  public dataSource: MatTableDataSource<Tag> = new MatTableDataSource();
  public deviceType: string;
  public displayedColumns = ['name', 'activities', 'actions'];
  public tags: Tag[];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
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
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.fetchTags();
  }

  public onDeleteTag(aId: string) {
    const confirmation = confirm(
      $localize`Do you really want to delete this tag?`
    );

    if (confirmation) {
      this.deleteTag(aId);
    }
  }

  public onUpdateTag({ id }: Tag) {
    this.router.navigate([], {
      queryParams: { editTagDialog: true, tagId: id }
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private deleteTag(aId: string) {
    this.adminService
      .deleteTag(aId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: () => {
          this.userService
            .get(true)
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe();

          this.fetchTags();
        }
      });
  }

  private fetchTags() {
    this.adminService
      .fetchTags()
      .pipe(takeUntil(this.unsubscribeSubject))
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
    const dialogRef = this.dialog.open(CreateOrUpdateTagDialog, {
      data: {
        tag: {
          name: null
        }
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        const tag: CreateTagDto = data?.tag;

        if (tag) {
          this.adminService
            .postTag(tag)
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe({
              next: () => {
                this.userService
                  .get(true)
                  .pipe(takeUntil(this.unsubscribeSubject))
                  .subscribe();

                this.fetchTags();
              }
            });
        }

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }

  private openUpdateTagDialog({ id, name }) {
    const dialogRef = this.dialog.open(CreateOrUpdateTagDialog, {
      data: {
        tag: {
          id,
          name
        }
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        const tag: UpdateTagDto = data?.tag;

        if (tag) {
          this.adminService
            .putTag(tag)
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe({
              next: () => {
                this.userService
                  .get(true)
                  .pipe(takeUntil(this.unsubscribeSubject))
                  .subscribe();

                this.fetchTags();
              }
            });
        }

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }
}
