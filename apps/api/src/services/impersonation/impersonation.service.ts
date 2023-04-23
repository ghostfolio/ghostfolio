import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ImpersonationService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async validateImpersonationId(aId = '', aUserId: string) {
    const accessObject = await this.prismaService.access.findFirst({
      where: { GranteeUser: { id: aUserId }, id: aId }
    });

    return accessObject?.userId;
  }
}
