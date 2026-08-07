import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { DataService } from '@ghostfolio/ui/services';

import { ClipboardModule } from '@angular/cdk/clipboard';
import { TextFieldModule } from '@angular/cdk/text-field';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  inject,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  checkmarkOutline,
  copyOutline
} from 'ionicons/icons';

import { UserAccountRegistrationDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ClipboardModule,
    FormsModule,
    IonIcon,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatStepperModule,
    ReactiveFormsModule,
    RouterModule,
    TextFieldModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-user-account-registration-dialog',
  styleUrls: ['./user-account-registration-dialog.scss'],
  templateUrl: 'user-account-registration-dialog.html'
})
export class GfUserAccountRegistrationDialogComponent {
  protected readonly stepper = viewChild.required(MatStepper);

  protected accessToken: string | undefined;
  protected authToken: string;
  protected isCreateAccountButtonDisabled = true;
  protected isDisclaimerChecked = false;
  protected role: string;
  protected readonly routerLinkAboutTermsOfService =
    publicRoutes.about.subRoutes.termsOfService.routerLink;

  protected readonly data =
    inject<UserAccountRegistrationDialogParams>(MAT_DIALOG_DATA);

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);

  public constructor() {
    addIcons({ arrowForwardOutline, checkmarkOutline, copyOutline });
  }

  protected createAccount() {
    this.dataService
      .postUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ accessToken, authToken, role }) => {
        this.accessToken = accessToken;
        this.authToken = authToken;
        this.role = role;

        this.stepper().next();

        this.changeDetectorRef.markForCheck();
      });
  }

  protected enableCreateAccountButton() {
    this.isCreateAccountButtonDisabled = false;
  }

  protected onChangeDislaimerChecked() {
    this.isDisclaimerChecked = !this.isDisclaimerChecked;
  }
}
