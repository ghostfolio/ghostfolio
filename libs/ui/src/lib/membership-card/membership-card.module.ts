import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { MembershipCardComponent } from './membership-card.component';
import { GfLogoModule } from '@ghostfolio/ui/logo';

@NgModule({
  declarations: [MembershipCardComponent],
  exports: [MembershipCardComponent],
  imports: [CommonModule, GfLogoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GFMembershipCardModule {}
