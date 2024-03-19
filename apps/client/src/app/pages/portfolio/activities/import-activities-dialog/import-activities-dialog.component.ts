import { CreateAccountDto } from '@ghostfolio/api/app/account/create-account.dto';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImportActivitiesService } from '@ghostfolio/client/services/import-activities.service';
import { Position } from '@ghostfolio/common/interfaces';

import {
  StepperOrientation,
  StepperSelectionEvent
} from '@angular/cdk/stepper';
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
import { SortDirection } from '@angular/material/sort';
import { MatStepper } from '@angular/material/stepper';
import { MatTableDataSource } from '@angular/material/table';
import { AssetClass } from '@prisma/client';
import { isArray, sortBy } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, takeUntil } from 'rxjs';

import { ImportStep } from './enums/import-step';
import { ImportActivitiesDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-import-activities-dialog',
  styleUrls: ['./import-activities-dialog.scss'],
  templateUrl: 'import-activities-dialog.html'
})
export class ImportActivitiesDialog implements OnDestroy {
  public accounts: CreateAccountDto[] = [];
  public activities: Activity[] = [];
  public dataSource: MatTableDataSource<Activity>;
  public details: any[] = [];
  public deviceType: string;
  public dialogTitle = $localize`Import Activities`;
  public errorMessages: string[] = [];
  public holdings: Position[] = [];
  public importStep: ImportStep = ImportStep.UPLOAD_FILE;
  public isLoading = false;
  public maxSafeInteger = Number.MAX_SAFE_INTEGER;
  public mode: 'DIVIDEND';
  public selectedActivities: Activity[] = [];
  public sortColumn = 'date';
  public sortDirection: SortDirection = 'desc';
  public stepperOrientation: StepperOrientation;
  public totalItems: number;
  public uniqueAssetForm: FormGroup;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: ImportActivitiesDialogParams,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private formBuilder: FormBuilder,
    public dialogRef: MatDialogRef<ImportActivitiesDialog>,
    private importActivitiesService: ImportActivitiesService,
    private snackBar: MatSnackBar
  ) {}

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;
    this.stepperOrientation =
      this.deviceType === 'mobile' ? 'vertical' : 'horizontal';

    this.uniqueAssetForm = this.formBuilder.group({
      uniqueAsset: [undefined, Validators.required]
    });

    if (
      this.data?.activityTypes?.length === 1 &&
      this.data?.activityTypes?.[0] === 'DIVIDEND'
    ) {
      this.isLoading = true;

      this.dialogTitle = $localize`Import Dividends`;
      this.mode = 'DIVIDEND';
      this.uniqueAssetForm.controls['uniqueAsset'].disable();

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
          this.uniqueAssetForm.controls['uniqueAsset'].enable();

          this.isLoading = false;

          this.changeDetectorRef.markForCheck();
        });
    }
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public async onImportActivities() {
    try {
      this.snackBar.open('⏳ ' + $localize`Importing data...`);

      await this.importActivitiesService.importSelectedActivities({
        accounts: this.accounts,
        activities: this.selectedActivities
      });

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

  public onFilesDropped({
    files,
    stepper
  }: {
    files: FileList;
    stepper: MatStepper;
  }) {
    if (files.length === 0) {
      return;
    }

    this.handleFile({ stepper, file: files[0] });
  }

  public onImportStepChange(event: StepperSelectionEvent) {
    if (event.selectedIndex === ImportStep.UPLOAD_FILE) {
      this.importStep = ImportStep.UPLOAD_FILE;
    } else if (event.selectedIndex === ImportStep.SELECT_ACTIVITIES) {
      this.importStep = ImportStep.SELECT_ACTIVITIES;
    }
  }

  public onLoadDividends(aStepper: MatStepper) {
    this.uniqueAssetForm.controls['uniqueAsset'].disable();

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
        this.dataSource = new MatTableDataSource(activities.reverse());
        this.totalItems = activities.length;

        aStepper.next();

        this.changeDetectorRef.markForCheck();
      });
  }

  public onReset(aStepper: MatStepper) {
    this.details = [];
    this.errorMessages = [];
    this.importStep = ImportStep.SELECT_ACTIVITIES;
    this.uniqueAssetForm.controls['uniqueAsset'].enable();

    aStepper.reset();
  }

  public onSelectFile(stepper: MatStepper) {
    const input = document.createElement('input');
    input.accept = 'application/JSON, .csv';
    input.type = 'file';

    input.onchange = (event) => {
      // Getting the file reference
      const file = (event.target as HTMLInputElement).files[0];
      this.handleFile({ file, stepper });
    };

    input.click();
  }

  public updateSelection(activities: Activity[]) {
    this.selectedActivities = activities.filter(({ error }) => {
      return !error;
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private async handleFile({
    file,
    stepper
  }: {
    file: File;
    stepper: MatStepper;
  }): Promise<void> {
    this.snackBar.open('⏳ ' + $localize`Validating data...`);

    // Setting up the reader
    const reader = new FileReader();
    reader.readAsText(file, 'UTF-8');

    reader.onload = async (readerEvent) => {
      const fileContent = readerEvent.target.result as string;

      try {
        if (file.name.endsWith('.json')) {
          const content = JSON.parse(fileContent);

          this.accounts = content.accounts;

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

          content.activities = content.activities.map((activity) => {
            if (activity.id) {
              delete activity.id;
            }

            return activity;
          });

          try {
            const { activities } =
              await this.importActivitiesService.importJson({
                accounts: content.accounts,
                activities: content.activities,
                isDryRun: true
              });
            this.activities = activities;
            this.dataSource = new MatTableDataSource(activities.reverse());
            this.totalItems = activities.length;
          } catch (error) {
            console.error(error);
            this.handleImportError({ error, activities: content.activities });
          }

          return;
        } else if (file.name.endsWith('.csv')) {
          const content = fileContent.split('\n').slice(1);

          try {
            const data = await this.importActivitiesService.importCsv({
              fileContent,
              isDryRun: true,
              userAccounts: this.data.user.accounts
            });
            this.activities = data.activities;
            this.dataSource = new MatTableDataSource(data.activities.reverse());
            this.totalItems = data.activities.length;
          } catch (error) {
            console.error(error);
            this.handleImportError({
              activities: error?.activities ?? content,
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
        this.importStep = ImportStep.SELECT_ACTIVITIES;
        this.snackBar.dismiss();

        stepper.next();

        this.changeDetectorRef.markForCheck();
      }
    };
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
