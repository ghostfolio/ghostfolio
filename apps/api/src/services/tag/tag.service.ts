import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Injectable } from '@nestjs/common';
import { Prisma, Tag } from '@prisma/client';

@Injectable()
export class TagService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async createTag(data: Prisma.TagCreateInput) {
    return this.prismaService.tag.create({
      data
    });
  }

  public async deleteTag(where: Prisma.TagWhereUniqueInput): Promise<Tag> {
    return this.prismaService.tag.delete({ where });
  }

  public async getTag(
    tagWhereUniqueInput: Prisma.TagWhereUniqueInput
  ): Promise<Tag> {
    return this.prismaService.tag.findUnique({
      where: tagWhereUniqueInput
    });
  }

  public async getTags({
    cursor,
    orderBy,
    skip,
    take,
    where
  }: {
    cursor?: Prisma.TagWhereUniqueInput;
    orderBy?: Prisma.TagOrderByWithRelationInput;
    skip?: number;
    take?: number;
    where?: Prisma.TagWhereInput;
  } = {}) {
    return this.prismaService.tag.findMany({
      cursor,
      orderBy,
      skip,
      take,
      where
    });
  }

  public async getTagsForUser(userId: string) {
    const tags = await this.prismaService.tag.findMany({
      include: {
        _count: {
          select: {
            orders: {
              where: {
                userId
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
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

    return tags.map(({ _count, id, name, userId }) => ({
      id,
      name,
      userId,
      isUsed: _count.orders > 0
    }));
  }

  public async getTagsWithActivityCount() {
    const tagsWithOrderCount = await this.prismaService.tag.findMany({
      include: {
        _count: {
          select: { orders: true }
        }
      }
    });

    return tagsWithOrderCount.map(({ _count, id, name, userId }) => {
      return {
        id,
        name,
        userId,
        activityCount: _count.orders
      };
    });
  }

  public async updateTag({
    data,
    where
  }: {
    data: Prisma.TagUpdateInput;
    where: Prisma.TagWhereUniqueInput;
  }): Promise<Tag> {
    return this.prismaService.tag.update({
      data,
      where
    });
  }
}
