import { GfValueModule } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterModule } from '@angular/router';

import { UserAccountSettingsComponent } from './user-account-settings.component';

@NgModule({
  declarations: [UserAccountSettingsComponent],
  exports: [UserAccountSettingsComponent],
  imports: [
    CommonModule,
    FormsModule,
    GfValueModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    RouterModule
  ]
})
export class GfUserAccountSettingsModule {}
