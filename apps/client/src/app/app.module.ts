import { GfLogoModule } from '@ghostfolio/ui/logo';

import { Platform } from '@angular/cdk/platform';
import { HttpClientModule } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatNativeDateModule
} from '@angular/material/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { MarkdownModule } from 'ngx-markdown';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { NgxStripeModule, STRIPE_PUBLISHABLE_KEY } from 'ngx-stripe';

import { environment } from '../environments/environment';
import { CustomDateAdapter } from './adapter/custom-date-adapter';
import { DateFormats } from './adapter/date-formats';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GfHeaderModule } from './components/header/header.module';
import { GfSubscriptionInterstitialDialogModule } from './components/subscription-interstitial-dialog/subscription-interstitial-dialog.module';
import { authInterceptorProviders } from './core/auth.interceptor';
import { httpResponseInterceptorProviders } from './core/http-response.interceptor';
import { LanguageService } from './core/language.service';

export function NgxStripeFactory(): string {
  return environment.stripePublicKey;
}

@NgModule({
  bootstrap: [AppComponent],
  declarations: [AppComponent],
  imports: [
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    GfHeaderModule,
    GfLogoModule,
    GfSubscriptionInterstitialDialogModule,
    HttpClientModule,
    MarkdownModule.forRoot(),
    MatAutocompleteModule,
    MatChipsModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatTooltipModule,
    NgxSkeletonLoaderModule,
    NgxStripeModule.forRoot(environment.stripePublicKey),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerImmediately'
    })
  ],
  providers: [
    authInterceptorProviders,
    httpResponseInterceptorProviders,
    LanguageService,
    {
      provide: DateAdapter,
      useClass: CustomDateAdapter,
      deps: [LanguageService, MAT_DATE_LOCALE, Platform]
    },
    { provide: MAT_DATE_FORMATS, useValue: DateFormats },
    {
      provide: STRIPE_PUBLISHABLE_KEY,
      useFactory: NgxStripeFactory
    }
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {}
