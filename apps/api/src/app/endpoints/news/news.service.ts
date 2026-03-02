import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  public constructor(private readonly prismaService: PrismaService) {}

  public async fetchAndStoreNews({
    symbol,
    from,
    to
  }: {
    symbol: string;
    from: Date;
    to: Date;
  }) {
    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
      this.logger.warn('FINNHUB_API_KEY is not configured');
      return { stored: 0, message: 'FINNHUB_API_KEY is not configured' };
    }

    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];
    const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}&token=${apiKey}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        this.logger.warn(
          `Finnhub API error: ${response.status} ${response.statusText}`
        );
        return {
          stored: 0,
          message: `Finnhub API error: ${response.status}`
        };
      }

      const articles = await response.json();

      if (!Array.isArray(articles) || articles.length === 0) {
        return { stored: 0, message: 'No articles found' };
      }

      let stored = 0;

      for (const article of articles) {
        try {
          await this.prismaService.newsArticle.upsert({
            where: { finnhubId: article.id },
            create: {
              symbol: symbol.toUpperCase(),
              headline: article.headline || '',
              summary: article.summary || '',
              source: article.source || '',
              url: article.url || '',
              imageUrl: article.image || null,
              publishedAt: new Date(article.datetime * 1000),
              finnhubId: article.id
            },
            update: {
              headline: article.headline || '',
              summary: article.summary || '',
              source: article.source || '',
              url: article.url || '',
              imageUrl: article.image || null
            }
          });
          stored++;
        } catch (error) {
          this.logger.warn(
            `Failed to upsert article ${article.id}: ${error.message}`
          );
        }
      }

      return { stored, message: `Stored ${stored} articles for ${symbol}` };
    } catch (error) {
      this.logger.error(`Failed to fetch news for ${symbol}:`, error);
      return { stored: 0, message: `Failed to fetch news: ${error.message}` };
    }
  }

  public async getStoredNews({
    symbol,
    limit = 10
  }: {
    symbol?: string;
    limit?: number;
  }) {
    return this.prismaService.newsArticle.findMany({
      where: symbol ? { symbol: symbol.toUpperCase() } : undefined,
      orderBy: { publishedAt: 'desc' },
      take: limit
    });
  }

  public async deleteOldNews(olderThan: Date) {
    const result = await this.prismaService.newsArticle.deleteMany({
      where: { publishedAt: { lt: olderThan } }
    });
    return { deleted: result.count };
  }
}
