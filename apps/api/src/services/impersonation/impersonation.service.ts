import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

@Injectable()
export class ImpersonationService {
  public constructor(
    private readonly prismaService: PrismaService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  public async validateImpersonationId(aId?: string) {
    if (!aId) {
      return null;
    }

    if (this.request.user) {
      const accessObject = await this.prismaService.access.findFirst({
        where: {
          granteeUserId: this.request.user.id,
          id: aId
        }
      });

      if (accessObject?.userId) {
        return accessObject.userId;
      } else if (
        hasPermission(
          this.request.user.permissions,
          permissions.impersonateAllUsers
        )
      ) {
        // The identifier is a user id in this case, hence verify its existence
        const user = await this.prismaService.user.findUnique({
          select: { id: true },
          where: { id: aId }
        });

        return user?.id ?? null;
      }
    } else {
      // Public access
      const accessObject = await this.prismaService.access.findFirst({
        where: {
          granteeUserId: null,
          user: { id: aId }
        }
      });

      if (accessObject?.userId) {
        return accessObject.userId;
      }
    }

    return null;
  }
}
