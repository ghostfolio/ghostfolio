import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PlatformService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async get() {
    return this.prismaService.platform.findMany();
  }
}
