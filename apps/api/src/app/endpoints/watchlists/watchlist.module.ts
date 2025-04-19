import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';

@Module({
  controllers: [WatchlistController],
  imports: [PrismaModule],
  providers: [WatchlistService]
})
export class WatchlistModule {}
