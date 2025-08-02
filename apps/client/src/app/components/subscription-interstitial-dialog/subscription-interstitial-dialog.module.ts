import { GfMembershipCardComponent } from '@ghostfolio/ui/membership-card';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';

import { SubscriptionInterstitialDialog } from './subscription-interstitial-dialog.component';

@NgModule({
  declarations: [SubscriptionInterstitialDialog],
  imports: [
    CommonModule,
    GfMembershipCardComponent,
    GfPremiumIndicatorComponent,
    IonIcon,
    MatButtonModule,
    MatDialogModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfSubscriptionInterstitialDialogModule {}
