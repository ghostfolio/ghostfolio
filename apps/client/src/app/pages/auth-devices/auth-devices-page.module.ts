import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthDevicesPageRoutingModule } from '@ghostfolio/client/pages/auth-devices/auth-devices-page-routing.module';
import { AuthDevicesPageComponent } from '@ghostfolio/client/pages/auth-devices/auth-devices-page.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GfAuthDeviceSettingsModule } from '@ghostfolio/client/components/auth-device-settings/auth-device-settings.module';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AuthDeviceDialog } from '@ghostfolio/client/pages/auth-devices/auth-device-dialog/auth-device-dialog.component';



@NgModule({
  declarations: [
    AuthDevicesPageComponent,
    AuthDeviceDialog,
  ],
  imports: [
    CommonModule,
    AuthDevicesPageRoutingModule,
    FormsModule,
    GfAuthDeviceSettingsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatButtonModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AuthDevicesPageModule { }
