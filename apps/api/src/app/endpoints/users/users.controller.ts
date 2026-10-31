import { AdminService } from '@ghostfolio/api/app/admin/admin.service';
import { AllowDuringImpersonation } from '@ghostfolio/api/decorators/allow-during-impersonation.decorator';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { UserService } from '@ghostfolio/api/services/user/user.service';
import {
  AccessTokenResponse,
  AdminUserResponse,
  AdminUsersResponse
} from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

@AllowDuringImpersonation()
@Controller('users')
export class UsersController {
  public constructor(
    private readonly adminService: AdminService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly userService: UserService
  ) {}

  @Delete(':id')
  @HasPermission(permissions.deleteUser)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteUser(@Param('id') id: string): Promise<void> {
    if (id === this.request.user.id) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    await this.userService.deleteUser({
      id
    });
  }

  @Get(':id')
  @HasPermission(permissions.accessAdminControl)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getUser(@Param('id') id: string): Promise<AdminUserResponse> {
    return this.adminService.getUser(id);
  }

  @Get()
  @HasPermission(permissions.accessAdminControl)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getUsers(
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number
  ): Promise<AdminUsersResponse> {
    return this.adminService.getUsers({
      skip,
      take
    });
  }

  @HasPermission(permissions.accessAdminControl)
  @Post(':id/access-token')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateUserAccessToken(
    @Param('id') id: string
  ): Promise<AccessTokenResponse> {
    return this.userService.rotateAccessToken({ userId: id });
  }
}
