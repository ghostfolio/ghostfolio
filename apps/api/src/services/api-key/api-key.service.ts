import { getRandomString } from '@ghostfolio/api/helper/string.helper';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { ApiKeyResponse } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';

const crypto = require('crypto');

@Injectable()
export class ApiKeyService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async create({ userId }: { userId: string }): Promise<ApiKeyResponse> {
    let apiKey = getRandomString(32);
    apiKey = apiKey
      .split('')
      .reduce((acc, char, index) => {
        const chunkIndex = Math.floor(index / 4);
        acc[chunkIndex] = (acc[chunkIndex] || '') + char;

        return acc;
      }, [])
      .join('-');

    const iterations = 100000;
    const keyLength = 64;

    const hashedKey = crypto
      .pbkdf2Sync(apiKey, '', iterations, keyLength, 'sha256')
      .toString('hex');

    await this.prismaService.apiKey.deleteMany({ where: { userId } });

    await this.prismaService.apiKey.create({
      data: {
        hashedKey,
        userId
      }
    });

    return { apiKey };
  }
}
