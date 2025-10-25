import { CreateAccessDto } from '@ghostfolio/api/app/access/create-access.dto';
import { UpdateAccessDto } from '@ghostfolio/api/app/access/update-access.dto';
import { Filter, PortfolioPosition } from '@ghostfolio/common/interfaces';
import { AccountWithPlatform } from '@ghostfolio/common/types';

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

  // Datos para el filtro
  public accounts: AccountWithPlatform[] = [];
  public assetClasses: Filter[] = [];
  public holdings: PortfolioPosition[] = [];
  public tags: Filter[] = [];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    public dialogRef: MatDialogRef<GfCreateOrUpdateAccessDialogComponent>,
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) private data: CreateOrUpdateAccessDialogParams,
    private dataService: DataService,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService
  ) {
    this.mode = this.data.access?.id ? 'update' : 'create';
  }

  public ngOnInit() {
    const isPublic = this.data.access.type === 'PUBLIC';

    this.accessForm = this.formBuilder.group({
      alias: [this.data.access.alias],
      filterAccount: [null],
      filterAssetClass: [null],
      filterHolding: [null],
      filterTag: [null],
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
        // Limpiar los filtros
        this.accessForm.get('filterAccount')?.setValue(null);
        this.accessForm.get('filterAssetClass')?.setValue(null);
        this.accessForm.get('filterHolding')?.setValue(null);
        this.accessForm.get('filterTag')?.setValue(null);
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

    // Si ya es público al iniciar, mostrar el panel y cargar datos
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
        holdings?: { dataSource: string; symbol: string }[];
        tagIds?: string[];
      }
    | undefined {
    const filterAccount = this.accessForm.get('filterAccount')?.value as
      | string
      | null;
    const filterAssetClass = this.accessForm.get('filterAssetClass')?.value as
      | string
      | null;
    const filterHolding = this.accessForm.get('filterHolding')?.value as
      | string
      | null;
    const filterTag = this.accessForm.get('filterTag')?.value as string | null;

    // Solo retornar filtro si hay al menos un campo con valor
    if (!filterAccount && !filterAssetClass && !filterHolding && !filterTag) {
      return undefined;
    }

    const filter: {
      accountIds?: string[];
      assetClasses?: string[];
      holdings?: { dataSource: string; symbol: string }[];
      tagIds?: string[];
    } = {};

    if (filterAccount) {
      filter.accountIds = [filterAccount];
    }

    if (filterAssetClass) {
      filter.assetClasses = [filterAssetClass];
    }

    if (filterHolding) {
      // Buscar el holding seleccionado para obtener dataSource y symbol
      const holding = this.holdings.find((h) => h.symbol === filterHolding);
      if (holding) {
        filter.holdings = [
          {
            dataSource: holding.dataSource,
            symbol: holding.symbol
          }
        ];
      }
    }

    if (filterTag) {
      filter.tagIds = [filterTag];
    }

    return filter;
  }

  private loadFilterData() {
    const existingFilter = this.data.access.settings?.filter;

    // Cargar cuentas
    this.dataService
      .fetchAccounts()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.accounts = response.accounts;

        // Si existe un filtro de cuenta, establecerlo
        if (existingFilter?.accountIds?.[0]) {
          this.accessForm
            .get('filterAccount')
            ?.setValue(existingFilter.accountIds[0]);
        }

        this.changeDetectorRef.markForCheck();
      });

    // Cargar holdings y asset classes
    this.dataService
      .fetchPortfolioDetails({})
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        if (response.holdings) {
          this.holdings = Object.values(response.holdings);

          // Extraer asset classes únicas
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

          // Si existe un filtro de asset class, establecerlo
          if (existingFilter?.assetClasses?.[0]) {
            this.accessForm
              .get('filterAssetClass')
              ?.setValue(existingFilter.assetClasses[0]);
          }

          // Si existe un filtro de holding, establecerlo
          if (existingFilter?.holdings?.[0]?.symbol) {
            this.accessForm
              .get('filterHolding')
              ?.setValue(existingFilter.holdings[0].symbol);
          }
        }
        this.changeDetectorRef.markForCheck();
      });

    // Cargar tags
    this.dataService
      .fetchTags()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.tags = response.map((tag) => ({
          id: tag.id,
          label: tag.name,
          type: 'TAG' as const
        }));

        // Si existe un filtro de tag, establecerlo
        if (existingFilter?.tagIds?.[0]) {
          this.accessForm.get('filterTag')?.setValue(existingFilter.tagIds[0]);
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  private async createAccess() {
    // Construir el objeto filter si estamos en modo PUBLIC
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
            if (error?.status === StatusCodes.BAD_REQUEST) {
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
    // Construir el objeto filter si estamos en modo PUBLIC
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
            if (error?.status === StatusCodes.BAD_REQUEST) {
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
