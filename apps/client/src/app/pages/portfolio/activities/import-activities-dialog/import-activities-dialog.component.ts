import { GfFileDropDirective } from '@ghostfolio/client/directives/file-drop/file-drop.directive';
import { ImportActivitiesService } from '@ghostfolio/client/services/import-activities.service';
import { DEFAULT_DATE_RANGE } from '@ghostfolio/common/config';
import {
  CreateAccountWithBalancesDto,
  CreateAssetProfileWithMarketDataDto,
  CreateTagDto
} from '@ghostfolio/common/dtos';
import { Activity, PortfolioPosition } from '@ghostfolio/common/interfaces';
import { GfSymbolPipe } from '@ghostfolio/common/pipes';
import { GfActivitiesTableComponent } from '@ghostfolio/ui/activities-table';
import { GfDialogFooterComponent } from '@ghostfolio/ui/dialog-footer';
import { GfDialogHeaderComponent } from '@ghostfolio/ui/dialog-header';
import { DataService } from '@ghostfolio/ui/services';

import {
  StepperOrientation,
  StepperSelectionEvent
} from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SortDirection } from '@angular/material/sort';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatTableDataSource } from '@angular/material/table';
import { IonIcon } from '@ionic/angular/standalone';
import { AssetClass } from '@prisma/client';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, warningOutline } from 'ionicons/icons';
import { isArray, sortBy } from 'lodash';
import ms from 'ms';

import { ImportStep } from './enums/import-step';
import { ImportActivitiesDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column h-100' },
  imports: [
    CommonModule,
    GfActivitiesTableComponent,
    GfDialogFooterComponent,
    GfDialogHeaderComponent,
    GfFileDropDirective,
    GfSymbolPipe,
    IonIcon,
    MatButtonModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatStepperModule,
    ReactiveFormsModule
  ],
  selector: 'gf-import-activities-dialog',
  styleUrls: ['./import-activities-dialog.scss'],
  templateUrl: 'import-activities-dialog.html'
})
export class GfImportActivitiesDialogComponent {
  protected readonly assetProfileForm = new FormGroup({
    assetProfileIdentifier: new FormControl<PortfolioPosition | null>(null, {
      validators: [Validators.required]
    })
  });
  protected readonly data =
    inject<ImportActivitiesDialogParams>(MAT_DIALOG_DATA);
  protected dataSource: MatTableDataSource<Activity>;
  protected details: any[] = [];
  protected dialogTitle = $localize`Import Activities`;
  protected errorMessages: string[] = [];
  protected holdings: PortfolioPosition[] = [];
  protected importStep: ImportStep = ImportStep.UPLOAD_FILE;
  protected isLoading = false;
  protected mode: 'DIVIDEND';
  protected pageIndex = 0;
  protected readonly pageSize = 8;
  protected selectedActivities: Activity[] = [];
  protected readonly sortColumn = 'date';
  protected readonly sortDirection: SortDirection = 'desc';
  protected readonly stepperOrientation: StepperOrientation =
    this.data.deviceType === 'mobile' ? 'vertical' : 'horizontal';
  protected totalItems: number;

  private accounts: CreateAccountWithBalancesDto[] = [];
  private activities: Activity[] = [];
  private assetProfiles: CreateAssetProfileWithMarketDataDto[] = [];
  private tags: CreateTagDto[] = [];

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef =
    inject<MatDialogRef<GfImportActivitiesDialogComponent>>(MatDialogRef);
  private readonly importActivitiesService = inject(ImportActivitiesService);
  private readonly snackBar = inject(MatSnackBar);

  public constructor() {
    addIcons({ cloudUploadOutline, warningOutline });
  }

