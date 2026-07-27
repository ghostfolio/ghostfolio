import {
  getPermissions,
  hasPermission,
  permissions
} from '@ghostfolio/common/permissions';

import { Role } from '@prisma/client';

describe('Permissions', () => {
  it.each([Role.ADMIN, Role.USER])(
    'grants AI chat access to %s users',
    (role) => {
      expect(
        hasPermission(getPermissions(role), permissions.accessAiChat)
      ).toBe(true);
    }
  );

  it('does not grant AI chat access to demo users', () => {
    expect(
      hasPermission(getPermissions(Role.DEMO), permissions.accessAiChat)
    ).toBe(false);
  });
});
