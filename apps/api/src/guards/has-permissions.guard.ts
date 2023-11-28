import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { HAS_PERMISSION_KEY } from '@ghostfolio/api/decorators/has-permission.decorator';
import { hasPermission } from '@ghostfolio/common/permissions';

@Injectable()
export class HasPermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<string>(
      HAS_PERMISSION_KEY,
      context.getHandler()
    );

    if (!requiredPermission) {
      return true; // No specific permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !hasPermission(user.permissions, requiredPermission)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return true;
  }
}
