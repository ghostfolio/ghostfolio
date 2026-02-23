import { OrderModule } from '@ghostfolio/api/app/order/order.module';
import { PortfolioModule } from '@ghostfolio/api/app/portfolio/portfolio.module';
import { UserModule } from '@ghostfolio/api/app/user/user.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';

import { Module } from '@nestjs/common';

import { AgentTraceService } from './agent-trace.service';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

@Module({
  controllers: [AgentController],
  imports: [
    DataProviderModule,
    OrderModule,
    PortfolioModule,
    PropertyModule,
    UserModule
  ],
  providers: [AgentTraceService, AgentService]
})
export class AgentModule {}
