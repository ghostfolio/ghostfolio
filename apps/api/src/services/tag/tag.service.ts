import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { HttpException, Injectable } from '@nestjs/common';
import { Prisma, Tag } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

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
  ): Promise<Tag | null> {
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
            accounts: {
              where: {
                userId
              }
            },
            activities: {
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

    return tags
      .map(({ _count, id, name, userId }) => ({
        id,
        name,
        userId,
        isUsed: _count.accounts > 0 || _count.activities > 0
      }))
      .sort((a, b) => {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
  }

  public async getTagsWithAccountAndActivityCount() {
    const tagsWithAccountAndOrderCount = await this.prismaService.tag.findMany({
      include: {
        _count: {
          select: { accounts: true, activities: true }
        }
      }
    });

    return tagsWithAccountAndOrderCount.map(({ _count, id, name, userId }) => {
      return {
        id,
        name,
        userId,
        accountCount: _count.accounts,
        activityCount: _count.activities
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

  public async validateTagIds({
    tagIds,
    userId
  }: {
    tagIds: string[];
    userId: string;
  }) {
    if (!tagIds?.length) {
      return;
    }

    if (!userId) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }

    const uniqueTagIds = Array.from(new Set(tagIds));

    const tagsCount = await this.prismaService.tag.count({
      where: {
        id: { in: uniqueTagIds },
        OR: [{ userId }, { userId: null }]
      }
    });

    if (tagsCount !== uniqueTagIds.length) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }
  }
}
