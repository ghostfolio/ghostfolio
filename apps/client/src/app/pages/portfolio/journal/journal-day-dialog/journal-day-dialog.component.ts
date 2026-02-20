import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { Activity } from '@ghostfolio/common/interfaces';
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
    GfDialogFooterComponent,
    GfDialogHeaderComponent,
    GfValueComponent,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule
  ],
  selector: 'gf-journal-day-dialog',
  styleUrls: ['./journal-day-dialog.component.scss'],
  templateUrl: './journal-day-dialog.component.html'
})
export class GfJournalDayDialogComponent implements OnInit, OnDestroy {
  public activities: Activity[] = [];
  public date: string;
  public dateLabel: string;
  public hasChanges = false;
  public isLoadingActivities = true;
  public isLoadingNote = true;
  public isSavingNote = false;
  public note = '';

  private originalNote = '';
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: JournalDayDialogData,
    private dataService: DataService,
    public dialogRef: MatDialogRef<GfJournalDayDialogComponent>,
    private snackBar: MatSnackBar
  ) {}

  public ngOnInit() {
    this.date = this.data.date;
    this.dateLabel = new Intl.DateTimeFormat(this.data.locale ?? 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(parseISO(this.date));

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
            this.hasChanges = true;
            this.originalNote = this.note.trim();
            this.isSavingNote = false;
            this.snackBar.open($localize`Note saved`, undefined, {
              duration: 3000
            });
            this.changeDetectorRef.markForCheck();
          },
          error: () => {
            this.isSavingNote = false;
            this.snackBar.open($localize`Failed to save note`, undefined, {
              duration: 5000
            });
            this.changeDetectorRef.markForCheck();
          }
        });
    } else if (this.originalNote) {
      // Only call delete if there was an existing note
      this.dataService
        .deleteJournalEntry({ date: this.date })
        .pipe(takeUntil(this.unsubscribeSubject))
        .subscribe({
          next: () => {
            this.hasChanges = true;
            this.originalNote = '';
            this.isSavingNote = false;
            this.snackBar.open($localize`Note deleted`, undefined, {
              duration: 3000
            });
            this.changeDetectorRef.markForCheck();
          },
          error: () => {
            this.isSavingNote = false;
            this.snackBar.open($localize`Failed to delete note`, undefined, {
              duration: 5000
            });
            this.changeDetectorRef.markForCheck();
          }
        });
    } else {
      // No existing note and empty input - nothing to do
      this.isSavingNote = false;
    }
  }

  public onClose() {
    this.dialogRef.close({ hasChanges: this.hasChanges });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private loadActivities() {
    this.isLoadingActivities = true;

    // Use the year of the selected date as range filter to avoid
    // fetching all-time activities and missing older dates
    const year = this.date.substring(0, 4);

    this.dataService
      .fetchActivities({
        filters: [],
        range: year as any,
        skip: 0,
        take: 500,
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
          this.originalNote = this.note;
          this.isLoadingNote = false;
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.note = '';
          this.originalNote = '';
          this.isLoadingNote = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }
}
