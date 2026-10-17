import { InjectionToken } from '@angular/core';

import type { GfEnvironment } from './environment.interface';

export const GF_ENVIRONMENT = new InjectionToken<GfEnvironment>(
  'GF_ENVIRONMENT'
);
