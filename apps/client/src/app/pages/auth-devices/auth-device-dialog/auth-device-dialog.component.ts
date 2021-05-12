import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthDeviceDto } from '@ghostfolio/api/app/auth-device/auth-device.dto';

export interface AuthDeviceDialogParams {
  authDevice: AuthDeviceDto,
}

@Component({
  selector: 'gf-auth-device-dialog',
  templateUrl: './auth-device-dialog.component.html',
  styleUrls: ['./auth-device-dialog.component.css']
})
export class AuthDeviceDialog implements OnInit {

  public constructor(
    public dialogRef: MatDialogRef<AuthDeviceDialog>,
    @Inject(MAT_DIALOG_DATA) public data: AuthDeviceDialogParams
  ) {
  }

  ngOnInit(): void {
  }

}
