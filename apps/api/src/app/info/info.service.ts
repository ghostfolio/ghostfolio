import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Currency } from '@prisma/client';

import { PrismaService } from '../../services/prisma.service';
import { InfoItem } from './interfaces/info-item.interface';

@Injectable()
export class InfoService {
  private static DEMO_USER_ID = '9b112b4d-3b7d-4bad-9bdd-3b0f7b4dac2f';

  public constructor(
    private jwtService: JwtService,
    private prisma: PrismaService
  ) {}

  public async get(): Promise<InfoItem> {
    const platforms = await this.prisma.platform.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    });

    return {
      platforms,
      currencies: Object.values(Currency),
      demoAuthToken: this.getDemoAuthToken(),
      lastDataGathering: await this.getLastDataGathering()
    };
  }

  private getDemoAuthToken() {
    return this.jwtService.sign({
      id: InfoService.DEMO_USER_ID
    });
  }

  private async getLastDataGathering() {
    const lastDataGathering = await this.prisma.property.findUnique({
      where: { key: 'LAST_DATA_GATHERING' }
    });

    return lastDataGathering?.value ? new Date(lastDataGathering.value) : null;
  }
}
