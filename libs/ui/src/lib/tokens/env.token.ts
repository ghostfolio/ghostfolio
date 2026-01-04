import { InjectionToken } from '@angular/core';

export interface GfEnvironment {
  lastPublish: string | null;
  production: boolean;
  stripePublicKey: string;
}

export const GF_ENVIRONMENT = new InjectionToken<GfEnvironment>(
  'GF_ENVIRONMENT'
);
