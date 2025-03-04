import { DataService } from '@ghostfolio/client/services/data.service';

import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  ViewChild
} from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
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
  public isCreateAccountButtonDisabled = true;
  public disclaimerChecked = false;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
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
        this.data = {
          accessToken,
          authToken,
          role
        };
        this.stepper.next();
      });
  }
}
