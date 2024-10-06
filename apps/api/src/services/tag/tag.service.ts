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
      where: {
        OR: [
          {
            orders: {
              some: {
                userId
              }
            }
          },
          {
            userId: null
          }
        ]
      },
      include: {
        orders: {
          where: {
            userId
          },
          select: {
            id: true
          }
        }
      }
    });

    return tags.map((tag) => ({
      ...tag,
      isUsed: tag.orders.length > 0,
      orders: undefined
    }));
  }
}