  public ngOnInit() {
    if (
      this.data?.activityTypes?.length === 1 &&
      this.data?.activityTypes?.[0] === 'DIVIDEND'
    ) {
      this.isLoading = true;

      this.dialogTitle = $localize`Import Dividends`;
      this.mode = 'DIVIDEND';
      this.assetProfileForm.controls.assetProfileIdentifier.disable();

      this.dataService
        .fetchPortfolioHoldings({
          filters: [
            {
              id: AssetClass.EQUITY,
              type: 'ASSET_CLASS'
            },
            {
              id: AssetClass.FIXED_INCOME,
              type: 'ASSET_CLASS'
            }
          ],
          range: DEFAULT_DATE_RANGE
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(({ holdings }) => {
          this.holdings = sortBy(holdings, ({ assetProfile }) => {
            return assetProfile.name?.toLowerCase();
          });

          this.assetProfileForm.controls.assetProfileIdentifier.enable();

          this.isLoading = false;

          this.changeDetectorRef.markForCheck();
        });
    }
  }

  protected onCancel() {
    this.dialogRef.close();
  }

  protected async onImportActivities() {
    try {
      this.snackBar.open('⏳ ' + $localize`Importing data...`);

      await this.importActivitiesService.importSelectedActivities({
        accounts: this.accounts,
        activities: this.selectedActivities,
        assetProfiles: this.assetProfiles,
        tags: this.tags
      });

      this.snackBar.open(
        '✅ ' + $localize`Import has been completed`,
        undefined,
        {
          duration: ms('3 seconds')
        }
      );
    } catch (error) {
      this.snackBar.open(
        $localize`Oops! Something went wrong.` +
          ' ' +
          $localize`Please try again later.`,
        $localize`Okay`,
        {
          duration: ms('3 seconds')
        }
      );
    } finally {
      this.dialogRef.close();
    }
  }

  protected onFilesDropped({
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

  protected onImportStepChange(event: StepperSelectionEvent) {
    if (event.selectedIndex === ImportStep.UPLOAD_FILE) {
      this.importStep = ImportStep.UPLOAD_FILE;
    } else if (event.selectedIndex === ImportStep.SELECT_ACTIVITIES) {
      this.importStep = ImportStep.SELECT_ACTIVITIES;
    }
  }

  protected onLoadDividends(aStepper: MatStepper) {
    this.assetProfileForm.controls.assetProfileIdentifier.disable();

    const { dataSource, symbol } =
      this.assetProfileForm.controls.assetProfileIdentifier.value
        ?.assetProfile ?? {};

    if (!dataSource || !symbol) {
      return;
    }

    this.dataService
      .fetchDividendsImport({
        dataSource,
        symbol
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ activities }) => {
        this.activities = activities;
        this.dataSource = new MatTableDataSource(activities.reverse());
        this.pageIndex = 0;
        this.totalItems = activities.length;

        aStepper.next();

        this.changeDetectorRef.markForCheck();
      });
  }

  protected onPageChanged({ pageIndex }: PageEvent) {
    this.pageIndex = pageIndex;
  }

  protected onReset(aStepper: MatStepper) {
    this.details = [];
    this.errorMessages = [];
    this.importStep = ImportStep.SELECT_ACTIVITIES;
    this.pageIndex = 0;
    this.assetProfileForm.controls.assetProfileIdentifier.enable();

    aStepper.reset();
  }

  protected onSelectFile(stepper: MatStepper) {
    const input = document.createElement('input');

    input.accept = 'application/JSON, .csv';
    input.type = 'file';

    input.onchange = (event) => {
      // Getting the file reference
      const file = (event.target as HTMLInputElement).files?.[0];

      if (file) {
        this.handleFile({ file, stepper });
      }
    };

    input.click();
  }

  protected updateSelection(activities: Activity[]) {
    this.selectedActivities = activities.filter(({ error }) => {
      return !error;
    });
  }

  private handleFile({ file, stepper }: { file: File; stepper: MatStepper }) {
    this.snackBar.open('⏳ ' + $localize`Validating data...`);

    // Setting up the reader
    const reader = new FileReader();
    reader.readAsText(file, 'UTF-8');

    reader.onload = async (readerEvent) => {
      const fileContent = readerEvent.target?.result as string;
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      try {
        if (fileExtension === 'json') {
          const content = JSON.parse(fileContent);

          this.accounts = content.accounts;
          this.assetProfiles = content.assetProfiles;
          this.tags = content.tags;

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
                assetProfiles: content.assetProfiles,
                isDryRun: true,
                tags: content.tags
              });

            this.activities = activities;
            this.dataSource = new MatTableDataSource(activities.reverse());
            this.pageIndex = 0;
            this.totalItems = activities.length;
          } catch (error) {
            console.error(error);
            this.handleImportError({ error, activities: content.activities });
          }

          return;
        } else if (fileExtension === 'csv') {
          const content = fileContent.split('\n').slice(1);

          try {
            const { activities, assetProfiles } =
              await this.importActivitiesService.importCsv({
                fileContent,
                isDryRun: true,
                userAccounts: this.data.user.accounts
              });

            this.activities = activities;
            this.assetProfiles = assetProfiles;
            this.dataSource = new MatTableDataSource(activities.reverse());
            this.pageIndex = 0;
            this.totalItems = activities.length;
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
        this.updateSelection(this.activities);

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
