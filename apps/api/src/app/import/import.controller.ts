import { environment } from '@ghostfolio/api/environments/environment';
import { RequestWithUser } from '@ghostfolio/common/types';
import {
  Controller,
  HttpException,
  Inject,
  Post,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Order } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { ImportService } from './import.service';

@Controller('import')
export class ImportController {
  public constructor(
    private readonly importService: ImportService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  public async import(): Promise<void> {
    if (environment.production) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    let orders: Partial<Order>[];

    try {
      // TODO: Wire with file upload
      const data = { orders: [] };
      orders = data.orders;

      return await this.importService.import({
        orders,
        userId: this.request.user.id
      });
    } catch (error) {
      console.error(error);

      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }
  }
}
