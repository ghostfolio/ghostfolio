import { UserService } from '@ghostfolio/api/app/user/user.service';
import { nullifyValuesInObjects } from '@ghostfolio/api/helper/object.helper';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response.interceptor';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response.interceptor';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation.service';
import { Filter } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';
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
import { Order as OrderModel } from '@prisma/client';
import { parseISO } from 'date-fns';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { CreateOrderDto } from './create-order.dto';
import { Activities } from './interfaces/activities.interface';
import { OrderService } from './order.service';
import { UpdateOrderDto } from './update-order.dto';

@Controller('order')
export class OrderController {
  public constructor(
    private readonly impersonationService: ImpersonationService,
    private readonly orderService: OrderService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly userService: UserService
  ) {}

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  public async deleteOrder(@Param('id') id: string): Promise<OrderModel> {
    const order = await this.orderService.order({ id });

    if (
      !hasPermission(this.request.user.permissions, permissions.deleteOrder) ||
      !order ||
      order.userId !== this.request.user.id
    ) {
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
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getAllOrders(
    @Headers('impersonation-id') impersonationId,
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('tags') filterByTags?: string
  ): Promise<Activities> {
    const accountIds = filterByAccounts?.split(',') ?? [];
    const assetClasses = filterByAssetClasses?.split(',') ?? [];
    const tagIds = filterByTags?.split(',') ?? [];

    const filters: Filter[] = [
      ...accountIds.map((accountId) => {
        return <Filter>{
          id: accountId,
          type: 'ACCOUNT'
        };
      }),
      ...assetClasses.map((assetClass) => {
        return <Filter>{
          id: assetClass,
          type: 'ASSET_CLASS'
        };
      }),
      ...tagIds.map((tagId) => {
        return <Filter>{
          id: tagId,
          type: 'TAG'
        };
      })
    ];

    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(
        impersonationId,
        this.request.user.id
      );
    const userCurrency = this.request.user.Settings.currency;

    let activities = await this.orderService.getOrders({
      filters,
      userCurrency,
      includeDrafts: true,
      userId: impersonationUserId || this.request.user.id
    });

    if (
      impersonationUserId ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      activities = nullifyValuesInObjects(activities, [
        'fee',
        'feeInBaseCurrency',
        'quantity',
        'unitPrice',
        'value',
        'valueInBaseCurrency'
      ]);
    }

    return { activities };
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async createOrder(@Body() data: CreateOrderDto): Promise<OrderModel> {
    if (
      !hasPermission(this.request.user.permissions, permissions.createOrder)
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.orderService.createOrder({
      ...data,
      date: parseISO(data.date),
      SymbolProfile: {
        connectOrCreate: {
          create: {
            currency: data.currency,
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
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async update(@Param('id') id: string, @Body() data: UpdateOrderDto) {
    const originalOrder = await this.orderService.order({
      id
    });

    if (
      !hasPermission(this.request.user.permissions, permissions.updateOrder) ||
      !originalOrder ||
      originalOrder.userId !== this.request.user.id
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const date = parseISO(data.date);

    const accountId = data.accountId;
    delete data.accountId;

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
