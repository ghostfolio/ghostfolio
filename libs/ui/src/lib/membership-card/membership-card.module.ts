import { GfLogoModule } from '@ghostfolio/ui/logo';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MembershipCardComponent } from './membership-card.component';

@NgModule({
  declarations: [MembershipCardComponent],
  exports: [MembershipCardComponent],
  imports: [CommonModule, GfLogoModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfMembershipCardModule {}
