import { BULL_BOARD_COOKIE_NAME } from '@ghostfolio/common/config';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
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
        !user ||
        !hasPermission(user.permissions, permissions.accessAdminControl)
      ) {
        res
          .status(StatusCodes.FORBIDDEN)
          .json({ message: getReasonPhrase(StatusCodes.FORBIDDEN) });

        return;
      }

      next();
    })(req, res, next);
  }
}
