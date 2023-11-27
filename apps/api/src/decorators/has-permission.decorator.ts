import { SetMetadata } from '@nestjs/common';
export const HAS_PERMISSION_KEY = 'has_permission';
export const HasPermission = (permission: string) => SetMetadata(HAS_PERMISSION_KEY, permission);
