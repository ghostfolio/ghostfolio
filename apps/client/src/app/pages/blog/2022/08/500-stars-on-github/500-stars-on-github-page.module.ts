import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { FiveHundredStarsOnGitHubRoutingModule } from './500-stars-on-github-page-routing.module';
import { FiveHundredStarsOnGitHubPageComponent } from './500-stars-on-github-page.component';

@NgModule({
  declarations: [FiveHundredStarsOnGitHubPageComponent],
  imports: [CommonModule, FiveHundredStarsOnGitHubRoutingModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FiveHundredStarsOnGitHubPageModule {}
