import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { OpenSourceSoftwareFriendsPageRoutingModule } from './oss-friends-page-routing.module';
import { OpenSourceSoftwareFriendsPageComponent } from './oss-friends-page.component';

@NgModule({
  declarations: [OpenSourceSoftwareFriendsPageComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    OpenSourceSoftwareFriendsPageRoutingModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class OpenSourceSoftwareFriendsPageModule {}
