import { UserService } from '@ghostfolio/client/services/user/user.service';
import { CreateAccessDto, UpdateAccessDto } from '@ghostfolio/common/dtos';
import { Filter, PortfolioPosition } from '@ghostfolio/common/interfaces';
import { AccountWithPlatform } from '@ghostfolio/common/types';
import { validateObjectForForm } from '@ghostfolio/common/utils';
import { translate } from '@ghostfolio/ui/i18n';
import { NotificationService } from '@ghostfolio/ui/notifications';
import {
  GfPortfolioFilterFormComponent,
  PortfolioFilterFormValue
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
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AccessPermission, AssetClass } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { EMPTY, catchError } from 'rxjs';

import { CreateOrUpdateAccessDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  imports: [
    FormsModule,
    GfPortfolioFilterFormComponent,
    MatButtonModule,
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
  public hasExperimentalFeatures = false;
  public holdings: PortfolioPosition[] = [];
  public tags: Filter[] = [];

  protected accessForm: FormGroup;
  protected readonly mode: 'create' | 'update';

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  private readonly data =
    inject<CreateOrUpdateAccessDialogParams>(MAT_DIALOG_DATA);

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

  public ngOnInit() {
    const access = this.data?.access;
    const isPublic = access?.type === 'PUBLIC';

    this.accessForm = this.formBuilder.group({
      alias: [access?.alias ?? ''],
      filters: [null],
      granteeUserId: [
        access?.grantee ?? null,
        isPublic ? null : Validators.required
      ],
      permissions: [
        access?.permissions[0] ?? AccessPermission.READ_RESTRICTED,
        Validators.required
      ],
      type: [
        { disabled: this.mode === 'update', value: access?.type ?? 'PRIVATE' },
        Validators.required
      ]
    });

    this.assetClasses = Object.keys(AssetClass)
      .map((assetClass) => {
        return {
          id: assetClass,
          label: translate(assetClass),
          type: 'ASSET_CLASS' as const
        };
      })
      .sort((a, b) => {
        return a.label.localeCompare(b.label);
      });

    this.userService
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ accounts, settings, tags }) => {
        this.accounts = accounts;
        this.hasExperimentalFeatures = settings.isExperimentalFeatures ?? false;

        this.tags =
          tags
            ?.filter(({ isUsed }) => {
              return isUsed;
            })
            ?.map(({ id, name }) => {
              return {
                id,
                label: translate(name),
                type: 'TAG' as const
              };
            })
            ?.sort((a, b) => {
              return a.label.localeCompare(b.label);
            }) ?? [];

        this.updateFiltersFormControl(this.data.access?.settings?.filters);

        this.changeDetectorRef.markForCheck();
      });

    this.accessForm
      .get('type')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((accessType) => {
        const granteeUserIdControl = this.accessForm.get('granteeUserId');
        const permissionsControl = this.accessForm.get('permissions');

        if (accessType === 'PRIVATE') {
          granteeUserIdControl?.setValidators([
            (control: AbstractControl) => Validators.required(control)
          ]);
          this.accessForm.get('filters')?.setValue(null);
        } else {
          granteeUserIdControl?.clearValidators();
          granteeUserIdControl?.setValue(null);
          permissionsControl?.setValue(
            access?.permissions[0] ?? AccessPermission.READ_RESTRICTED
          );

          if (this.hasExperimentalFeatures) {
            this.loadHoldings();
          }
        }

        granteeUserIdControl?.updateValueAndValidity();

        this.changeDetectorRef.markForCheck();
      });

    if (isPublic && this.hasExperimentalFeatures) {
      this.loadHoldings();
    }
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

  private buildFilters(): Filter[] {
    const filterValue = this.accessForm.get('filters')
      ?.value as PortfolioFilterFormValue | null;

    if (!filterValue) {
      return [];
    }

    const filters: Filter[] = [];

    if (filterValue.account) {
      filters.push({ id: filterValue.account, type: 'ACCOUNT' });
    }

    if (filterValue.assetClass) {
      filters.push({ id: filterValue.assetClass, type: 'ASSET_CLASS' });
    }

    if (filterValue.holding) {
      filters.push(
        {
          id: filterValue.holding.assetProfile.dataSource,
          type: 'DATA_SOURCE'
        },
        {
          id: filterValue.holding.assetProfile.symbol,
          type: 'SYMBOL'
        }
      );
    }

    if (filterValue.tag) {
      filters.push({ id: filterValue.tag, type: 'TAG' });
    }

    return filters;
  }

  private loadHoldings() {
    this.dataService
      .fetchPortfolioHoldings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ holdings }) => {
        this.holdings = holdings
          .filter(({ assetProfile }) => {
            return (
              assetProfile.assetSubClass &&
              !['CASH'].includes(assetProfile.assetSubClass)
            );
          })
          .sort((a, b) => {
            return (a.assetProfile.name ?? '').localeCompare(
              b.assetProfile.name ?? ''
            );
          });

        this.updateFiltersFormControl(this.data.access?.settings?.filters);

        this.changeDetectorRef.markForCheck();
      });
  }

  private updateFiltersFormControl(existingFilters: Filter[] | undefined) {
    if (!existingFilters?.length) {
      return;
    }

    const filterValue: Partial<PortfolioFilterFormValue> = {};

    const accountFilter = existingFilters.find(({ type }) => {
      return type === 'ACCOUNT';
    });
    if (accountFilter && this.accounts.length > 0) {
      filterValue.account = accountFilter.id;
    }

    const assetClassFilter = existingFilters.find(({ type }) => {
      return type === 'ASSET_CLASS';
    });
    if (assetClassFilter && this.assetClasses.length > 0) {
      filterValue.assetClass = assetClassFilter.id;
    }

    const dataSourceFilter = existingFilters.find(({ type }) => {
      return type === 'DATA_SOURCE';
    });
    const symbolFilter = existingFilters.find(({ type }) => {
      return type === 'SYMBOL';
    });
    if (dataSourceFilter && symbolFilter && this.holdings.length > 0) {
      const holding = this.holdings.find(({ assetProfile }) => {
        return (
          assetProfile.dataSource === dataSourceFilter.id &&
          assetProfile.symbol === symbolFilter.id
        );
      });
      if (holding) {
        filterValue.holding = holding;
      }
    }

    const tagFilter = existingFilters.find(({ type }) => {
      return type === 'TAG';
    });
    if (tagFilter && this.tags.length > 0) {
      filterValue.tag = tagFilter.id;
    }

    if (Object.keys(filterValue).length > 0) {
      this.accessForm.get('filters')?.setValue(filterValue);
      this.changeDetectorRef.markForCheck();
    }
  }

  private async createAccess() {
    const filters = this.buildFilters();

    const access: CreateAccessDto = {
      alias: this.accessForm.get('alias')?.value,
      filters: filters.length > 0 ? filters : undefined,
      granteeUserId: this.accessForm.get('granteeUserId')?.value,
      permissions: [this.accessForm.get('permissions')?.value]
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

  private async updateAccess() {
    const accessId = this.data.access?.id;

    if (!accessId) {
      return;
    }

    const filters = this.buildFilters();

    const access: UpdateAccessDto = {
      alias: this.accessForm.get('alias')?.value,
      filters: filters.length > 0 ? filters : undefined,
      granteeUserId: this.accessForm.get('granteeUserId')?.value,
      id: accessId,
      permissions: [this.accessForm.get('permissions')?.value]
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
}
