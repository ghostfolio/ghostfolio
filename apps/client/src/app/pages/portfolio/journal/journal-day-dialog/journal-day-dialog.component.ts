import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { Activity, User } from '@ghostfolio/common/interfaces';
import { GfActivitiesTableComponent } from '@ghostfolio/ui/activities-table';
import { GfDialogFooterComponent } from '@ghostfolio/ui/dialog-footer';
import { GfDialogHeaderComponent } from '@ghostfolio/ui/dialog-header';
import { DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { format, parseISO } from 'date-fns';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface JournalDayDialogData {
  activitiesCount: number;
  baseCurrency: string;
  date: string;
  deviceType: string;
  locale: string;
  netPerformance: number;
  realizedProfit: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column h-100' },
  imports: [
    CommonModule,
    FormsModule,
    GfActivitiesTableComponent,
    GfDialogFooterComponent,
    GfDialogHeaderComponent,
    GfValueComponent,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ],
  selector: 'gf-journal-day-dialog',
  styleUrls: ['./journal-day-dialog.component.scss'],
  templateUrl: './journal-day-dialog.component.html'
})
export class GfJournalDayDialogComponent implements OnInit, OnDestroy {
  public activities: Activity[] = [];
  public date: string;
  public dateLabel: string;
  public isLoadingActivities = true;
  public isLoadingNote = true;
  public isSavingNote = false;
  public note = '';
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: JournalDayDialogData,
    private dataService: DataService,
    public dialogRef: MatDialogRef<GfJournalDayDialogComponent>,
    private userService: UserService
  ) {}

  public ngOnInit() {
    this.date = this.data.date;
    this.dateLabel = format(parseISO(this.date), 'EEEE, MMMM d, yyyy');

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;
          this.changeDetectorRef.markForCheck();
        }
      });

    this.loadActivities();
    this.loadNote();
  }

  public onSaveNote() {
    if (this.isSavingNote) {
      return;
    }

    this.isSavingNote = true;

    if (this.note?.trim()) {
      this.dataService
        .putJournalEntry({ date: this.date, note: this.note.trim() })
        .pipe(takeUntil(this.unsubscribeSubject))
        .subscribe({
          next: () => {
            this.isSavingNote = false;
            this.changeDetectorRef.markForCheck();
          },
          error: () => {
            this.isSavingNote = false;
            this.changeDetectorRef.markForCheck();
          }
        });
    } else {
      this.dataService
        .deleteJournalEntry({ date: this.date })
        .pipe(takeUntil(this.unsubscribeSubject))
        .subscribe({
          next: () => {
            this.isSavingNote = false;
            this.changeDetectorRef.markForCheck();
          },
          error: () => {
            this.isSavingNote = false;
            this.changeDetectorRef.markForCheck();
          }
        });
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private loadActivities() {
    this.isLoadingActivities = true;

    this.dataService
      .fetchActivities({
        filters: [],
        skip: 0,
        take: 50,
        sortColumn: 'date',
        sortDirection: 'desc'
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ activities }) => {
        this.activities = activities.filter((activity) => {
          const activityDate = format(
            typeof activity.date === 'string'
              ? parseISO(activity.date as string)
              : activity.date,
            DATE_FORMAT
          );
          return activityDate === this.date;
        });
        this.isLoadingActivities = false;
        this.changeDetectorRef.markForCheck();
      });
  }

  private loadNote() {
    this.isLoadingNote = true;

    this.dataService
      .fetchJournalEntry({ date: this.date })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: (entry) => {
          this.note = entry?.note ?? '';
          this.isLoadingNote = false;
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.note = '';
          this.isLoadingNote = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }
}
