import { Platform } from '@angular/cdk/platform';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
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

import { CustomDateAdapter } from './adapter/custom-date-adapter';
import { DateFormats } from './adapter/date-formats';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GfHeaderModule } from './components/header/header.module';
import { authInterceptorProviders } from './core/auth.interceptor';
import { httpResponseInterceptorProviders } from './core/http-response.interceptor';
import { LanguageManager } from './core/language-manager.service';

@NgModule({
  declarations: [AppComponent],
  imports: [
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    GfHeaderModule,
    HttpClientModule,
    MarkdownModule.forRoot(),
    MatButtonModule,
    MaterialCssVarsModule.forRoot({
      darkThemeClass: 'is-dark-theme',
      isAutoContrast: true,
      lightThemeClass: 'is-light-theme'
    }),
    MatNativeDateModule,
    MatSnackBarModule,
    NgxSkeletonLoaderModule
  ],
  providers: [
    authInterceptorProviders,
    httpResponseInterceptorProviders,
    LanguageManager,
    {
      provide: DateAdapter,
      useClass: CustomDateAdapter,
      deps: [LanguageManager, MAT_DATE_LOCALE, Platform]
    },
    { provide: MAT_DATE_FORMATS, useValue: DateFormats }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
