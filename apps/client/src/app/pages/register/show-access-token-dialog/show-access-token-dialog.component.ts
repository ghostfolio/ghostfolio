import { DataService } from '@ghostfolio/client/services/data.service';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ViewChild
} from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-show-access-token-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./show-access-token-dialog.scss'],
  templateUrl: 'show-access-token-dialog.html',
  standalone: false
})
export class ShowAccessTokenDialog {
  @ViewChild(MatStepper) stepper!: MatStepper;
  public accessToken: string;
  public authToken: string;
  public disclaimerChecked = false;
  public isCreateAccountButtonDisabled = true;
  public role: string;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService
  ) {}

  public onChangeDislaimerChecked() {
    this.disclaimerChecked = !this.disclaimerChecked;
  }

  public enableCreateAccountButton() {
    this.isCreateAccountButtonDisabled = false;
  }

  public async createAccount() {
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
}
