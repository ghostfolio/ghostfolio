import { UserService } from '@ghostfolio/api/app/user/user.service';
import { nullifyValuesInObjects } from '@ghostfolio/api/helper/object.helper';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation.service';
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
  UseGuards
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
    if (
      !hasPermission(this.request.user.permissions, permissions.deleteOrder)
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.orderService.deleteOrder({
      id_userId: {
        id,
        userId: this.request.user.id
      }
    });
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  public async getAllOrders(
    @Headers('impersonation-id') impersonationId
  ): Promise<Activities> {
    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(
        impersonationId,
        this.request.user.id
      );
    const userCurrency = this.request.user.Settings.currency;

    let activities = await this.orderService.getOrders({
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

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  public async getOrderById(@Param('id') id: string): Promise<OrderModel> {
    return this.orderService.order({
      id_userId: {
        id,
        userId: this.request.user.id
      }
    });
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  public async createOrder(@Body() data: CreateOrderDto): Promise<OrderModel> {
    if (
      !hasPermission(this.request.user.permissions, permissions.createOrder)
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const date = parseISO(data.date);

    const accountId = data.accountId;
    delete data.accountId;

    return this.orderService.createOrder({
      ...data,
      date,
      Account: {
        connect: {
          id_userId: { id: accountId, userId: this.request.user.id }
        }
      },
      SymbolProfile: {
        connectOrCreate: {
          create: {
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
      User: { connect: { id: this.request.user.id } }
    });
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  public async update(@Param('id') id: string, @Body() data: UpdateOrderDto) {
    if (
      !hasPermission(this.request.user.permissions, permissions.updateOrder)
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const originalOrder = await this.orderService.order({
      id_userId: {
        id,
        userId: this.request.user.id
      }
    });

    if (!originalOrder) {
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
        User: { connect: { id: this.request.user.id } }
      },
      where: {
        id_userId: {
          id,
          userId: this.request.user.id
        }
      }
    });
  }
}
