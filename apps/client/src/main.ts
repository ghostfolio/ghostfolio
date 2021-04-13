import { enableProdMode } from '@angular/core';
import { LOCALE_ID } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule, {
    providers: [{ provide: LOCALE_ID, useValue: 'de-CH' }]
  })
  .catch((err) => console.error(err));
