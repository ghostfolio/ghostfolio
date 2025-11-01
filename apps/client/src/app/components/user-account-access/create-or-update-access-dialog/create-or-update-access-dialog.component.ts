import { CreateAccessDto } from '@ghostfolio/api/app/access/create-access.dto';
import { UpdateAccessDto } from '@ghostfolio/api/app/access/update-access.dto';
import {
  AssetProfileIdentifier,
  Filter,
  PortfolioPosition
} from '@ghostfolio/common/interfaces';
import { AccountWithPlatform } from '@ghostfolio/common/types';
import {
  GfPortfolioFilterFormComponent,
  PortfolioFilterFormValue
} from '@ghostfolio/ui/portfolio-filter-form';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit
} from '@angular/core';
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
import { EMPTY, Subject, catchError, takeUntil } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { DataService } from '../../../services/data.service';
import { validateObjectForForm } from '../../../util/form.util';
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
export class GfCreateOrUpdateAccessDialogComponent
  implements OnDestroy, OnInit
{
  public accessForm: FormGroup;
  public mode: 'create' | 'update';
  public showFilterPanel = false;

  public accounts: AccountWithPlatform[] = [];
  public assetClasses: Filter[] = [];
  public holdings: PortfolioPosition[] = [];
  public tags: Filter[] = [];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) private data: CreateOrUpdateAccessDialogParams,
    private dataService: DataService,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService,
    public dialogRef: MatDialogRef<GfCreateOrUpdateAccessDialogComponent>
  ) {
    this.mode = this.data.access?.id ? 'update' : 'create';
  }

  public ngOnInit() {
    const isPublic = this.data.access.type === 'PUBLIC';

    this.accessForm = this.formBuilder.group({
      alias: [this.data.access.alias],
      filters: [null],
      granteeUserId: [
        this.data.access.grantee,
        isPublic
          ? null
          : [(control: AbstractControl) => Validators.required(control)]
      ],
      permissions: [
        this.data.access.permissions[0],
        [(control: AbstractControl) => Validators.required(control)]
      ],
      type: [
        { disabled: this.mode === 'update', value: this.data.access.type },
        [(control: AbstractControl) => Validators.required(control)]
      ]
    });

    this.accessForm.get('type').valueChanges.subscribe((accessType) => {
      const granteeUserIdControl = this.accessForm.get('granteeUserId');
      const permissionsControl = this.accessForm.get('permissions');

      if (accessType === 'PRIVATE') {
        granteeUserIdControl.setValidators([
          (control: AbstractControl) => Validators.required(control)
        ]);
        this.showFilterPanel = false;
        this.accessForm.get('filters')?.setValue(null);
      } else {
        granteeUserIdControl.clearValidators();
        granteeUserIdControl.setValue(null);
        permissionsControl.setValue(this.data.access.permissions[0]);
        this.showFilterPanel = true;
        this.loadFilterData();
      }

      granteeUserIdControl.updateValueAndValidity();

      this.changeDetectorRef.markForCheck();
    });

    if (isPublic) {
      this.showFilterPanel = true;
      this.loadFilterData();
    }
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public async onSubmit() {
    if (this.mode === 'create') {
      await this.createAccess();
    } else {
      await this.updateAccess();
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
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
          dataSource: filterValue.holding.dataSource,
          symbol: filterValue.holding.symbol
        }
      ];
    }

    if (filterValue.tag) {
      filter.tagIds = [filterValue.tag];
    }

    return filter;
  }

  private loadFilterData() {
    const existingFilter = this.data.access.settings?.filter;

    this.dataService
      .fetchAccounts()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.accounts = response.accounts;
        this.updateFiltersFormControl(existingFilter);
      });

    this.dataService
      .fetchPortfolioDetails({})
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        if (response.holdings) {
          this.holdings = Object.values(response.holdings);

          const assetClassesSet = new Set<string>();
          Object.values(response.holdings).forEach((holding) => {
            if (holding.assetClass) {
              assetClassesSet.add(holding.assetClass);
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

    this.dataService
      .fetchTags()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.tags = response.map((tag) => ({
          id: tag.id,
          label: tag.name,
          type: 'TAG' as const
        }));

        this.updateFiltersFormControl(existingFilter);
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
          h.dataSource === holdingData.dataSource &&
          h.symbol === holdingData.symbol
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
      alias: this.accessForm.get('alias')?.value as string,
      filter: filter,
      granteeUserId: this.accessForm.get('granteeUserId')?.value as string,
      permissions: [
        this.accessForm.get('permissions')?.value as AccessPermission
      ]
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
          catchError((error: { status?: number }) => {
            if (error.status === (StatusCodes.BAD_REQUEST as number)) {
              this.notificationService.alert({
                title: $localize`Oops! Could not grant access.`
              });
            }

            return EMPTY;
          }),
          takeUntil(this.unsubscribeSubject)
        )
        .subscribe(() => {
          this.dialogRef.close(access);
        });
    } catch (error) {
      console.error(error);
    }
  }

  private async updateAccess() {
    const filter = this.showFilterPanel ? this.buildFilterObject() : undefined;

    const access: UpdateAccessDto = {
      alias: this.accessForm.get('alias')?.value as string,
      filter: filter,
      granteeUserId: this.accessForm.get('granteeUserId')?.value as string,
      id: this.data.access.id,
      permissions: [
        this.accessForm.get('permissions')?.value as AccessPermission
      ]
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
          catchError((error: { status?: number }) => {
            if (error.status === (StatusCodes.BAD_REQUEST as number)) {
              this.notificationService.alert({
                title: $localize`Oops! Could not update access.`
              });
            }

            return EMPTY;
          }),
          takeUntil(this.unsubscribeSubject)
        )
        .subscribe(() => {
          this.dialogRef.close(access);
        });
    } catch (error) {
      console.error(error);
    }
  }
}
