import { Access } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Param,
  Post,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Access as AccessModel } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { AccessModule } from './access.module';
import { AccessService } from './access.service';
import { CreateAccessDto } from './create-access.dto';

@Controller('access')
export class AccessController {
  public constructor(
    private readonly accessService: AccessService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  public async getAllAccesses(): Promise<Access[]> {
    const accessesWithGranteeUser = await this.accessService.accesses({
      include: {
        GranteeUser: true
      },
      orderBy: { granteeUserId: 'asc' },
      where: { userId: this.request.user.id }
    });

    return accessesWithGranteeUser.map((access) => {
      if (access.GranteeUser) {
        return {
          granteeAlias: access.GranteeUser?.alias,
          id: access.id,
          type: 'RESTRICTED_VIEW'
        };
      }

      return {
        granteeAlias: 'Public',
        id: access.id,
        type: 'PUBLIC'
      };
    });
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  public async createAccess(
    @Body() data: CreateAccessDto
  ): Promise<AccessModel> {
    if (
      !hasPermission(this.request.user.permissions, permissions.createAccess)
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.accessService.createAccess({
      User: { connect: { id: this.request.user.id } }
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  public async deleteAccess(@Param('id') id: string): Promise<AccessModule> {
    if (
      !hasPermission(this.request.user.permissions, permissions.deleteAccess)
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.accessService.deleteAccess({
      id_userId: {
        id,
        userId: this.request.user.id
      }
    });
  }
}
