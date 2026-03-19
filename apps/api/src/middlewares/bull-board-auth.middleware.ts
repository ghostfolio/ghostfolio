import { BULL_BOARD_COOKIE_NAME } from '@ghostfolio/common/config';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import passport from 'passport';

@Injectable()
export class BullBoardAuthMiddleware implements NestMiddleware {
  public use(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.[BULL_BOARD_COOKIE_NAME];

    if (token) {
      req.headers.authorization = `Bearer ${token}`;
    }

    passport.authenticate('jwt', { session: false }, (error, user) => {
      if (
        error ||
        !hasPermission(user?.permissions, permissions.accessAdminControl)
      ) {
        next(new ForbiddenException());
      } else {
        next();
      }
    })(req, res, next);
  }
}
