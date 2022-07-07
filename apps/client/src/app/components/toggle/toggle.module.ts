import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';

import { ToggleComponent } from './toggle.component';

@NgModule({
  declarations: [ToggleComponent],
  exports: [ToggleComponent],
  imports: [CommonModule, MatRadioModule, ReactiveFormsModule]
})
export class GfToggleModule {}
