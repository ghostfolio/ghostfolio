import { DataService } from '@ghostfolio/client/services/data.service';
import { routes } from '@ghostfolio/common/routes';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  ViewChild
} from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ShowAccessTokenDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-show-access-token-dialog',
  standalone: false,
  styleUrls: ['./show-access-token-dialog.scss'],
  templateUrl: 'show-access-token-dialog.html'
})
export class ShowAccessTokenDialog {
  @ViewChild(MatStepper) stepper!: MatStepper;

  public accessToken: string;
  public authToken: string;
  public isCreateAccountButtonDisabled = true;
  public isDisclaimerChecked = false;
  public role: string;
  public routerLinkAboutTermsOfService = [
    '/' + routes.about,
    routes.termsOfService
  ];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: ShowAccessTokenDialogParams,
    private dataService: DataService
  ) {}

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
