import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { ThousandStarsOnGitHubRoutingModule } from './1000-stars-on-github-page-routing.module';
import { ThousandStarsOnGitHubPageComponent } from './1000-stars-on-github-page.component';

@NgModule({
  declarations: [ThousandStarsOnGitHubPageComponent],
  imports: [CommonModule, ThousandStarsOnGitHubRoutingModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ThousandStarsOnGitHubPageModule {}
