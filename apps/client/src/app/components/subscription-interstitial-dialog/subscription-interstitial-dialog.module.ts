import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { RouterModule } from '@angular/router';
import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';

import { SubscriptionInterstitialDialog } from './subscription-interstitial-dialog.component';

@NgModule({
  declarations: [SubscriptionInterstitialDialog],
  imports: [
    CommonModule,
    GfPremiumIndicatorModule,
    MatButtonModule,
    MatDialogModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfSubscriptionInterstitialDialogModule {}
