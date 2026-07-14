import { UserService } from '@ghostfolio/client/services/user/user.service';
import { TAG_ID_EXCLUDE_FROM_ANALYSIS } from '@ghostfolio/common/config';
import { CreateAccountDto, UpdateAccountDto } from '@ghostfolio/common/dtos';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { validateObjectForForm } from '@ghostfolio/common/utils';
import { GfCurrencySelectorComponent } from '@ghostfolio/ui/currency-selector';
import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';
import { translate } from '@ghostfolio/ui/i18n';
import { DataService } from '@ghostfolio/ui/services';
import { GfTagsSelectorComponent } from '@ghostfolio/ui/tags-selector';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { Platform, Tag } from '@prisma/client';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { CreateOrUpdateAccountDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  imports: [
    CommonModule,
    GfCurrencySelectorComponent,
    GfEntityLogoComponent,
    GfTagsSelectorComponent,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  selector: 'gf-create-or-update-account-dialog',
  styleUrls: ['./create-or-update-account-dialog.scss'],
  templateUrl: 'create-or-update-account-dialog.html'
})
export class GfCreateOrUpdateAccountDialogComponent {
  protected accountForm: FormGroup;
  protected currencies: string[] = [];
  protected filteredPlatforms: Observable<Platform[]> | undefined;
  protected hasPermissionToCreateOwnTag: boolean | undefined;
  protected platforms: Platform[] = [];
  protected tagsAvailable: Tag[] = [];

  protected readonly data =
    inject<CreateOrUpdateAccountDialogParams>(MAT_DIALOG_DATA);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef =
    inject<MatDialogRef<GfCreateOrUpdateAccountDialogComponent>>(MatDialogRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly userService = inject(UserService);

  public ngOnInit() {
    const { currencies } = this.dataService.fetchInfo();
    this.currencies = currencies;

    this.hasPermissionToCreateOwnTag =
      this.data.user?.settings?.isExperimentalFeatures &&
      hasPermission(this.data.user?.permissions, permissions.createOwnTag);

    this.tagsAvailable = [
      ...(this.data.user?.tags ?? []),
      {
        id: TAG_ID_EXCLUDE_FROM_ANALYSIS,
        name: 'EXCLUDE_FROM_ANALYSIS',
        userId: null
      }
    ].map((tag) => {
      return {
        ...tag,
        name: translate(tag.name)
      };
    });

    this.accountForm = this.formBuilder.group({
      accountId: [{ disabled: true, value: this.data.account.id }],
      balance: [this.data.account.balance, Validators.required],
      comment: [this.data.account.comment],
      currency: [this.data.account.currency, Validators.required],
      isExcluded: [this.data.account.isExcluded],
      name: [this.data.account.name, Validators.required],
      platformId: [null, this.autocompleteObjectValidator()],
      tags: [
        this.data.account.tags?.map(({ id, name }) => {
          return {
            id,
            name: translate(name)
          };
        })
      ]
    });

    this.accountForm
      .get('tags')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tags: Tag[]) => {
        const newTag = tags.find(({ id }) => {
          return id === undefined;
        });

        if (newTag && this.hasPermissionToCreateOwnTag) {
          this.dataService
            .postTag({ ...newTag, userId: this.data.user.id })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((tag) => {
              this.accountForm.get('tags')?.setValue(
                tags.map((currentTag) => {
                  if (currentTag.id === undefined) {
                    return tag;
                  }

                  return currentTag;
                })
              );

              this.userService
                .get(true)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe();
            });
        }
      });

    this.dataService.fetchPlatforms().subscribe(({ platforms }) => {
      this.platforms = platforms;

      const selectedPlatform = this.platforms.find(({ id }) => {
        return id === this.data.account.platformId;
      });

      this.accountForm.patchValue(
        {
          platformId: selectedPlatform
        },
        { emitEvent: false }
      );

      this.filteredPlatforms = this.accountForm
        .get('platformId')
        ?.valueChanges.pipe(
          startWith(''),
          map((value: Platform | string) => {
            const name = typeof value === 'string' ? value : value?.name;
            return name ? this.filter(name) : this.platforms.slice();
          })
        );
    });
  }

  protected autoCompleteCheck() {
    const inputValue = this.accountForm.get('platformId')?.value;

    if (typeof inputValue === 'string') {
      const matchingEntry = this.platforms.find(({ name }) => {
        return name === inputValue;
      });

      if (matchingEntry) {
        this.accountForm.get('platformId')?.setValue(matchingEntry);
      }
    }
  }

  protected displayFn(platform: Platform) {
    return platform?.name ?? '';
  }

  protected onCancel() {
    this.dialogRef.close();
  }

  protected async onSubmit() {
    const account: CreateAccountDto | UpdateAccountDto = {
      balance: this.accountForm.get('balance')?.value,
      comment: this.accountForm.get('comment')?.value ?? null,
      currency: this.accountForm.get('currency')?.value,
      id: this.accountForm.get('accountId')?.value,
      isExcluded: this.accountForm.get('isExcluded')?.value,
      name: this.accountForm.get('name')?.value,
      platformId: this.accountForm.get('platformId')?.value?.id ?? null,
      tags: this.accountForm
        .get('tags')
        ?.value?.filter(({ id }: Tag) => {
          // Skip tags which have not been created yet
          return !!id;
        })
        .map(({ id }: Tag) => {
          return id;
        })
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
      return name?.toLowerCase().startsWith(filterValue);
    });
  }
}
