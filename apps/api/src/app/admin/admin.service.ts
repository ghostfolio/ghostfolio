import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { AdminData } from '@ghostfolio/common/interfaces';
import { Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';

@Injectable()
export class AdminService {
  public constructor(
    private readonly dataGatheringService: DataGatheringService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly prismaService: PrismaService
  ) {}

  public async get(): Promise<AdminData> {
    return {
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
      transactionCount: await this.prismaService.order.count(),
      userCount: await this.prismaService.user.count(),
      users: await this.getUsersWithAnalytics()
    };
  }

  private async getLastDataGathering() {
    const lastDataGathering =
      await this.dataGatheringService.getLastDataGathering();

    if (lastDataGathering) {
      return lastDataGathering;
    }

    const dataGatheringInProgress =
      await this.dataGatheringService.getIsInProgress();

    if (dataGatheringInProgress) {
      return 'IN_PROGRESS';
    }

    return null;
  }

  private async getUsersWithAnalytics() {
    return await this.prismaService.user.findMany({
      orderBy: {
        Analytics: {
          updatedAt: 'desc'
        }
      },
      select: {
        _count: {
          select: { Account: true, Order: true }
        },
        alias: true,
        Analytics: {
          select: {
            activityCount: true,
            updatedAt: true
          }
        },
        createdAt: true,
        id: true
      },
      take: 30,
      where: {
        NOT: {
          Analytics: null
        }
      }
    });
  }
}
