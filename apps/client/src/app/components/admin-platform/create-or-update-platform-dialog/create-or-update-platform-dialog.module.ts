import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { CreateOrUpdatePlatformDialog } from './create-or-update-platform-dialog.component';

@NgModule({
  declarations: [CreateOrUpdatePlatformDialog],
  imports: [
    CommonModule,
    FormsModule,
    GfEntityLogoComponent,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ]
})
export class GfCreateOrUpdatePlatformDialogModule {}
