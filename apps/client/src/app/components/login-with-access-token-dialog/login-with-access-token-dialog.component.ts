import { GfDialogHeaderComponent } from '@ghostfolio/client/components/dialog-header/dialog-header.component';
import {
  KEY_STAY_SIGNED_IN,
  SettingsStorageService
} from '@ghostfolio/client/services/settings-storage.service';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatCheckboxChange,
  MatCheckboxModule
} from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline } from 'ionicons/icons';

import { LoginWithAccessTokenDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfDialogHeaderComponent,
    IonIcon,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  selector: 'gf-login-with-access-token-dialog',
  styleUrls: ['./login-with-access-token-dialog.scss'],
  templateUrl: './login-with-access-token-dialog.html'
})
export class GfLoginWithAccessTokenDialogComponent {
  public accessTokenFormControl = new FormControl(
    this.data.accessToken,
    Validators.required
  );
  public isAccessTokenHidden = true;

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: LoginWithAccessTokenDialogParams,
    public dialogRef: MatDialogRef<GfLoginWithAccessTokenDialogComponent>,
    private settingsStorageService: SettingsStorageService
  ) {
    addIcons({ eyeOffOutline, eyeOutline });
  }

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
    if (this.accessTokenFormControl.valid) {
      this.dialogRef.close({
        accessToken: this.accessTokenFormControl.value
      });
    }
  }
}
