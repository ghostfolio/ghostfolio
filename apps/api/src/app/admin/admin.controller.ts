import { getPermissions, hasPermission, permissions } from '@ghostfolio/helper';
import {
  Controller,
  Get,
  HttpException,
  Inject,
  Post,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { RequestWithUser } from 'apps/api/src/app/interfaces/request-with-user.type';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { DataGatheringService } from '../../services/data-gathering.service';
import { AdminService } from './admin.service';
import { AdminData } from './interfaces/admin-data.interface';

@Controller('admin')
export class AdminController {
  public constructor(
    private readonly adminService: AdminService,
    private readonly dataGatheringService: DataGatheringService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  public async getAdminData(): Promise<AdminData> {
    if (
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.accessAdminControl
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.adminService.get();
  }

  @Post('gather/max')
  @UseGuards(AuthGuard('jwt'))
  public async gatherMax(): Promise<void> {
    if (
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.accessAdminControl
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    this.dataGatheringService.gatherMax();

    return;
  }
}
