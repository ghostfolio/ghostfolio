import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  Activities,
  Activity
} from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { ImportActivitiesService } from '@ghostfolio/client/services/import-activities.service';
import { isArray } from 'lodash';
import { Subject } from 'rxjs';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';

import { ImportActivitiesDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-import-activities-dialog',
  styleUrls: ['./import-activities-dialog.scss'],
  templateUrl: 'import-activities-dialog.html'
})
export class ImportActivitiesDialog implements OnDestroy {
  public activities: Activity[] = [];
  public details: any[] = [];
  public errorMessages: string[] = [];
  public importComplete = false;
  public selectedActivities: Activity[] = [];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: ImportActivitiesDialogParams,
    public dialogRef: MatDialogRef<ImportActivitiesDialog>,
    private importActivitiesService: ImportActivitiesService,
    private snackBar: MatSnackBar
  ) {}

  public ngOnInit() {}

  public onCancel(): void {
    this.dialogRef.close();
  }

  public onImport() {
    const input = document.createElement('input');
    input.accept = 'application/JSON, .csv';
    input.type = 'file';

    input.onchange = (event) => {
      this.snackBar.open('⏳ ' + $localize`Importing data...`);

      // Getting the file reference
      const file = (event.target as HTMLInputElement).files[0];

      // Setting up the reader
      const reader = new FileReader();
      reader.readAsText(file, 'UTF-8');

      reader.onload = async (readerEvent) => {
        const fileContent = readerEvent.target.result as string;

        console.log(fileContent);

        try {
          if (file.name.endsWith('.json')) {
            const content = JSON.parse(fileContent);

            if (!isArray(content.activities)) {
              if (isArray(content.orders)) {
                this.handleImportError({
                  activities: [],
                  error: {
                    error: {
                      message: [`orders needs to be renamed to activities`]
                    }
                  }
                });
                return;
              } else {
                throw new Error();
              }
            }

            try {
              await this.importActivitiesService.importJson({
                content: content.activities,
                dryRun: true
              });

              this.handleImportSuccess();
            } catch (error) {
              console.error(error);
              this.handleImportError({ error, activities: content.activities });
            }

            return;
          } else if (file.name.endsWith('.csv')) {
            try {
              this.activities = await this.importActivitiesService.importCsv({
                fileContent,
                userAccounts: this.data.user.accounts,
                dryRun: true
              });

              this.snackBar.dismiss();
              this.handleImportSuccess();
            } catch (error) {
              console.error(error);
              this.handleImportError({
                activities: error?.activities ?? [],
                error: {
                  error: { message: error?.error?.message ?? [error?.message] }
                }
              });
            }

            return;
          }

          throw new Error();
        } catch (error) {
          console.error(error);
          this.handleImportError({
            activities: [],
            error: { error: { message: ['Unexpected format'] } }
          });
        }
      };
    };

    input.click();
  }

  public importActivities(data) {
    this.selectedActivities = data;
  }

  public async finalImport() {
    await this.importActivitiesService.importSelectedActivities(
      this.selectedActivities
    );

    this.snackBar.open(
      '✅ ' + $localize`Import has been completed`,
      undefined,
      {
        duration: 3000
      }
    );

    this.dialogRef.close();
  }

  public onReset() {
    this.details = [];
    this.errorMessages = [];
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private handleImportError({
    activities,
    error
  }: {
    activities: any[];
    error: any;
  }) {
    this.snackBar.dismiss();

    this.errorMessages = error?.error?.message;

    for (const message of this.errorMessages) {
      if (message.includes('activities.')) {
        let [index] = message.split(' ');
        index = index.replace('activities.', '');
        [index] = index.split('.');

        this.details.push(activities[index]);
      } else {
        this.details.push('');
      }
    }

    this.changeDetectorRef.markForCheck();
  }

  private handleImportSuccess() {
    this.importComplete = true;
    this.changeDetectorRef.markForCheck();
  }
}
