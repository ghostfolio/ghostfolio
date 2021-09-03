import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ValueComponent } from './value/value.component';
// import { GfValueModule } from './value/value.module';

@NgModule({
  imports: [CommonModule /*, GfValueModule*/],
  declarations: [ValueComponent],
  exports: [ValueComponent]
})
export class UiModule {}
