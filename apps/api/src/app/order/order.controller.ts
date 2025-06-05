import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.interceptor';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import {
  DATA_GATHERING_QUEUE_PRIORITY_HIGH,
  HEADER_KEY_IMPERSONATION
} from '@ghostfolio/common/config';
import { permissions } from '@ghostfolio/common/permissions';
import type { DateRange, RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Order as OrderModel, Prisma } from '@prisma/client';
import { parseISO } from 'date-fns';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { CreateOrderDto } from './create-order.dto';
import { Activities, Activity } from './interfaces/activities.interface';
import { OrderService } from './order.service';
import { UpdateOrderDto } from './update-order.dto';

@Controller('order')
export class OrderController {
  public constructor(
    private readonly apiService: ApiService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly impersonationService: ImpersonationService,
    private readonly orderService: OrderService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Delete()
  @HasPermission(permissions.deleteOrder)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async deleteOrders(
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('dataSource') filterByDataSource?: string,
    @Query('symbol') filterBySymbol?: string,
    @Query('tags') filterByTags?: string
  ): Promise<number> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByDataSource,
      filterBySymbol,
      filterByTags
    });

    return this.orderService.deleteOrders({
      filters,
      userId: this.request.user.id
    });
  }

  @Delete(':id')
  @HasPermission(permissions.deleteOrder)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteOrder(@Param('id') id: string): Promise<OrderModel> {
    const order = await this.orderService.order({
      id,
      userId: this.request.user.id
    });

    if (!order) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.orderService.deleteOrder({
      id
    });
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getAllOrders(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('dataSource') filterByDataSource?: string,
    @Query('range') dateRange?: DateRange,
    @Query('skip') skip?: number,
    @Query('sortColumn') sortColumn?: string,
    @Query('sortDirection') sortDirection?: Prisma.SortOrder,
    @Query('symbol') filterBySymbol?: string,
    @Query('tags') filterByTags?: string,
    @Query('take') take?: number
  ): Promise<Activities> {
    let endDate: Date;
    let startDate: Date;

    if (dateRange) {
      ({ endDate, startDate } = getIntervalFromDateRange(dateRange));
    }

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByDataSource,
      filterBySymbol,
      filterByTags
    });

    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(impersonationId);
    const userCurrency = this.request.user.Settings.settings.baseCurrency;

    const { activities, count } = await this.orderService.getOrders({
      endDate,
      filters,
      sortColumn,
      sortDirection,
      startDate,
      userCurrency,
      includeDrafts: true,
      skip: isNaN(skip) ? undefined : skip,
      take: isNaN(take) ? undefined : take,
      userId: impersonationUserId || this.request.user.id,
      withExcludedAccounts: true
    });

    return { activities, count };
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getOrderById(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Param('id') id: string
  ): Promise<Activity> {
    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(impersonationId);
    const userCurrency = this.request.user.Settings.settings.baseCurrency;

    const { activities } = await this.orderService.getOrders({
      userCurrency,
      userId: impersonationUserId || this.request.user.id,
      withExcludedAccounts: true
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

  @HasPermission(permissions.createOrder)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async createOrder(@Body() data: CreateOrderDto): Promise<OrderModel> {
    const currency = data.currency;
    const customCurrency = data.customCurrency;

    if (customCurrency) {
      data.currency = customCurrency;

      delete data.customCurrency;
    }

    const order = await this.orderService.createOrder({
      ...data,
      date: parseISO(data.date),
      SymbolProfile: {
        connectOrCreate: {
          create: {
            currency,
            dataSource: data.dataSource,
            symbol: data.symbol
          },
          where: {
            dataSource_symbol: {
              dataSource: data.dataSource,
              symbol: data.symbol
            }
          }
        }
      },
      User: { connect: { id: this.request.user.id } },
      userId: this.request.user.id
    });

    if (data.dataSource && !order.isDraft) {
      // Gather symbol data in the background, if data source is set
      // (not MANUAL) and not draft
      this.dataGatheringService.gatherSymbols({
        dataGatheringItems: [
          {
            dataSource: data.dataSource,
            date: order.date,
            symbol: data.symbol
          }
        ],
        priority: DATA_GATHERING_QUEUE_PRIORITY_HIGH
      });
    }

    return order;
  }

  @HasPermission(permissions.updateOrder)
  @Put(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async update(@Param('id') id: string, @Body() data: UpdateOrderDto) {
    const originalOrder = await this.orderService.order({
      id
    });

    if (!originalOrder || originalOrder.userId !== this.request.user.id) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const date = parseISO(data.date);

    const accountId = data.accountId;
    const customCurrency = data.customCurrency;

    delete data.accountId;

    if (customCurrency) {
      data.currency = customCurrency;

      delete data.customCurrency;
    }

    return this.orderService.updateOrder({
      data: {
        ...data,
        date,
        Account: {
          connect: {
            id_userId: { id: accountId, userId: this.request.user.id }
          }
        },
        SymbolProfile: {
          connect: {
            dataSource_symbol: {
              dataSource: data.dataSource,
              symbol: data.symbol
            }
          },
          update: {
            assetClass: data.assetClass,
            assetSubClass: data.assetSubClass,
            name: data.symbol
          }
        },
        User: { connect: { id: this.request.user.id } }
      },
      where: {
        id
      }
    });
  }
}
