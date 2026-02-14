import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  JournalCalendarDataItem,
  JournalStats,
  User
} from '@ghostfolio/common/interfaces';
import { GfJournalCalendarComponent } from '@ghostfolio/ui/journal-calendar';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DeviceDetectorService } from 'ngx-device-detector';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  GfJournalDayDialogComponent,
  JournalDayDialogData
} from './journal-day-dialog/journal-day-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GfJournalCalendarComponent, NgxSkeletonLoaderModule],
  selector: 'gf-journal-page',
  styleUrls: ['./journal-page.scss'],
  templateUrl: './journal-page.html'
})
export class JournalPageComponent implements OnInit, OnDestroy {
  public days: JournalCalendarDataItem[] = [];
  public deviceType: string;
  public isLoading = true;
  public month: number;
  public stats: JournalStats;
  public user: User;
  public year: number;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private userService: UserService
  ) {
    const now = new Date();
    this.month = now.getMonth() + 1;
    this.year = now.getFullYear();
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;
          this.loadJournalData();
        }
      });
  }

  public onMonthChanged({ month, year }: { month: number; year: number }) {
    this.month = month;
    this.year = year;
    this.loadJournalData();
  }

  public onDayClicked(date: string) {
    const dayData = this.days.find((d) => d.date === date);

    const dialogRef = this.dialog.open(GfJournalDayDialogComponent, {
      autoFocus: false,
      data: {
        activitiesCount: dayData?.activitiesCount ?? 0,
        baseCurrency: this.user?.settings?.baseCurrency ?? 'USD',
        date,
        deviceType: this.deviceType,
        locale: this.user?.settings?.locale,
        netPerformance: dayData?.netPerformance ?? 0,
        realizedProfit: dayData?.realizedProfit ?? 0
      } as JournalDayDialogData,
      height: this.deviceType === 'mobile' ? '98vh' : '80vh',
      maxWidth: this.deviceType === 'mobile' ? '100vw' : '50rem',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((result) => {
        if (result?.hasChanges) {
          this.loadJournalData();
        }
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private loadJournalData() {
    this.isLoading = true;
    this.changeDetectorRef.markForCheck();

    this.dataService
      .fetchJournal({ month: this.month, year: this.year })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: (response) => {
          this.days = response.days;
          this.stats = response.stats;
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.days = [];
          this.stats = undefined;
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }
}
