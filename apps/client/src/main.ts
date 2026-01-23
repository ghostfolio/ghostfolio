import { InfoResponse } from '@ghostfolio/common/interfaces';
import { filterGlobalPermissions } from '@ghostfolio/common/permissions';
import { GF_ENVIRONMENT } from '@ghostfolio/ui/environment';
import { GfNotificationModule } from '@ghostfolio/ui/notifications';

import { Platform } from '@angular/cdk/platform';
import {
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';
import {
  enableProdMode,
  importProvidersFrom,
  provideZoneChangeDetection
} from '@angular/core';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatNativeDateModule
} from '@angular/material/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { RouterModule, TitleStrategy } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideMarkdown } from 'ngx-markdown';
import { provideNgxSkeletonLoader } from 'ngx-skeleton-loader';

import { CustomDateAdapter } from './app/adapter/custom-date-adapter';
import { DateFormats } from './app/adapter/date-formats';
import { GfAppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptorProviders } from './app/core/auth.interceptor';
import { httpResponseInterceptorProviders } from './app/core/http-response.interceptor';
import { LanguageService } from './app/core/language.service';
import { ModulePreloadService } from './app/core/module-preload.service';
import { PageTitleStrategy } from './app/services/page-title.strategy';
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

  if (environment.production) {
    enableProdMode();
  }

  await bootstrapApplication(GfAppComponent, {
    providers: [
      authInterceptorProviders,
      httpResponseInterceptorProviders,
      importProvidersFrom(
        GfNotificationModule,
        MatNativeDateModule,
        MatSnackBarModule,
        MatTooltipModule,
        RouterModule.forRoot(routes, {
          anchorScrolling: 'enabled',
          preloadingStrategy: ModulePreloadService,
          scrollPositionRestoration: 'top'
        }),
        ServiceWorkerModule.register('ngsw-worker.js', {
          enabled: environment.production,
          registrationStrategy: 'registerImmediately'
        })
      ),
      LanguageService,
      ModulePreloadService,
      provideAnimations(),
      provideHttpClient(withInterceptorsFromDi()),
      provideIonicAngular(),
      provideMarkdown(),
      provideNgxSkeletonLoader(),
      provideZoneChangeDetection(),
      {
        deps: [LanguageService, MAT_DATE_LOCALE, Platform],
        provide: DateAdapter,
        useClass: CustomDateAdapter
      },
      {
        provide: GF_ENVIRONMENT,
        useValue: environment
      },
      {
        provide: MAT_DATE_FORMATS,
        useValue: DateFormats
      },
      {
        provide: TitleStrategy,
        useClass: PageTitleStrategy
      }
    ]
  });
})();
