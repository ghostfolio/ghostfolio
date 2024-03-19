import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Injectable } from '@nestjs/common';

@Injectable()
export class TagService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async get() {
    return this.prismaService.tag.findMany({
      orderBy: {
        name: 'asc'
      }
    });
  }

  public async getByUser(userId: string) {
    return this.prismaService.tag.findMany({
      orderBy: {
        name: 'asc'
      },
      where: {
        orders: {
          some: {
            userId
          }
        }
      }
    });
  }
}
