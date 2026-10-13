import { GfAdminPlatformComponent } from '@ghostfolio/client/components/admin-platform/admin-platform.component';
import { GfAdminTagComponent } from '@ghostfolio/client/components/admin-tag/admin-tag.component';
import { GfDataProviderStatusComponent } from '@ghostfolio/client/components/data-provider-status/data-provider-status.component';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  DEFAULT_LOCALE,
  E_MAIL_LINE_BREAK,
  PROPERTY_API_KEY_GHOSTFOLIO,
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL,
  PROPERTY_OPENROUTER_MODEL_AGENT,
  PROPERTY_OPENROUTER_MODEL_VISION
} from '@ghostfolio/common/config';
import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import { getDateFormatString } from '@ghostfolio/common/helper';
import {
  DataProviderGhostfolioStatusResponse,
  DataProviderInfo,
  User
} from '@ghostfolio/common/interfaces';
import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { AdminService, DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { ellipsisHorizontal, trashOutline } from 'ionicons/icons';
import { get } from 'lodash-es';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { catchError, EMPTY, filter, finalize, of } from 'rxjs';

type OpenRouterModelControlName = 'model' | 'agentModel' | 'visionModel';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfAdminPlatformComponent,
    GfAdminTagComponent,
    GfDataProviderStatusComponent,
    GfEntityLogoComponent,
    GfPremiumIndicatorComponent,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule,
    RouterModule
  ],
  selector: 'gf-admin-settings',
  styleUrls: ['./admin-settings.component.scss'],
  templateUrl: './admin-settings.component.html'
})
export class GfAdminSettingsComponent implements OnInit {
  @ViewChild(MatSort) sort: MatSort;

  public dataSource = new MatTableDataSource<DataProviderInfo>();
  public defaultDateFormat: string;
  public displayedColumns = [
    'icon',
    'name',
    'status',
    'assetProfileCount',
    'usage',
    'actions'
  ];
  public ghostfolioApiStatus: DataProviderGhostfolioStatusResponse;
  public readonly ghostfolioApiStatusTooltip = $localize`Additional requests are granted while you are setting up your instance`;
  public hasGhostfolioApiKey: boolean;
  public hasOpenRouterApiKey = false;
  public isGhostfolioApiKeyValid: boolean;
  public isLoading = false;
  public isOpenRouterSettingsLoaded = false;
  public isSavingOpenRouterSetting = false;
  public openRouterFeedback?: { isError: boolean; message: string };
  public readonly openRouterForm = new FormGroup({
    apiKey: new FormControl('', { nonNullable: true }),
    model: new FormControl('', {
      nonNullable: true,
      validators: (control) => {
        return typeof control.value === 'string' && control.value.trim()
          ? null
          : { required: true };
      }
    }),
    agentModel: new FormControl('', { nonNullable: true }),
    visionModel: new FormControl('', { nonNullable: true })
  });
  public readonly openRouterModelFields: {
    controlName: OpenRouterModelControlName;
    hint: string;
    label: string;
    saveLabel: string;
  }[] = [
    {
      controlName: 'model',
      hint: $localize`Enter an OpenRouter model identifier, such as provider/model.`,
      label: $localize`Default model`,
      saveLabel: $localize`Save default model`
    },
    {
      controlName: 'agentModel',
      hint: $localize`Optional. Leave blank to use the default model.`,
      label: $localize`Asset and account matching model`,
      saveLabel: $localize`Save asset and account matching model`
    },
    {
      controlName: 'visionModel',
      hint: $localize`Optional. Leave blank to use the default model. Choose a model that supports PDFs and images.`,
      label: $localize`File reading model`,
      saveLabel: $localize`Save file reading model`
    }
  ];
  public readonly premiumDataProviderMailHref = `mailto:hi@ghostfol.io?subject=Ghostfolio Premium Data Provider&body=${[
    'Hello,',
    '',
    'I am interested in the Ghostfolio Premium data provider. Could you please give me access so I can try it for some time?',
    '',
    'Kind regards'
  ].join(E_MAIL_LINE_BREAK)}`;
  public pricingUrl: string;
  public user: User;

  protected readonly DEFAULT_LOCALE = DEFAULT_LOCALE;

