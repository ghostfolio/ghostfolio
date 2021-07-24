import { Platform } from '@angular/cdk/platform';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatNativeDateModule
} from '@angular/material/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialCssVarsModule } from 'angular-material-css-vars';
import { MarkdownModule } from 'ngx-markdown';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { NgxStripeModule, STRIPE_PUBLISHABLE_KEY } from 'ngx-stripe';

import { environment } from '../environments/environment';
import { CustomDateAdapter } from './adapter/custom-date-adapter';
import { DateFormats } from './adapter/date-formats';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GfHeaderModule } from './components/header/header.module';
import { authInterceptorProviders } from './core/auth.interceptor';
import { httpResponseInterceptorProviders } from './core/http-response.interceptor';
import { LanguageService } from './core/language.service';

export function NgxStripeFactory(): string {
  return environment.stripePublicKey;
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    GfHeaderModule,
    HttpClientModule,
    MarkdownModule.forRoot(),
    MaterialCssVarsModule.forRoot({
      darkThemeClass: 'is-dark-theme',
      isAutoContrast: true,
      lightThemeClass: 'is-light-theme'
    }),
    MatNativeDateModule,
    MatSnackBarModule,
    NgxSkeletonLoaderModule,
    NgxStripeModule.forRoot(environment.stripePublicKey)
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
  bootstrap: [AppComponent]
})
export class AppModule {}
