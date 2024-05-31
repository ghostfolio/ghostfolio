import { UserWithSettings } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';

@Injectable()
export class UserHelperService {
  public constructor() {}

  public hasReadRestrictedAccessPermission({
    impersonationId,
    user
  }: {
    impersonationId: string;
    user: UserWithSettings;
  }) {
    if (!impersonationId) {
      return false;
    }

    const access = user.Access?.find(({ id }) => {
      return id === impersonationId;
    });

    return access?.permissions?.includes('READ_RESTRICTED') ?? true;
  }

  public isRestrictedView(aUser: UserWithSettings) {
    return aUser.Settings.settings.isRestrictedView ?? false;
  }
}
