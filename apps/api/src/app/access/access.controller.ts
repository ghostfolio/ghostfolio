import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { RequestWithUser } from 'apps/api/src/app/interfaces/request-with-user.type';

import { AccessService } from './access.service';
import { Access } from './interfaces/access.interface';

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
      where: { userId: this.request.user.id }
    });

    return accessesWithGranteeUser.map((access) => {
      return {
        granteeAlias: access.GranteeUser.alias
      };
    });
  }
}
