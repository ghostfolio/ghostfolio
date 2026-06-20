import { UserService } from '@ghostfolio/client/services/user/user.service';
import { CreateAccessDto, UpdateAccessDto } from '@ghostfolio/common/dtos';
import {
  AssetProfileIdentifier,
  Filter,
  PortfolioPosition
} from '@ghostfolio/common/interfaces';
import { AccountWithPlatform } from '@ghostfolio/common/types';
import { validateObjectForForm } from '@ghostfolio/common/utils';
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
import { AccessPermission } from '@prisma/client';
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
  public showFilterPanel = false;

  public accounts: AccountWithPlatform[] = [];
  public assetClasses: Filter[] = [];
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
          this.showFilterPanel = false;
          this.accessForm.get('filters')?.setValue(null);
        } else {
          granteeUserIdControl?.clearValidators();
          granteeUserIdControl?.setValue(null);
          permissionsControl?.setValue(
            access?.permissions[0] ?? AccessPermission.READ_RESTRICTED
          );
          this.showFilterPanel = true;
          this.loadFilterData();
        }

        granteeUserIdControl?.updateValueAndValidity();

        this.changeDetectorRef.markForCheck();
      });

    if (isPublic) {
      this.showFilterPanel = true;
      this.loadFilterData();
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

  private buildFilterObject():
    | {
        accountIds?: string[];
        assetClasses?: string[];
        holdings?: AssetProfileIdentifier[];
        tagIds?: string[];
      }
    | undefined {
    const filterValue = this.accessForm.get('filters')
      ?.value as PortfolioFilterFormValue | null;

    if (
      !filterValue ||
      (!filterValue.account &&
        !filterValue.assetClass &&
        !filterValue.holding &&
        !filterValue.tag)
    ) {
      return undefined;
    }

    const filter: {
      accountIds?: string[];
      assetClasses?: string[];
      holdings?: AssetProfileIdentifier[];
      tagIds?: string[];
    } = {};

    if (filterValue.account) {
      filter.accountIds = [filterValue.account];
    }

    if (filterValue.assetClass) {
      filter.assetClasses = [filterValue.assetClass];
    }

    if (filterValue.holding) {
      filter.holdings = [
        {
          dataSource: filterValue.holding.assetProfile.dataSource,
          symbol: filterValue.holding.assetProfile.symbol
        }
      ];
    }

    if (filterValue.tag) {
      filter.tagIds = [filterValue.tag];
    }

    return filter;
  }

  private loadFilterData() {
    const existingFilter = this.data.access?.settings?.filter;

    this.userService
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.accounts = user.accounts;
        this.tags = user.tags
          .filter(({ isUsed }) => isUsed)
          .map(({ id, name }) => ({
            id,
            label: name,
            type: 'TAG' as const
          }));
        this.updateFiltersFormControl(existingFilter);
      });

    this.dataService
      .fetchPortfolioDetails({})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (response.holdings) {
          this.holdings = Object.values(response.holdings);

          const assetClassesSet = new Set<string>();
          Object.values(response.holdings).forEach((holding) => {
            if (holding.assetProfile.assetClass) {
              assetClassesSet.add(holding.assetProfile.assetClass);
            }
          });
          this.assetClasses = Array.from(assetClassesSet).map((ac) => ({
            id: ac,
            label: ac,
            type: 'ASSET_CLASS' as const
          }));

          this.updateFiltersFormControl(existingFilter);
        }
        this.changeDetectorRef.markForCheck();
      });
  }

  private updateFiltersFormControl(
    existingFilter:
      | {
          accountIds?: string[];
          assetClasses?: string[];
          holdings?: AssetProfileIdentifier[];
          tagIds?: string[];
        }
      | undefined
  ) {
    if (!existingFilter) {
      return;
    }

    const filterValue: Partial<PortfolioFilterFormValue> = {};

    if (existingFilter.accountIds?.[0] && this.accounts.length > 0) {
      filterValue.account = existingFilter.accountIds[0];
    }

    if (existingFilter.assetClasses?.[0] && this.assetClasses.length > 0) {
      filterValue.assetClass = existingFilter.assetClasses[0];
    }

    if (existingFilter.holdings?.[0] && this.holdings.length > 0) {
      const holdingData = existingFilter.holdings[0];
      const holding = this.holdings.find(
        (h) =>
          h.assetProfile.dataSource === holdingData.dataSource &&
          h.assetProfile.symbol === holdingData.symbol
      );
      if (holding) {
        filterValue.holding = holding;
      }
    }

    if (existingFilter.tagIds?.[0] && this.tags.length > 0) {
      filterValue.tag = existingFilter.tagIds[0];
    }

    if (Object.keys(filterValue).length > 0) {
      this.accessForm.get('filters')?.setValue(filterValue);
      this.changeDetectorRef.markForCheck();
    }
  }

  private async createAccess() {
    const filter = this.showFilterPanel ? this.buildFilterObject() : undefined;

    const access: CreateAccessDto = {
      alias: this.accessForm.get('alias')?.value,
      filter,
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

    const filter = this.showFilterPanel ? this.buildFilterObject() : undefined;

    const access: UpdateAccessDto = {
      alias: this.accessForm.get('alias')?.value,
      filter,
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
