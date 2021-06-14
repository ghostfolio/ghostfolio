import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  STAY_SIGNED_IN,
  SettingsStorageService
} from '@ghostfolio/client/services/settings-storage.service';

@Component({
  selector: 'gf-login-with-access-token-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./login-with-access-token-dialog.scss'],
  templateUrl: 'login-with-access-token-dialog.html'
})
export class LoginWithAccessTokenDialog {
  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<LoginWithAccessTokenDialog>,
    private settingsStorageService: SettingsStorageService
  ) {}

  ngOnInit() {}

  public onChangeStaySignedIn(aValue: MatCheckboxChange) {
    this.settingsStorageService.setSetting(
      STAY_SIGNED_IN,
      aValue.checked?.toString()
    );
  }

  public onClose() {
    this.dialogRef.close();
  }
}
