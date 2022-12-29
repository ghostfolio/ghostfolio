import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { OrderWithAccount } from '@ghostfolio/common/types';
import { Injectable } from '@nestjs/common';
import { SymbolProfile } from '@prisma/client';
import Big from 'big.js';
import { endOfToday, isAfter, isSameDay, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ImportService {
  public constructor(
    private readonly accountService: AccountService,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly orderService: OrderService
  ) {}

  public async import({
    activitiesDto,
    isDryRun = false,
    maxActivitiesToImport,
    userCurrency,
    userId
  }: {
    activitiesDto: Partial<CreateOrderDto>[];
    isDryRun?: boolean;
    maxActivitiesToImport: number;
    userCurrency: string;
    userId: string;
  }): Promise<Activity[]> {
    for (const activity of activitiesDto) {
      if (!activity.dataSource) {
        if (activity.type === 'ITEM') {
          activity.dataSource = 'MANUAL';
        } else {
          activity.dataSource = this.dataProviderService.getPrimaryDataSource();
        }
      }
    }

    const assetProfiles = await this.validateActivities({
      activitiesDto,
      maxActivitiesToImport,
      userId
    });

    const accountIds = (await this.accountService.getAccounts(userId)).map(
      (account) => {
        return account.id;
      }
    );

    const activities: Activity[] = [];

    for (const {
      accountId,
      comment,
      currency,
      dataSource,
      date: dateString,
      fee,
      quantity,
      symbol,
      type,
      unitPrice
    } of activitiesDto) {
      const date = parseISO(<string>(<unknown>dateString));
      const validatedAccountId = accountIds.includes(accountId)
        ? accountId
        : undefined;

      let order: OrderWithAccount;

      if (isDryRun) {
        order = {
          comment,
          date,
          fee,
          quantity,
          type,
          unitPrice,
          userId,
          accountId: validatedAccountId,
          accountUserId: undefined,
          createdAt: new Date(),
          id: uuidv4(),
          isDraft: isAfter(date, endOfToday()),
          SymbolProfile: {
            currency,
            dataSource,
            symbol,
            assetClass: null,
            assetSubClass: null,
            comment: null,
            countries: null,
            createdAt: undefined,
            id: undefined,
            name: null,
            scraperConfiguration: null,
            sectors: null,
            symbolMapping: null,
            updatedAt: undefined,
            url: null,
            ...assetProfiles[symbol]
          },
          symbolProfileId: undefined,
          updatedAt: new Date()
        };
      } else {
        order = await this.orderService.createOrder({
          comment,
          date,
          fee,
          quantity,
          type,
          unitPrice,
          userId,
          accountId: validatedAccountId,
          SymbolProfile: {
            connectOrCreate: {
              create: {
                currency,
                dataSource,
                symbol
              },
              where: {
                dataSource_symbol: {
                  dataSource,
                  symbol
                }
              }
            }
          },
          User: { connect: { id: userId } }
        });
      }

      const value = new Big(quantity).mul(unitPrice).toNumber();

      activities.push({
        ...order,
        value,
        feeInBaseCurrency: this.exchangeRateDataService.toCurrency(
          fee,
          currency,
          userCurrency
        ),
        valueInBaseCurrency: this.exchangeRateDataService.toCurrency(
          value,
          currency,
          userCurrency
        )
      });
    }

    return activities;
  }

  private async validateActivities({
    activitiesDto,
    maxActivitiesToImport,
    userId
  }: {
    activitiesDto: Partial<CreateOrderDto>[];
    maxActivitiesToImport: number;
    userId: string;
  }) {
    if (activitiesDto?.length > maxActivitiesToImport) {
      throw new Error(`Too many activities (${maxActivitiesToImport} at most)`);
    }

    const assetProfiles: {
      [symbol: string]: Partial<SymbolProfile>;
    } = {};
    const existingActivities = await this.orderService.orders({
      include: { SymbolProfile: true },
      orderBy: { date: 'desc' },
      where: { userId }
    });

    for (const [
      index,
      { currency, dataSource, date, fee, quantity, symbol, type, unitPrice }
    ] of activitiesDto.entries()) {
      const duplicateActivity = existingActivities.find((activity) => {
        return (
          activity.SymbolProfile.currency === currency &&
          activity.SymbolProfile.dataSource === dataSource &&
          isSameDay(activity.date, parseISO(<string>(<unknown>date))) &&
          activity.fee === fee &&
          activity.quantity === quantity &&
          activity.SymbolProfile.symbol === symbol &&
          activity.type === type &&
          activity.unitPrice === unitPrice
        );
      });

      if (duplicateActivity) {
        throw new Error(`activities.${index} is a duplicate activity`);
      }

      if (dataSource !== 'MANUAL') {
        const assetProfile = (
          await this.dataProviderService.getAssetProfiles([
            { dataSource, symbol }
          ])
        )?.[symbol];

        if (assetProfile === undefined) {
          throw new Error(
            `activities.${index}.symbol ("${symbol}") is not valid for the specified data source ("${dataSource}")`
          );
        }

        if (assetProfile.currency !== currency) {
          throw new Error(
            `activities.${index}.currency ("${currency}") does not match with "${assetProfile.currency}"`
          );
        }

        assetProfiles[symbol] = assetProfile;
      }
    }

    return assetProfiles;
  }
}
