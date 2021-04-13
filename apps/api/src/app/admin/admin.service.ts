import { Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';

import { ExchangeRateDataService } from '../../services/exchange-rate-data.service';
import { PrismaService } from '../../services/prisma.service';
import { AdminData } from './interfaces/admin-data.interface';

@Injectable()
export class AdminService {
  public constructor(
    private exchangeRateDataService: ExchangeRateDataService,
    private prisma: PrismaService
  ) {}

  public async get(): Promise<AdminData> {
    return {
      analytics: await this.getUserAnalytics(),
      exchangeRates: [
        {
          label1: Currency.EUR,
          label2: Currency.CHF,
          value: await this.exchangeRateDataService.toCurrency(
            1,
            Currency.EUR,
            Currency.CHF
          )
        },
        {
          label1: Currency.GBP,
          label2: Currency.CHF,
          value: await this.exchangeRateDataService.toCurrency(
            1,
            Currency.GBP,
            Currency.CHF
          )
        },
        {
          label1: Currency.USD,
          label2: Currency.CHF,
          value: await this.exchangeRateDataService.toCurrency(
            1,
            Currency.USD,
            Currency.CHF
          )
        },
        {
          label1: Currency.USD,
          label2: Currency.EUR,
          value: await this.exchangeRateDataService.toCurrency(
            1,
            Currency.USD,
            Currency.EUR
          )
        },
        {
          label1: Currency.USD,
          label2: Currency.GBP,
          value: await this.exchangeRateDataService.toCurrency(
            1,
            Currency.USD,
            Currency.GBP
          )
        }
      ],
      lastDataGathering: await this.getLastDataGathering(),
      transactionCount: await this.prisma.order.count(),
      userCount: await this.prisma.user.count()
    };
  }

  private async getLastDataGathering() {
    const lastDataGathering = await this.prisma.property.findUnique({
      where: { key: 'LAST_DATA_GATHERING' }
    });

    if (lastDataGathering?.value) {
      return new Date(lastDataGathering.value);
    }

    const dataGatheringInProgress = await this.prisma.property.findUnique({
      where: { key: 'LOCKED_DATA_GATHERING' }
    });

    if (dataGatheringInProgress) {
      return 'IN_PROGRESS';
    }

    return null;
  }

  private async getUserAnalytics() {
    return await this.prisma.analytics.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        activityCount: true,
        updatedAt: true,
        User: {
          select: {
            alias: true,
            createdAt: true,
            id: true
          }
        }
      },
      take: 20
    });
  }
}
