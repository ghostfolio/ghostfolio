import { CashManagementService } from '@ghostfolio/api/app/account-balance/cash-management.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';

import { MODULE_METADATA } from '@nestjs/common/constants';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';

import { ImportModule } from './import.module';
import { PortfolioRestoreService } from './portfolio-restore.service';

// Match the upstream module-security tests: Jest cannot load these ESM SDKs.
jest.mock('@openrouter/ai-sdk-provider', () => ({}));
jest.mock('ai', () => ({}));

describe('ImportModule restore persistence binding', () => {
  it('provides the restore dependency through the actual import module imports', async () => {
    // Keep the real persistence-module boundary. Other collaborators are inert:
    // this checks dependency injection without opening database/queue connections.
    const declaredImports: unknown[] = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      ImportModule
    );
    const prisma = {};
    const context = await Test.createTestingModule({
      imports: declaredImports.filter(
        (module): module is typeof PrismaModule => module === PrismaModule
      ),
      providers: [
        PortfolioRestoreService,
        { provide: CashManagementService, useValue: {} },
        { provide: EventEmitter2, useValue: {} },
        { provide: DataGatheringService, useValue: {} }
      ]
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    expect(context.get(PortfolioRestoreService)).toBeInstanceOf(
      PortfolioRestoreService
    );
    expect(context.get(PrismaService)).toBe(prisma);
    await context.close();
  });
});
