import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthDeviceDialogParams } from '@ghostfolio/api/app/auth/interfaces/interfaces';

@Component({
  selector: 'gf-auth-device-dialog',
  templateUrl: './auth-device-dialog.component.html',
  styleUrls: ['./auth-device-dialog.component.css']
})
export class AuthDeviceDialog implements OnInit {
  public constructor(
    public dialogRef: MatDialogRef<AuthDeviceDialog>,
    @Inject(MAT_DIALOG_DATA) public data: AuthDeviceDialogParams
  ) {}

  public ngOnInit(): void {}
}
