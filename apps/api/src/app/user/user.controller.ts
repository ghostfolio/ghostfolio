import { RequestWithUser } from '@ghostfolio/api/app/interfaces/request-with-user.type';
import { getPermissions, hasPermission, permissions } from '@ghostfolio/helper';
import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Post,
  Put,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Provider } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { UserItem } from './interfaces/user-item.interface';
import { User } from './interfaces/user.interface';
import { UpdateUserSettingsDto } from './update-user-settings.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  public constructor(
    private jwtService: JwtService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly userService: UserService
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  public async getUser(@Param('id') id: string): Promise<User> {
    return this.userService.getUser(this.request.user);
  }

  @Post()
  public async signupUser(): Promise<UserItem> {
    const { accessToken, id } = await this.userService.createUser({
      provider: Provider.ANONYMOUS
    });

    return {
      accessToken,
      authToken: this.jwtService.sign({
        id
      })
    };
  }

  @Put('settings')
  @UseGuards(AuthGuard('jwt'))
  public async updateUserSettings(@Body() data: UpdateUserSettingsDto) {
    if (
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.updateUserSettings
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return await this.userService.updateUserSettings({
      currency: data.currency,
      userId: this.request.user.id
    });
  }
}
