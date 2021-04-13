import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { DataService } from '../../../services/data.service';

@Component({
  selector: 'login-with-access-token-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./login-with-access-token-dialog.scss'],
  templateUrl: 'login-with-access-token-dialog.html'
})
export class LoginWithAccessTokenDialog {
  public constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {}
}
