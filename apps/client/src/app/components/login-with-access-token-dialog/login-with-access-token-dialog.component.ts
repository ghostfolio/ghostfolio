import { InternetIdentityService } from '@ghostfolio/client/services/internet-identity.service';
import {
  KEY_STAY_SIGNED_IN,
  SettingsStorageService
} from '@ghostfolio/client/services/settings-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';

import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
  selector: 'gf-login-with-access-token-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./login-with-access-token-dialog.scss'],
  templateUrl: 'login-with-access-token-dialog.html'
})
export class LoginWithAccessTokenDialog {
  public isAccessTokenHidden = true;

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<LoginWithAccessTokenDialog>,
    private internetIdentityService: InternetIdentityService,
    private router: Router,
    private settingsStorageService: SettingsStorageService,
    private tokenStorageService: TokenStorageService
  ) {}

  ngOnInit() {}

  public onChangeStaySignedIn(aValue: MatCheckboxChange) {
    this.settingsStorageService.setSetting(
      KEY_STAY_SIGNED_IN,
      aValue.checked?.toString()
    );
  }

  public onClose() {
    this.dialogRef.close();
  }

  public onLoginWithAccessToken() {
    if (this.data.accessToken) {
      this.dialogRef.close(this.data);
    }
  }

  public async onLoginWithInternetIdentity() {
    try {
      const { authToken } = await this.internetIdentityService.login();

      this.tokenStorageService.saveToken(authToken);
      this.dialogRef.close();
      this.router.navigate(['/']);
    } catch {}
  }
}
