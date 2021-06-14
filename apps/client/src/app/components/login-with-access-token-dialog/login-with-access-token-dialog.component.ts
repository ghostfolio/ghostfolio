import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'gf-login-with-access-token-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./login-with-access-token-dialog.scss'],
  templateUrl: 'login-with-access-token-dialog.html'
})
export class LoginWithAccessTokenDialog {
  public constructor(
    public dialogRef: MatDialogRef<LoginWithAccessTokenDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {}

  public onClose(): void {
    this.dialogRef.close();
  }
}
