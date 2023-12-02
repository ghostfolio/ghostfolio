import { HAS_PERMISSION_KEY } from '@ghostfolio/api/decorators/has-permission.decorator';
import { hasPermission } from '@ghostfolio/common/permissions';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

@Injectable()
export class HasPermissionGuard implements CanActivate {
  public constructor(private reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<string>(
      HAS_PERMISSION_KEY,
      context.getHandler()
    );

    if (!requiredPermission) {
      return true; // No specific permissions required
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !hasPermission(user.permissions, requiredPermission)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return true;
  }
}
