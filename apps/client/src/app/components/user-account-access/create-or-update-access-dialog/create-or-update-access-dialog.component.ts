import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DEFAULT_LOCALE } from '@ghostfolio/common/config';
import { CreateAccessDto, UpdateAccessDto } from '@ghostfolio/common/dtos';
import { Filter, PortfolioPosition } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import {
  Scope,
  getAccessLevel,
  getScopesOfAccessLevel,
  hasScope,
  scopes
} from '@ghostfolio/common/scopes';
import { AccessLevel, AccountWithPlatform } from '@ghostfolio/common/types';
import { validateObjectForForm } from '@ghostfolio/common/utils';
import { GfAccessLevelIconComponent } from '@ghostfolio/ui/access-level-icon';
import { NotificationService } from '@ghostfolio/ui/notifications';
import {
  GfPortfolioFilterFormComponent,
  getAssetClassFilters,
  getFiltersFromPortfolioFilterFormValue,
  getHoldingsForFilter,
  getPortfolioFilterFormValue,
  getTagFilters
} from '@ghostfolio/ui/portfolio-filter-form';
import { DataService } from '@ghostfolio/ui/services';

import type { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { addYears, endOfDay, isBefore, isValid, startOfDay } from 'date-fns';
import { StatusCodes } from 'http-status-codes';
import { EMPTY, catchError } from 'rxjs';

import { CreateOrUpdateAccessDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  imports: [
    FormsModule,
    GfAccessLevelIconComponent,
    GfPortfolioFilterFormComponent,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  selector: 'gf-create-or-update-access-dialog',
  styleUrls: ['./create-or-update-access-dialog.scss'],
  templateUrl: 'create-or-update-access-dialog.html'
})
export class GfCreateOrUpdateAccessDialogComponent implements OnInit {
  public accounts: AccountWithPlatform[] = [];
  public assetClasses: Filter[] = [];
  public holdings: PortfolioPosition[] = [];
  public tags: Filter[] = [];

  protected accessForm: FormGroup;
  protected minExpiresAt: Date;
  protected readonly mode: 'create' | 'update';
  protected readonly today = startOfDay(new Date());

  private hasExperimentalFeatures = false;
  private hasPermissionToEnableMcp = false;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  private readonly data =
    inject<CreateOrUpdateAccessDialogParams>(MAT_DIALOG_DATA);

  private readonly dateAdapter = inject<DateAdapter<Date, string>>(DateAdapter);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly dialogRef =
    inject<MatDialogRef<GfCreateOrUpdateAccessDialogComponent>>(MatDialogRef);

  private readonly formBuilder = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly userService = inject(UserService);

  public constructor() {
    this.mode = this.data.access ? 'update' : 'create';
  }

  public get canApplyFilters() {
    return this.isPublicAccess && this.hasExperimentalFeatures;
  }

  public get canGrantMcpAccess() {
    return this.hasExperimentalFeatures && this.hasPermissionToEnableMcp;
  }

  public get canGrantWriteAccess() {
    return this.hasExperimentalFeatures;
  }

  public ngOnInit() {
    const access = this.data?.access;
    const isPrivate = (access?.type ?? 'PRIVATE') === 'PRIVATE';

    const { globalPermissions } = this.dataService.fetchInfo();

    this.hasPermissionToEnableMcp = hasPermission(
      globalPermissions,
      permissions.enableMcp
    );

    this.accessForm = this.formBuilder.group({
      accessLevel: getAccessLevel(access?.scopes),
      alias: [access?.alias ?? ''],
      expiresAt: [
        access?.expiresAt
          ? new Date(access.expiresAt)
          : addYears(this.today, 1),
        Validators.required
      ],
      filters: [null],
      granteeUserId: [
        isPrivate ? (access?.grantee ?? null) : null,
        isPrivate ? Validators.required : null
      ],
      type: [
        { disabled: this.mode === 'update', value: access?.type ?? 'PRIVATE' },
        Validators.required
      ]
    });

    this.minExpiresAt =
      access?.expiresAt && isBefore(new Date(access.expiresAt), this.today)
        ? startOfDay(new Date(access.expiresAt))
        : this.today;

    this.assetClasses = getAssetClassFilters();

    this.userService
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ accounts, settings, tags }) => {
        this.accounts = accounts;
        this.hasExperimentalFeatures = settings.isExperimentalFeatures ?? false;
        this.tags = getTagFilters(tags);

        this.dateAdapter.setLocale(settings.locale ?? DEFAULT_LOCALE);

        this.changeDetectorRef.markForCheck();
      });

    this.accessForm
      .get('type')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((accessType) => {
        const granteeUserIdControl = this.accessForm.get('granteeUserId');

        if (accessType === 'PRIVATE') {
          granteeUserIdControl?.setValidators(Validators.required);
        } else {
          granteeUserIdControl?.clearValidators();
          granteeUserIdControl?.setValue(null);

          // An access which is not granted to a user never exposes the
          // monetary values and never changes data
          this.accessForm.get('accessLevel')?.setValue('READ_RESTRICTED');
        }

        if (accessType !== 'PUBLIC') {
          // Only a public access can be limited to a part of the portfolio
          this.accessForm.get('filters')?.setValue(null);
        }

        granteeUserIdControl?.updateValueAndValidity();

        this.changeDetectorRef.markForCheck();
      });

    this.loadHoldings();
  }

  protected get accessLevel(): AccessLevel {
    return this.accessForm?.get('accessLevel')?.value as AccessLevel;
  }

  protected get isPublicAccess() {
    return this.accessForm?.get('type')?.value === 'PUBLIC';
  }

  protected onCancel() {
    this.dialogRef.close();
  }

  protected async onSubmit() {
    if (this.mode === 'create') {
      await this.createAccess();
    } else {
      await this.updateAccess();
    }
  }

  private async createAccess() {
    const filters = this.getFilters();

    const access: CreateAccessDto = {
      alias: this.accessForm.get('alias')?.value,
      expiresAt: this.getExpiresAt(),
      filters: filters.length > 0 ? filters : undefined,
      granteeUserId: this.accessForm.get('granteeUserId')?.value,
      scopes: this.getScopes(),
      type: this.accessForm.get('type')?.value
    };

    try {
      await validateObjectForForm({
        classDto: CreateAccessDto,
        form: this.accessForm,
        object: access
      });

      this.dataService
        .postAccess(access)
        .pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === StatusCodes.BAD_REQUEST) {
              this.notificationService.alert({
                title: $localize`Oops! Could not grant access.`
              });
            }

            return EMPTY;
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(() => {
          this.dialogRef.close(access);
        });
    } catch (error) {
      console.error(error);
    }
  }

  private getExpiresAt() {
    const expiresAtControl = this.accessForm.get('expiresAt');
    const expiresAtOfAccess = this.data.access?.expiresAt;

    if (
      this.mode === 'update' &&
      !expiresAtControl?.dirty &&
      expiresAtOfAccess
    ) {
      return new Date(expiresAtOfAccess).toISOString();
    }

    const expiresAt = expiresAtControl?.value as Date;

    return isValid(expiresAt) ? endOfDay(expiresAt).toISOString() : '';
  }

  private getFilters(): Filter[] {
    return getFiltersFromPortfolioFilterFormValue(
      this.accessForm.get('filters')?.value
    );
  }

  private getScopes(): Scope[] {
    const scopesOfAccess = this.data.access?.scopes ?? [];

    if (
      scopesOfAccess.length > 0 &&
      this.accessLevel === getAccessLevel(scopesOfAccess)
    ) {
      return Object.values(scopes).filter((scope) => {
        return hasScope(scopesOfAccess, scope);
      });
    }

    return getScopesOfAccessLevel(this.accessLevel);
  }

  private loadHoldings() {
    this.dataService
      .fetchPortfolioHoldings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ holdings }) => {
        this.holdings = getHoldingsForFilter(holdings);

        this.updateFiltersFormControl(this.data.access?.settings?.filters);

        this.changeDetectorRef.markForCheck();
      });
  }

  private async updateAccess() {
    const accessId = this.data.access?.id;

    if (!accessId) {
      return;
    }

    const filters = this.getFilters();

    const access: UpdateAccessDto = {
      alias: this.accessForm.get('alias')?.value,
      expiresAt: this.getExpiresAt(),
      filters: filters.length > 0 ? filters : undefined,
      granteeUserId: this.accessForm.get('granteeUserId')?.value,
      id: accessId,
      scopes: this.getScopes()
    };

    try {
      await validateObjectForForm({
        classDto: UpdateAccessDto,
        form: this.accessForm,
        object: access
      });

      this.dataService
        .putAccess(access)
        .pipe(
          catchError(({ status }: HttpErrorResponse) => {
            if (status === StatusCodes.BAD_REQUEST) {
              this.notificationService.alert({
                title: $localize`Oops! Could not update access.`
              });
            }

            return EMPTY;
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(() => {
          this.dialogRef.close(access);
        });
    } catch (error) {
      console.error(error);
    }
  }

  private updateFiltersFormControl(filters: Filter[] | undefined) {
    if (!filters?.length) {
      return;
    }

    this.accessForm
      .get('filters')
      ?.setValue(getPortfolioFilterFormValue(filters, this.holdings));
  }
}
