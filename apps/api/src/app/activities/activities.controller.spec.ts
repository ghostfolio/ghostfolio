import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { CreateOrderDto, UpdateOrderDto } from '@ghostfolio/common/dtos';
import { parseDate } from '@ghostfolio/common/helper';
import type { ImpersonationContext } from '@ghostfolio/common/types';

import { DataSource, Order, Type } from '@prisma/client';

import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';

describe.each([true, false])(
  'ActivitiesController cash balance tracking responses (enabled: %s)',
  (updateAccountBalance) => {
    const userId = 'user-id';
    const context = { userId } as ImpersonationContext;

    let controller: ActivitiesController;
    let activity: Order & {
      SymbolProfile: {
        currency: string;
        dataSource: DataSource;
        scraperConfiguration: null;
        symbol: string;
      };
    };
    let data: CreateOrderDto;

    beforeEach(() => {
      const date = parseDate('2024-01-01');

      activity = {
        accountBalanceChange: -271.8,
        accountId: 'account-id',
        accountUserId: userId,
        comment: null,
        createdAt: date,
        currency: 'USD',
        date,
        fee: 2,
        id: 'activity-id',
        quantity: 3,
        symbolProfileId: 'asset-profile-id',
        type: Type.BUY,
        unitPrice: 100,
        updateAccountBalance,
        updatedAt: date,
        userId,
        SymbolProfile: {
          currency: 'USD',
          dataSource: DataSource.MANUAL,
          scraperConfiguration: null,
          symbol: 'Asset'
        }
      };
      data = {
        accountId: activity.accountId,
        currency: activity.currency,
        dataSource: activity.SymbolProfile.dataSource,
        date: date.toISOString(),
        fee: activity.fee,
        quantity: activity.quantity,
        symbol: activity.SymbolProfile.symbol,
        type: activity.type,
        unitPrice: activity.unitPrice,
        updateAccountBalance
      };

      controller = new ActivitiesController(
        {
          createActivity: jest.fn().mockResolvedValue(activity),
          deleteActivity: jest.fn().mockResolvedValue(activity),
          order: jest.fn().mockResolvedValue(activity),
          updateActivity: jest.fn().mockResolvedValue(activity)
        } as unknown as ActivitiesService,
        null,
        {
          validateActivities: jest.fn().mockResolvedValue(undefined)
        } as unknown as DataProviderService,
        null,
        {
          getSymbolProfiles: jest
            .fn()
            .mockResolvedValue([activity.SymbolProfile])
        } as unknown as SymbolProfileService
      );
    });

    it.each(['create', 'edit', 'delete'] as const)(
      'removes the internal cash amount from the %s response while preserving the preference',
      async (operation) => {
        const response =
          operation === 'create'
            ? await controller.createActivity(data, context)
            : operation === 'edit'
              ? await controller.updateActivity(
                  { ...data, id: activity.id } as UpdateOrderDto,
                  context,
                  activity.id
                )
              : await controller.deleteActivity(context, activity.id);

        expect(response).not.toHaveProperty('accountBalanceChange');
        expect(response).toMatchObject({
          id: activity.id,
          updateAccountBalance
        });
        expect(activity.accountBalanceChange).toBe(-271.8);
      }
    );
  }
);
