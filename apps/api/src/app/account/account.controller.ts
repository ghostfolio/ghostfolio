import { nullifyValuesInObjects } from '@ghostfolio/api/helper/object.helper';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation.service';
import {
  getPermissions,
  hasPermission,
  permissions
} from '@ghostfolio/common/permissions';
import { RequestWithUser } from '@ghostfolio/common/types';
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
import { Account as AccountModel } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { AccountService } from './account.service';
import { CreateAccountDto } from './create-account.dto';
import { UpdateAccountDto } from './update-account.dto';

@Controller('account')
export class AccountController {
  public constructor(
    private readonly accountService: AccountService,
    private readonly impersonationService: ImpersonationService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  public async deleteAccount(@Param('id') id: string): Promise<AccountModel> {
    if (
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.deleteAccount
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const account = await this.accountService.accountWithOrders(
      {
        id_userId: {
          id,
          userId: this.request.user.id
        }
      },
      { Order: true }
    );

    if (account?.isDefault || account?.Order.length > 0) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.accountService.deleteAccount(
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
  public async getAllAccounts(
    @Headers('impersonation-id') impersonationId
  ): Promise<AccountModel[]> {
    const impersonationUserId = await this.impersonationService.validateImpersonationId(
      impersonationId,
      this.request.user.id
    );

    let accounts = await this.accountService.accounts({
      include: { Order: true, Platform: true },
      orderBy: { name: 'asc' },
      where: { userId: impersonationUserId || this.request.user.id }
    });

    if (
      impersonationUserId &&
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.readForeignPortfolio
      )
    ) {
      accounts = nullifyValuesInObjects(accounts, [
        'fee',
        'quantity',
        'unitPrice'
      ]);
    }

    return accounts;
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  public async getAccountById(@Param('id') id: string): Promise<AccountModel> {
    return this.accountService.account({
      id_userId: {
        id,
        userId: this.request.user.id
      }
    });
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  public async createAccount(
    @Body() data: CreateAccountDto
  ): Promise<AccountModel> {
    if (
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.createAccount
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    if (data.platformId) {
      const platformId = data.platformId;
      delete data.platformId;

      return this.accountService.createAccount(
        {
          ...data,
          Platform: { connect: { id: platformId } },
          User: { connect: { id: this.request.user.id } }
        },
        this.request.user.id
      );
    } else {
      delete data.platformId;

      return this.accountService.createAccount(
        {
          ...data,
          User: { connect: { id: this.request.user.id } }
        },
        this.request.user.id
      );
    }
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  public async update(@Param('id') id: string, @Body() data: UpdateAccountDto) {
    if (
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.updateAccount
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const originalAccount = await this.accountService.account({
      id_userId: {
        id,
        userId: this.request.user.id
      }
    });

    if (!originalAccount) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    if (data.platformId) {
      const platformId = data.platformId;
      delete data.platformId;

      return this.accountService.updateAccount(
        {
          data: {
            ...data,
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

      return this.accountService.updateAccount(
        {
          data: {
            ...data,
            Platform: originalAccount.platformId
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
