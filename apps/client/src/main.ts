import { enableProdMode } from '@angular/core';
import { LOCALE_ID } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { locale } from '@ghostfolio/common/config';
import { InfoItem } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

(async () => {
  const response = await fetch('/api/v1/info');
  const info: InfoItem = await response.json();

  if (window.localStorage.getItem('utm_source') === 'trusted-web-activity') {
    info.globalPermissions = info.globalPermissions.filter(
      (permission) => permission !== permissions.enableSubscription
    );
  }

  (window as any).info = info;

  environment.stripePublicKey = info.stripePublicKey;

  if (environment.production) {
    enableProdMode();
  }

  platformBrowserDynamic()
    .bootstrapModule(AppModule, {
      providers: [{ provide: LOCALE_ID, useValue: locale }]
    })
    .catch((error) => console.error(error));
})();
