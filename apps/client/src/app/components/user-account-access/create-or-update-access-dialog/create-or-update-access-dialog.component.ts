import { UserService } from '@ghostfolio/client/services/user/user.service';
import { CreateAccessDto, UpdateAccessDto } from '@ghostfolio/common/dtos';
import { Filter, PortfolioPosition } from '@ghostfolio/common/interfaces';
import {
  SCOPES_OF_READ_ACCESS,
  SCOPES_OF_READ_RESTRICTED_ACCESS,
  SCOPES_OF_WRITE_ACCESS,
  Scope,
  hasAnyScopeOfWriteAccess,
  hasScope,
  scopes
} from '@ghostfolio/common/scopes';
import { AccountWithPlatform } from '@ghostfolio/common/types';
import { validateObjectForForm } from '@ghostfolio/common/utils';
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
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { StatusCodes } from 'http-status-codes';
import { EMPTY, catchError } from 'rxjs';

import {
  AccessLevel,
  CreateOrUpdateAccessDialogParams
} from './interfaces/interfaces';

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
  public holdings: PortfolioPosition[] = [];
  public tags: Filter[] = [];

  protected accessForm: FormGroup;
  protected readonly mode: 'create' | 'update';

  private hasExperimentalFeatures = false;

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

  public get canApplyFilters() {
    return (
      this.accessForm?.get('type')?.value === 'PUBLIC' &&
      this.hasExperimentalFeatures
    );
  }

  public ngOnInit() {
    const access = this.data?.access;
    const isPublic = access?.type === 'PUBLIC';

    this.accessForm = this.formBuilder.group({
      accessLevel: this.getAccessLevel(access?.scopes),
      alias: [access?.alias ?? ''],
      filters: [null],
      granteeUserId: [
        access?.grantee ?? null,
        isPublic ? null : Validators.required
      ],
      type: [
        { disabled: this.mode === 'update', value: access?.type ?? 'PRIVATE' },
        Validators.required
      ]
    });

    this.assetClasses = getAssetClassFilters();

    this.userService
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ accounts, settings, tags }) => {
        this.accounts = accounts;
        this.hasExperimentalFeatures = settings.isExperimentalFeatures ?? false;
        this.tags = getTagFilters(tags);

        this.changeDetectorRef.markForCheck();
      });

    this.accessForm
      .get('type')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((accessType) => {
        const granteeUserIdControl = this.accessForm.get('granteeUserId');

        if (accessType === 'PRIVATE') {
          granteeUserIdControl?.setValidators(Validators.required);
          this.accessForm.get('filters')?.setValue(null);
        } else {
          granteeUserIdControl?.clearValidators();
          granteeUserIdControl?.setValue(null);

          // A public access never exposes the monetary values and never
          // changes data
          this.accessForm.get('accessLevel')?.setValue('READ_RESTRICTED');
        }

        granteeUserIdControl?.updateValueAndValidity();

        this.changeDetectorRef.markForCheck();
      });

    this.loadHoldings();
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
    return getFiltersFromPortfolioFilterFormValue(
      this.accessForm.get('filters')?.value
    );
  }

  private buildScopes(): Scope[] {
    const accessLevel = this.accessForm.get('accessLevel')
      ?.value as AccessLevel;

    const scopesOfAccess = this.data.access?.scopes ?? [];

    if (
      scopesOfAccess.length > 0 &&
      accessLevel === this.getAccessLevel(scopesOfAccess)
    ) {
      return Object.values(scopes).filter((scope) => {
        return hasScope(scopesOfAccess, scope);
      });
    }

    switch (accessLevel) {
      case 'CREATE_READ_UPDATE_DELETE':
        return [...SCOPES_OF_READ_ACCESS, ...SCOPES_OF_WRITE_ACCESS];
      case 'READ':
        return [...SCOPES_OF_READ_ACCESS];
      default:
        return [...SCOPES_OF_READ_RESTRICTED_ACCESS];
    }
  }

  private async createAccess() {
    const filters = this.buildFilters();

    const access: CreateAccessDto = {
      alias: this.accessForm.get('alias')?.value,
      filters: filters.length > 0 ? filters : undefined,
      granteeUserId: this.accessForm.get('granteeUserId')?.value,
      scopes: this.buildScopes()
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

  private getAccessLevel(scopesOfAccess: string[] | undefined): AccessLevel {
    if (hasAnyScopeOfWriteAccess(scopesOfAccess)) {
      return 'CREATE_READ_UPDATE_DELETE';
    }

    return hasScope(scopesOfAccess, scopes.portfolioReadValues)
      ? 'READ'
      : 'READ_RESTRICTED';
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

    const filters = this.buildFilters();

    const access: UpdateAccessDto = {
      alias: this.accessForm.get('alias')?.value,
      filters: filters.length > 0 ? filters : undefined,
      granteeUserId: this.accessForm.get('granteeUserId')?.value,
      id: accessId,
      scopes: this.buildScopes()
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
