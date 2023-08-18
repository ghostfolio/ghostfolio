import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { OpenSourceSoftwareFriendsPageRoutingModule } from './oss-friends-page-routing.module';
import { OpenSourceSoftwareFriendsPageComponent } from './oss-friends-page.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

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
