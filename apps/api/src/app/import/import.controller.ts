import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { RequestWithUser } from '@ghostfolio/common/types';
import {
  Body,
  Controller,
  HttpException,
  Inject,
  Post,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { ImportDataDto } from './import-data.dto';
import { ImportService } from './import.service';

@Controller('import')
export class ImportController {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly importService: ImportService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  public async import(@Body() importData: ImportDataDto): Promise<void> {
    if (!this.configurationService.get('ENABLE_FEATURE_IMPORT')) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    try {
      return await this.importService.import({
        orders: importData.orders,
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
