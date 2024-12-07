import { getRandomString } from '@ghostfolio/api/helper/string.helper';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { ApiKeyResponse } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';
import { pbkdf2Sync } from 'crypto';

@Injectable()
export class ApiKeyService {
  private readonly algorithm = 'sha256';
  private readonly iterations = 100000;
  private readonly keyLength = 64;

  public constructor(private readonly prismaService: PrismaService) {}

  public async create({ userId }: { userId: string }): Promise<ApiKeyResponse> {
    const apiKey = this.generateApiKey();
    const hashedKey = this.hashApiKey(apiKey);

    await this.prismaService.apiKey.deleteMany({ where: { userId } });

    await this.prismaService.apiKey.create({
      data: {
        hashedKey,
        userId
      }
    });

    return { apiKey };
  }

  public async getUserByApiKey(apiKey: string) {
    const hashedKey = this.hashApiKey(apiKey);

    const { user } = await this.prismaService.apiKey.findFirst({
      include: { user: true },
      where: { hashedKey }
    });

    return user;
  }

  public hashApiKey(apiKey: string): string {
    return pbkdf2Sync(
      apiKey,
      '',
      this.iterations,
      this.keyLength,
      this.algorithm
    ).toString('hex');
  }

  private generateApiKey(): string {
    return getRandomString(32)
      .split('')
      .reduce((acc, char, index) => {
        const chunkIndex = Math.floor(index / 4);
        acc[chunkIndex] = (acc[chunkIndex] || '') + char;
        return acc;
      }, [])
      .join('-');
  }
}
