import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { ActivityTypeComponent } from './activity-type.component';

@NgModule({
  declarations: [ActivityTypeComponent],
  exports: [ActivityTypeComponent],
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfActivityTypeModule {}
