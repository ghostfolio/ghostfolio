import { UserService } from '@ghostfolio/api/app/user/user.service';
import { HAS_PERMISSION_KEY } from '@ghostfolio/api/decorators/has-permission.decorator';
import { getRequest } from '@ghostfolio/api/helper/execution-context.helper';
import { hasPermission } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

/**
 * Denies a request whose access does not carry the permission required by the
 * route. The permission belongs to the user who granted the access and not to
 * the grantee, hence the user is read from the impersonation context and not
 * from the authenticated user, which such a request never has.
 *
 * The user is kept in the impersonation context, hence a handler which needs
 * the user reads it there and does no second query.
 *
 * It has to be applied after the AccessGuard, which resolves the context,
 * hence the RequiresScopeOfAccess decorator applies both.
 */
@Injectable()
export class AccessPermissionGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService
  ) {}

  public async canActivate(context: ExecutionContext) {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      HAS_PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermission) {
      return true;
    }

    const { impersonation } = getRequest<RequestWithUser>(context) ?? {};

    const user = impersonation?.userId
      ? await this.userService.user({ id: impersonation.userId })
      : undefined;

    if (!hasPermission(user?.permissions, requiredPermission)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    impersonation.user = user;

    return true;
  }
}
