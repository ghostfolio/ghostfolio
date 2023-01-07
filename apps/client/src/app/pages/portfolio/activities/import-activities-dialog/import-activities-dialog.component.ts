import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImportActivitiesService } from '@ghostfolio/client/services/import-activities.service';
import { Position } from '@ghostfolio/common/interfaces';
import { AssetClass } from '@prisma/client';
import { isArray, sortBy } from 'lodash';
import { Subject, takeUntil } from 'rxjs';

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
  public holdings: Position[] = [];
  public isFileSelected = false;
  public mode: 'DIVIDEND';
  public selectedActivities: Activity[] = [];
  public uniqueAssetForm: FormGroup;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: ImportActivitiesDialogParams,
    private dataService: DataService,
    private formBuilder: FormBuilder,
    public dialogRef: MatDialogRef<ImportActivitiesDialog>,
    private importActivitiesService: ImportActivitiesService,
    private snackBar: MatSnackBar
  ) {}

  public ngOnInit() {
    this.uniqueAssetForm = this.formBuilder.group({
      uniqueAsset: [undefined, Validators.required]
    });

    if (
      this.data?.activityTypes?.length === 1 &&
      this.data?.activityTypes?.[0] === 'DIVIDEND'
    ) {
      this.mode = 'DIVIDEND';

      this.dataService
        .fetchPositions({
          filters: [
            {
              id: AssetClass.EQUITY,
              type: 'ASSET_CLASS'
            }
          ],
          range: 'max'
        })
        .pipe(takeUntil(this.unsubscribeSubject))
        .subscribe(({ positions }) => {
          this.holdings = sortBy(positions, ({ name }) => {
            return name.toLowerCase();
          });

          this.changeDetectorRef.markForCheck();
        });
    }
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  public async onImportActivities() {
    try {
      this.snackBar.open('⏳ ' + $localize`Importing data...`);

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
    } catch (error) {
      this.snackBar.open(
        $localize`Oops! Something went wrong.` +
          ' ' +
          $localize`Please try again later.`,
        $localize`Okay`,
        { duration: 3000 }
      );
    } finally {
      this.dialogRef.close();
    }
  }

  public onLoadDividends() {
    const { dataSource, symbol } =
      this.uniqueAssetForm.controls['uniqueAsset'].value;

    this.dataService
      .fetchDividendsImport({
        dataSource,
        symbol
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ activities }) => {
        this.activities = activities;
        this.isFileSelected = true;

        this.changeDetectorRef.markForCheck();
      });
  }

  public onReset() {
    this.details = [];
    this.errorMessages = [];
    this.isFileSelected = false;
  }

  public onSelectFile() {
    const input = document.createElement('input');
    input.accept = 'application/JSON, .csv';
    input.type = 'file';

    input.onchange = (event) => {
      this.snackBar.open('⏳ ' + $localize`Validating data...`);

      // Getting the file reference
      const file = (event.target as HTMLInputElement).files[0];

      // Setting up the reader
      const reader = new FileReader();
      reader.readAsText(file, 'UTF-8');

      reader.onload = async (readerEvent) => {
        const fileContent = readerEvent.target.result as string;

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
              this.activities = await this.importActivitiesService.importJson({
                content: content.activities,
                isDryRun: true
              });
            } catch (error) {
              console.error(error);
              this.handleImportError({ error, activities: content.activities });
            }

            return;
          } else if (file.name.endsWith('.csv')) {
            try {
              this.activities = await this.importActivitiesService.importCsv({
                fileContent,
                isDryRun: true,
                userAccounts: this.data.user.accounts
              });
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
        } finally {
          this.isFileSelected = true;
          this.snackBar.dismiss();
          this.changeDetectorRef.markForCheck();
        }
      };
    };

    input.click();
  }

  public updateSelection(data: Activity[]) {
    this.selectedActivities = data;
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
}
