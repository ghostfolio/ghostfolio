import { DataService } from '@ghostfolio/client/services/data.service';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { ClipboardModule } from '@angular/cdk/clipboard';
import { TextFieldModule } from '@angular/cdk/text-field';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Inject,
  ViewChild
} from '@angular/core';
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
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ShowAccessTokenDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ClipboardModule,
    CommonModule,
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
  selector: 'gf-show-access-token-dialog',
  styleUrls: ['./show-access-token-dialog.scss'],
  templateUrl: 'show-access-token-dialog.html'
})
export class GfShowAccessTokenDialogComponent {
  @ViewChild(MatStepper) stepper!: MatStepper;

  public accessToken: string;
  public authToken: string;
  public isCreateAccountButtonDisabled = true;
  public isDisclaimerChecked = false;
  public role: string;
  public routerLinkAboutTermsOfService =
    publicRoutes.about.subRoutes.termsOfService.routerLink;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: ShowAccessTokenDialogParams,
    private dataService: DataService
  ) {
    addIcons({ arrowForwardOutline, checkmarkOutline, copyOutline });
  }

  public createAccount() {
    this.dataService
      .postUser()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ accessToken, authToken, role }) => {
        this.accessToken = accessToken;
        this.authToken = authToken;
        this.role = role;

        this.stepper.next();

        this.changeDetectorRef.markForCheck();
      });
  }

  public enableCreateAccountButton() {
    this.isCreateAccountButtonDisabled = false;
  }

  public onChangeDislaimerChecked() {
    this.isDisclaimerChecked = !this.isDisclaimerChecked;
  }
}
