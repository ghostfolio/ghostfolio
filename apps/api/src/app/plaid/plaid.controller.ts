import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { REQUEST } from '@nestjs/core';

import { PlaidService } from './plaid.service';

@Controller('plaid')
export class PlaidController {
  public constructor(
    private readonly plaidService: PlaidService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Post('link-token')
  @UseGuards(AuthGuard('jwt'))
  public async createLinkToken() {
    return this.plaidService.createLinkToken(this.request.user.id);
  }

  @Post('link-token/update/:plaidItemId')
  @UseGuards(AuthGuard('jwt'))
  public async createUpdateLinkToken(
    @Param('plaidItemId') plaidItemId: string
  ) {
    return this.plaidService.createUpdateLinkToken(
      this.request.user.id,
      plaidItemId
    );
  }

  @Post('exchange-token')
  @UseGuards(AuthGuard('jwt'))
  public async exchangeToken(
    @Body()
    body: {
      publicToken: string;
      institutionId: string;
      institutionName: string;
      accounts: {
        id: string;
        name: string;
        type: string;
        subtype: string;
        mask: string;
      }[];
    }
  ) {
    return this.plaidService.exchangeToken(this.request.user.id, body);
  }

  @Get('items')
  @UseGuards(AuthGuard('jwt'))
  public async getItems() {
    return this.plaidService.getItems(this.request.user.id);
  }

  @Delete('items/:plaidItemId')
  @UseGuards(AuthGuard('jwt'))
  public async deleteItem(@Param('plaidItemId') plaidItemId: string) {
    return this.plaidService.deleteItem(this.request.user.id, plaidItemId);
  }

  @Post('sync/:plaidItemId')
  @UseGuards(AuthGuard('jwt'))
  public async triggerSync(@Param('plaidItemId') plaidItemId: string) {
    return this.plaidService.triggerSync(this.request.user.id, plaidItemId);
  }

  @Post('webhook')
  public async handleWebhook(
    @Body()
    payload: {
      webhook_type: string;
      webhook_code: string;
      item_id: string;
      error?: object;
    }
  ) {
    await this.plaidService.handleWebhook(payload);
    return {};
  }
}
