import { CreateAccountDto } from '@ghostfolio/api/app/account/create-account.dto';
import { UpdateAccountDto } from '@ghostfolio/api/app/account/update-account.dto';
import { DataService } from '@ghostfolio/client/services/data.service';
import { validateObjectForForm } from '@ghostfolio/client/util/form.util';
import { GfCurrencySelectorComponent } from '@ghostfolio/ui/currency-selector';
import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';

import { CommonModule, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Platform } from '@prisma/client';
import { Observable, Subject } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { CreateOrUpdateAccountDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  imports: [
    CommonModule,
    GfCurrencySelectorComponent,
    GfEntityLogoComponent,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    NgClass,
    ReactiveFormsModule
  ],
  selector: 'gf-create-or-update-account-dialog',
  styleUrls: ['./create-or-update-account-dialog.scss'],
  templateUrl: 'create-or-update-account-dialog.html'
})
export class GfCreateOrUpdateAccountDialogComponent implements OnDestroy {
  public accountForm: FormGroup;
  public currencies: string[] = [];
  public filteredPlatforms: Observable<Platform[]>;
  public platforms: Platform[];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: CreateOrUpdateAccountDialogParams,
    private dataService: DataService,
    public dialogRef: MatDialogRef<GfCreateOrUpdateAccountDialogComponent>,
    private formBuilder: FormBuilder
  ) {}

  public ngOnInit() {
    const { currencies, platforms } = this.dataService.fetchInfo();

    this.currencies = currencies;
    this.platforms = platforms;

    this.accountForm = this.formBuilder.group({
      accountId: [{ disabled: true, value: this.data.account.id }],
      balance: [this.data.account.balance, Validators.required],
      comment: [this.data.account.comment],
      currency: [this.data.account.currency, Validators.required],
      isExcluded: [this.data.account.isExcluded],
      name: [this.data.account.name, Validators.required],
      platformId: [
        this.platforms.find(({ id }) => {
          return id === this.data.account.platformId;
        }),
        this.autocompleteObjectValidator()
      ]
    });

    this.filteredPlatforms = this.accountForm
      .get('platformId')
      .valueChanges.pipe(
        startWith(''),
        map((value) => {
          const name = typeof value === 'string' ? value : value?.name;
          return name ? this.filter(name as string) : this.platforms.slice();
        })
      );
  }

  public autoCompleteCheck() {
    const inputValue = this.accountForm.get('platformId').value;

    if (typeof inputValue === 'string') {
      const matchingEntry = this.platforms.find(({ name }) => {
        return name === inputValue;
      });

      if (matchingEntry) {
        this.accountForm.get('platformId').setValue(matchingEntry);
      }
    }
  }

  public displayFn(platform: Platform) {
    return platform?.name ?? '';
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public async onSubmit() {
    const account: CreateAccountDto | UpdateAccountDto = {
      balance: this.accountForm.get('balance').value,
      comment: this.accountForm.get('comment').value || null,
      currency: this.accountForm.get('currency').value,
      id: this.accountForm.get('accountId').value,
      isExcluded: this.accountForm.get('isExcluded').value,
      name: this.accountForm.get('name').value,
      platformId: this.accountForm.get('platformId').value?.id || null
    };

    try {
      if (this.data.account.id) {
        (account as UpdateAccountDto).id = this.data.account.id;

        await validateObjectForForm({
          classDto: UpdateAccountDto,
          form: this.accountForm,
          object: account
        });

        this.dialogRef.close(account as UpdateAccountDto);
      } else {
        delete (account as CreateAccountDto).id;

        await validateObjectForForm({
          classDto: CreateAccountDto,
          form: this.accountForm,
          object: account
        });

        this.dialogRef.close(account as CreateAccountDto);
      }
    } catch (error) {
      console.error(error);
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private autocompleteObjectValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      if (control.value && typeof control.value === 'string') {
        return { invalidAutocompleteObject: { value: control.value } };
      }

      return null;
    };
  }

  private filter(value: string): Platform[] {
    const filterValue = value.toLowerCase();

    return this.platforms.filter(({ name }) => {
      return name.toLowerCase().startsWith(filterValue);
    });
  }
}
