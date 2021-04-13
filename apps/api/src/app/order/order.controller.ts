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
import { RequestWithUser } from 'apps/api/src/app/interfaces/request-with-user.type';
import { parseISO } from 'date-fns';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { getPermissions, hasPermission, permissions } from 'libs/helper/src';

import { nullifyValuesInObjects } from '../../helper/object.helper';
import { ImpersonationService } from '../../services/impersonation.service';
import { CreateOrderDto } from './create-order.dto';
import { OrderService } from './order.service';
import { UpdateOrderDto } from './update-order.dto';

@Controller('order')
export class OrderController {
  public constructor(
    private readonly impersonationService: ImpersonationService,
    private readonly orderService: OrderService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  public async deleteOrder(@Param('id') id: string): Promise<OrderModel> {
    if (
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.deleteOrder
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.orderService.deleteOrder(
      {
        id_userId: {
          id,
          userId: this.request.user.id
        }
      },
      this.request.user.id
    );
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  public async getAllOrders(
    @Headers('impersonation-id') impersonationId
  ): Promise<OrderModel[]> {
    const impersonationUserId = await this.impersonationService.validateImpersonationId(
      impersonationId,
      this.request.user.id
    );

    let orders = await this.orderService.orders({
      include: {
        Platform: true
      },
      orderBy: { date: 'desc' },
      where: { userId: impersonationUserId || this.request.user.id }
    });

    if (
      impersonationUserId &&
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.readForeignPortfolio
      )
    ) {
      orders = nullifyValuesInObjects(orders, ['fee', 'quantity', 'unitPrice']);
    }

    return orders;
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
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.createOrder
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const date = parseISO(data.date);

    if (data.platformId) {
      const platformId = data.platformId;
      delete data.platformId;

      return this.orderService.createOrder(
        {
          ...data,
          date,
          Platform: { connect: { id: platformId } },
          User: { connect: { id: this.request.user.id } }
        },
        this.request.user.id
      );
    } else {
      delete data.platformId;

      return this.orderService.createOrder(
        {
          ...data,
          date,
          User: { connect: { id: this.request.user.id } }
        },
        this.request.user.id
      );
    }
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  public async update(@Param('id') id: string, @Body() data: UpdateOrderDto) {
    if (
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.updateOrder
      )
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

    const date = parseISO(data.date);

    if (data.platformId) {
      const platformId = data.platformId;
      delete data.platformId;

      return this.orderService.updateOrder(
        {
          data: {
            ...data,
            date,
            Platform: { connect: { id: platformId } },
            User: { connect: { id: this.request.user.id } }
          },
          where: {
            id_userId: {
              id,
              userId: this.request.user.id
            }
          }
        },
        this.request.user.id
      );
    } else {
      // platformId is null, remove it
      delete data.platformId;

      return this.orderService.updateOrder(
        {
          data: {
            ...data,
            date,
            Platform: originalOrder.platformId
              ? { disconnect: true }
              : undefined,
            User: { connect: { id: this.request.user.id } }
          },
          where: {
            id_userId: {
              id,
              userId: this.request.user.id
            }
          }
        },
        this.request.user.id
      );
    }
  }
}
