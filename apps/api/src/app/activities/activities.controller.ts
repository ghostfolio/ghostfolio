import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { Impersonation } from '@ghostfolio/api/decorators/impersonation.decorator';
import { RequiresScope } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { isActivityInFuture } from '@ghostfolio/api/helper/activity.helper';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.interceptor';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import { DATA_GATHERING_QUEUE_PRIORITY_HIGH } from '@ghostfolio/common/config';
import { CreateOrderDto, UpdateOrderDto } from '@ghostfolio/common/dtos';
import { SubscriptionType } from '@ghostfolio/common/enums';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import {
  ActivitiesResponse,
  ActivityResponse
} from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { scopes } from '@ghostfolio/common/scopes';
import type { ImpersonationContext } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  Query,
  UseInterceptors
} from '@nestjs/common';
import { Order, SymbolProfile } from '@prisma/client';
import { parseISO } from 'date-fns';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { ActivitiesFilterDto } from './activities-filter.dto';
import { ActivitiesService } from './activities.service';
import { GetActivitiesDto } from './get-activities.dto';

@Controller('activities')
export class ActivitiesController {
  public constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly apiService: ApiService,
    private readonly dataProviderService: DataProviderService,
    private readonly dataGatheringService: DataGatheringService
  ) {}

  @Delete()
  @HasPermission(permissions.deleteActivity)
  @RequiresScope(scopes.activityDelete)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async deleteActivities(
    @Impersonation() { userId }: ImpersonationContext,
    @Query()
    {
      accounts,
      activityTypes,
      assetClasses,
      dataSource,
      range,
      symbol,
      tags
    }: ActivitiesFilterDto
  ): Promise<number> {
    let endDate: Date;
    let startDate: Date;

    if (range) {
      ({ endDate, startDate } = getIntervalFromDateRange({
        dateRange: range
      }));
    }

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts: accounts,
      filterByAssetClasses: assetClasses,
      filterByDataSource: dataSource,
      filterBySymbol: symbol,
      filterByTags: tags
    });

    return this.activitiesService.deleteActivities({
      endDate,
      filters,
      startDate,
      userId,
      types: activityTypes
    });
  }

  @Delete(':id')
  @HasPermission(permissions.deleteActivity)
  @RequiresScope(scopes.activityDelete)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  public async deleteActivity(
    @Impersonation() { userId }: ImpersonationContext,
    @Param('id') id: string
  ): Promise<Order> {
    const activity = await this.activitiesService.order({
      id,
      userId
    });

    if (!activity) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return this.activitiesService.deleteActivity({
      id
    });
  }

  @Get()
  @RequiresScope(scopes.activityRead)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getAllActivities(
    @Impersonation() { userId, userSettings }: ImpersonationContext,
    @Query()
    {
      accounts,
      activityTypes,
      assetClasses,
      dataSource,
      range,
      skip,
      sortColumn,
      sortDirection,
      symbol,
      tags,
      take
    }: GetActivitiesDto
  ): Promise<ActivitiesResponse> {
    let endDate: Date;
    let startDate: Date;

    if (range) {
      ({ endDate, startDate } = getIntervalFromDateRange({
        dateRange: range
      }));
    }

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts: accounts,
      filterByAssetClasses: assetClasses,
      filterByDataSource: dataSource,
      filterBySymbol: symbol,
      filterByTags: tags
    });

    const { activities, count } = await this.activitiesService.getActivities({
      endDate,
      filters,
      skip,
      sortColumn,
      sortDirection,
      startDate,
      take,
      userId,
      includeDrafts: true,
      types: activityTypes,
      userCurrency: userSettings.baseCurrency,
      withExcludedAccountsAndActivities: true
    });

    return { activities, count };
  }

  @Get(':id')
  @RequiresScope(scopes.activityRead)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getActivityById(
    @Impersonation() { userId, userSettings }: ImpersonationContext,
    @Param('id') id: string
  ): Promise<ActivityResponse> {
    const { activities } = await this.activitiesService.getActivities({
      userId,
      includeDrafts: true,
      userCurrency: userSettings.baseCurrency,
      withExcludedAccountsAndActivities: true
    });

    const activity = activities.find((activity) => {
      return activity.id === id;
    });

    if (!activity) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return activity;
  }

  @HasPermission(permissions.createActivity)
  @Post()
  @RequiresScope(scopes.activityCreate)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async createActivity(
    @Body() data: CreateOrderDto,
    @Impersonation()
    {
      authenticatedUserSubscription,
      userId,
      userSubscription
    }: ImpersonationContext
  ): Promise<Order> {
    // Evaluate the more restrictive subscription of the authenticated user
    // and the owner of the activity
    const subscription =
      userSubscription?.type === SubscriptionType.Basic
        ? userSubscription
        : authenticatedUserSubscription;

    let assetProfiles: {
      [assetProfileIdentifier: string]: Partial<SymbolProfile>;
    } = {};

    try {
      assetProfiles = await this.dataProviderService.validateActivities({
        subscription,
        activitiesDto: [
          {
            currency: data.currency,
            dataSource: data.dataSource,
            symbol: data.symbol,
            type: data.type
          }
        ],
        maxActivitiesToImport: 1
      });
    } catch (error) {
      throw new HttpException(
        {
          error: getReasonPhrase(StatusCodes.BAD_REQUEST),
          message: [error.message]
        },
        StatusCodes.BAD_REQUEST
      );
    }

    const currency = data.currency;
    const customCurrency = data.customCurrency;
    const dataSource = data.dataSource;

    const symbol =
      assetProfiles[
        getAssetProfileIdentifier({ dataSource, symbol: data.symbol })
      ]?.symbol ?? data.symbol;

    if (customCurrency) {
      data.currency = customCurrency;

      delete data.customCurrency;
    }

    delete data.dataSource;

    const activity = await this.activitiesService.createActivity({
      ...data,
      userId,
      date: parseISO(data.date),
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
      tags: data.tags?.map((id) => {
        return { id };
      }),
      user: { connect: { id: userId } }
    });

    if (dataSource && !isActivityInFuture({ date: activity.date })) {
      // Gather symbol data in the background, if data source is set
      // (not MANUAL) and the date is not in the future
      this.dataGatheringService.gatherSymbols({
        dataGatheringItems: [
          {
            dataSource,
            symbol,
            date: activity.date
          }
        ],
        priority: DATA_GATHERING_QUEUE_PRIORITY_HIGH
      });
    }

    return activity;
  }

  @HasPermission(permissions.updateActivity)
  @Put(':id')
  @RequiresScope(scopes.activityUpdate)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async updateActivity(
    @Body() data: UpdateOrderDto,
    @Impersonation() { userId }: ImpersonationContext,
    @Param('id') id: string
  ) {
    const originalActivity = await this.activitiesService.order({
      id,
      userId
    });

    if (!originalActivity) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    const date = parseISO(data.date);

    const accountId = data.accountId;
    const customCurrency = data.customCurrency;
    const dataSource = data.dataSource;

    delete data.accountId;

    if (customCurrency) {
      data.currency = customCurrency;

      delete data.customCurrency;
    }

    delete data.dataSource;

    return this.activitiesService.updateActivity({
      userId,
      data: {
        ...data,
        date,
        account: accountId
          ? {
              connect: {
                id_userId: { userId, id: accountId }
              }
            }
          : { disconnect: true },
        SymbolProfile: {
          connect: {
            dataSource_symbol: {
              dataSource,
              symbol: data.symbol
            }
          },
          update: {
            assetClass: data.assetClass,
            assetSubClass: data.assetSubClass,
            name: data.symbol
          }
        },
        tags: data.tags?.map((id) => {
          return { id };
        }),
        user: { connect: { id: userId } }
      },
      originalDate: originalActivity.date,
      where: {
        id
      }
    });
  }
}
