import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Injectable } from '@nestjs/common';

@Injectable()
export class TagService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async getPublic() {
    return this.prismaService.tag.findMany({
      orderBy: {
        name: 'asc'
      },
      where: {
        userId: null
      }
    });
  }

  public async getTagsForUser(userId: string) {
    const tags = await this.prismaService.tag.findMany({
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: {
            orders: true
          }
        }
      },
      where: {
        OR: [
          {
            userId
          },
          {
            userId: null
          }
        ]
      }
    });

    return tags.map((tag) => ({
      ...tag,
      isUsed: tag._count.orders > 0,
      _count: undefined
    }));
  }
}
