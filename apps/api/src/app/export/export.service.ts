import { environment } from '@ghostfolio/api/environments/environment';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Export } from '@ghostfolio/common/interfaces';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ExportService {
  public constructor(private prisma: PrismaService) {}

  public async export({ userId }: { userId: string }): Promise<Export> {
    const orders = await this.prisma.order.findMany({
      orderBy: { date: 'desc' },
      select: {
        currency: true,
        dataSource: true,
        date: true,
        fee: true,
        quantity: true,
        symbol: true,
        type: true,
        unitPrice: true
      },
      where: { userId }
    });

    return {
      meta: { date: new Date().toISOString(), version: environment.version },
      orders
    };
  }
}
