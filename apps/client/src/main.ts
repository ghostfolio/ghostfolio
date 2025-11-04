import { locale } from '@ghostfolio/common/config';
import { InfoResponse } from '@ghostfolio/common/interfaces';
import { filterGlobalPermissions } from '@ghostfolio/common/permissions';

import { Platform } from '@angular/cdk/platform';
import {
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';
import { enableProdMode, importProvidersFrom, LOCALE_ID } from '@angular/core';
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
import { bootstrapApplication } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideMarkdown } from 'ngx-markdown';
import { provideNgxSkeletonLoader } from 'ngx-skeleton-loader';
import { NgxStripeModule, STRIPE_PUBLISHABLE_KEY } from 'ngx-stripe';

import { CustomDateAdapter } from './app/adapter/custom-date-adapter';
import { DateFormats } from './app/adapter/date-formats';
import { AppRoutingModule } from './app/app-routing.module';
import { GfAppComponent } from './app/app.component';
import { authInterceptorProviders } from './app/core/auth.interceptor';
import { httpResponseInterceptorProviders } from './app/core/http-response.interceptor';
import { LanguageService } from './app/core/language.service';
import { GfNotificationModule } from './app/core/notification/notification.module';
import { environment } from './environments/environment';

(async () => {
  const response = await fetch('/api/v1/info');
  const info: InfoResponse = await response.json();
  const utmSource = window.localStorage.getItem('utm_source') as
    | 'ios'
    | 'trusted-web-activity';

  info.globalPermissions = filterGlobalPermissions(
    info.globalPermissions,
    utmSource
  );

  (window as any).info = info;

  environment.stripePublicKey = info.stripePublicKey;

  if (environment.production) {
    enableProdMode();
  }

  await bootstrapApplication(GfAppComponent, {
    providers: [
      { provide: LOCALE_ID, useValue: locale },
      authInterceptorProviders,
      httpResponseInterceptorProviders,
      LanguageService,
      provideHttpClient(withInterceptorsFromDi()),
      provideIonicAngular(),
      provideMarkdown(),
      provideNgxSkeletonLoader(),
      {
        provide: DateAdapter,
        useClass: CustomDateAdapter,
        deps: [LanguageService, MAT_DATE_LOCALE, Platform]
      },
      { provide: MAT_DATE_FORMATS, useValue: DateFormats },
      {
        provide: STRIPE_PUBLISHABLE_KEY,
        useFactory: () => environment.stripePublicKey
      },
      importProvidersFrom(
        AppRoutingModule,
        BrowserAnimationsModule,
        GfNotificationModule,
        MatAutocompleteModule,
        MatChipsModule,
        MatNativeDateModule,
        MatSnackBarModule,
        MatTooltipModule,
        NgxStripeModule.forRoot(environment.stripePublicKey),
        ServiceWorkerModule.register('ngsw-worker.js', {
          enabled: environment.production,
          registrationStrategy: 'registerImmediately'
        })
      )
    ]
  });
})();