  private readonly openRouterModelProperties = {
    model: PROPERTY_OPENROUTER_MODEL,
    agentModel: PROPERTY_OPENROUTER_MODEL_AGENT,
    visionModel: PROPERTY_OPENROUTER_MODEL_VISION
  };
  private savedOpenRouterModels: Partial<
    Record<OpenRouterModelControlName, string>
  > = {};

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private destroyRef: DestroyRef,
    private notificationService: NotificationService,
    private userService: UserService
  ) {
    addIcons({ ellipsisHorizontal, trashOutline });
  }

  public ngOnInit() {
    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.defaultDateFormat = getDateFormatString(
            this.user.settings.locale
          );

          const languageCode = this.user.settings.language;

          this.pricingUrl = `https://ghostfol.io/${languageCode}/${publicRoutes.pricing.path}`;

          this.changeDetectorRef.markForCheck();
        }
      });

    this.initialize();
  }

  public isGhostfolioDataProvider(provider: DataProviderInfo): boolean {
    return provider.dataSource === 'GHOSTFOLIO';
  }

  public canSaveOpenRouterModel(controlName: OpenRouterModelControlName) {
    const control = this.openRouterForm.controls[controlName];
    const value = control.value.trim();
    const savedValue = this.savedOpenRouterModels[controlName];

    return (
      !this.isLoading &&
      this.isOpenRouterSettingsLoaded &&
      !this.isSavingOpenRouterSetting &&
      control.valid &&
      (value ? value !== savedValue : savedValue !== undefined)
    );
  }

  public onRemoveOpenRouterApiKey() {
    if (
      this.isLoading ||
      !this.isOpenRouterSettingsLoaded ||
      this.isSavingOpenRouterSetting ||
      !this.hasOpenRouterApiKey
    ) {
      return;
    }

    this.notificationService.confirm({
      confirmFn: () => {
        if (this.hasOpenRouterApiKey) {
          this.saveOpenRouterSetting(
            PROPERTY_API_KEY_OPENROUTER,
            undefined,
            () => {
              this.hasOpenRouterApiKey = false;
              this.openRouterForm.controls.apiKey.reset();
            },
            $localize`OpenRouter API key removed.`
          );
        }
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to remove the OpenRouter API key?`
    });
  }

  public onSaveOpenRouterApiKey() {
    const value = this.openRouterForm.controls.apiKey.value.trim();

    if (value) {
      this.saveOpenRouterSetting(PROPERTY_API_KEY_OPENROUTER, value, () => {
        this.hasOpenRouterApiKey = true;
        this.openRouterForm.controls.apiKey.reset();
      });
    }
  }

  public onSaveOpenRouterModel(controlName: OpenRouterModelControlName) {
    if (!this.canSaveOpenRouterModel(controlName)) {
      return;
    }

    const control = this.openRouterForm.controls[controlName];
    const value = control.value.trim() || undefined;

    this.saveOpenRouterSetting(
      this.openRouterModelProperties[controlName],
      value,
      () => {
        this.savedOpenRouterModels[controlName] = value;
        control.reset(value ?? '');
      }
    );
  }

  public onRemoveGhostfolioApiKey() {
    this.notificationService.confirm({
      confirmFn: () => {
        this.dataService
          .putAdminSetting(PROPERTY_API_KEY_GHOSTFOLIO, { value: undefined })
          .subscribe(() => {
            this.initialize();
          });
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete the API key?`
    });
  }

  public onSetGhostfolioApiKey() {
    this.notificationService.prompt({
      confirmFn: (value) => {
        const ghostfolioApiKey = value?.trim();

        if (ghostfolioApiKey) {
          this.dataService
            .putAdminSetting(PROPERTY_API_KEY_GHOSTFOLIO, {
              value: ghostfolioApiKey
            })
            .subscribe(() => {
              this.initialize();
            });
        }
      },
      title: $localize`Please enter your Ghostfolio API key.`
    });
  }

  private initialize() {
    this.isLoading = true;
    this.isOpenRouterSettingsLoaded = false;
    this.openRouterFeedback = undefined;
    this.openRouterForm.disable({ emitEvent: false });

    this.dataSource = new MatTableDataSource();

    this.adminService
      .fetchAdminData()
      .pipe(
        catchError(() => {
          this.openRouterFeedback = {
            isError: true,
            message: $localize`Could not load Ghostfolio AI settings. Please reload to try again.`
          };
          return EMPTY;
        }),
        finalize(() => {
          this.isLoading = false;
          if (this.isOpenRouterSettingsLoaded) {
            this.openRouterForm.enable({ emitEvent: false });
          }
          this.changeDetectorRef.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ dataProviders, settings }) => {
        const filteredProviders = dataProviders.filter(({ dataSource }) => {
          return dataSource !== 'MANUAL';
        });

        this.dataSource = new MatTableDataSource(filteredProviders);
        this.dataSource.sort = this.sort;
        this.dataSource.sortingDataAccessor = get;

        const ghostfolioApiKey = settings[
          PROPERTY_API_KEY_GHOSTFOLIO
        ] as string;

        this.hasGhostfolioApiKey = !!ghostfolioApiKey;
        this.hasOpenRouterApiKey = !!settings[PROPERTY_API_KEY_OPENROUTER];
        this.isOpenRouterSettingsLoaded = true;

        for (const { controlName } of this.openRouterModelFields) {
          const value = settings[this.openRouterModelProperties[controlName]];

          this.savedOpenRouterModels[controlName] =
            typeof value === 'string' ? value : undefined;
          this.openRouterForm.controls[controlName].reset(
            this.savedOpenRouterModels[controlName] ?? ''
          );
        }

        if (ghostfolioApiKey) {
          this.adminService
            .fetchGhostfolioDataProviderStatus(ghostfolioApiKey)
            .pipe(
              catchError(() => {
                this.isGhostfolioApiKeyValid = false;

                this.changeDetectorRef.markForCheck();

                return of(null);
              }),
              filter((status) => {
                return status !== null;
              }),
              takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((status) => {
              this.ghostfolioApiStatus = status;
              this.isGhostfolioApiKeyValid = true;

              this.changeDetectorRef.markForCheck();
            });
        } else {
          this.isGhostfolioApiKeyValid = false;
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  private saveOpenRouterSetting(
    property: string,
    value: string | undefined,
    onSuccess: () => void,
    successMessage = $localize`Ghostfolio AI setting saved.`
  ) {
    if (
      this.isLoading ||
      !this.isOpenRouterSettingsLoaded ||
      this.isSavingOpenRouterSetting
    ) {
      return;
    }

    this.isSavingOpenRouterSetting = true;
    this.openRouterFeedback = undefined;
    this.openRouterForm.disable({ emitEvent: false });

    this.dataService
      .putAdminSetting(property, { value })
      .pipe(
        catchError(() => {
          this.openRouterFeedback = {
            isError: true,
            message: $localize`Could not save the Ghostfolio AI setting. Please try again.`
          };

          return EMPTY;
        }),
        finalize(() => {
          this.isSavingOpenRouterSetting = false;
          this.openRouterForm.enable({ emitEvent: false });
          this.changeDetectorRef.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        onSuccess();
        this.openRouterFeedback = {
          isError: false,
          message: successMessage
        };
      });
  }
}
