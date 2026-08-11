import { SetMetadata } from '@nestjs/common';

export const ALLOW_DURING_IMPERSONATION_KEY = 'allow_during_impersonation';

// Marks a controller or a route which modifies data of the authenticated user
// instead of data of the impersonated user, hence it stays available while an
// impersonation is active
export function AllowDuringImpersonation() {
  return SetMetadata(ALLOW_DURING_IMPERSONATION_KEY, true);
}
