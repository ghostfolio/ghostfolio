import { Injectable } from '@nestjs/common';

import { PrismaService } from './prisma.service';

@Injectable()
export class ImpersonationService {
  public constructor(private prisma: PrismaService) {}

  public async validateImpersonationId(aId = '', aUserId: string) {
    const accessObject = await this.prisma.access.findFirst({
      where: { GranteeUser: { id: aUserId }, id: aId }
    });

    return accessObject?.userId;
  }
}
