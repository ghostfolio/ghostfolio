import { SetMetadata } from '@nestjs/common';

export const HAS_PERMISSION_KEY = 'has_permission';

export function HasPermission(permission: string) {
  return SetMetadata(HAS_PERMISSION_KEY, permission);
}
