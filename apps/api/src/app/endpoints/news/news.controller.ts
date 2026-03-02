import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { permissions } from '@ghostfolio/common/permissions';

import {
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  public constructor(private readonly newsService: NewsService) {}

  @Get()
  @HasPermission(permissions.readAiPrompt)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getNews(
    @Query('symbol') symbol?: string,
    @Query('limit') limit?: string
  ) {
    return this.newsService.getStoredNews({
      symbol,
      limit: limit ? parseInt(limit, 10) : 10
    });
  }

  @Post('fetch')
  @HasPermission(permissions.readAiPrompt)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async fetchNews(@Query('symbol') symbol: string) {
    if (!symbol) {
      return { stored: 0, message: 'symbol query parameter is required' };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return this.newsService.fetchAndStoreNews({
      symbol,
      from: thirtyDaysAgo,
      to: now
    });
  }

  @Delete('cleanup')
  @HasPermission(permissions.readAiPrompt)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async cleanupNews() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return this.newsService.deleteOldNews(thirtyDaysAgo);
  }
}
