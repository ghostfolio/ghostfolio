import { environment } from '@ghostfolio/api/environments/environment';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Export } from '@ghostfolio/common/interfaces';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ExportService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async export({
    activityIds,
    userId
  }: {
    activityIds?: string[];
    userId: string;
  }): Promise<Export> {
    let orders = await this.prismaService.order.findMany({
      orderBy: { date: 'desc' },
      select: {
        accountId: true,
        currency: true,
        dataSource: true,
        date: true,
        fee: true,
        id: true,
        quantity: true,
        SymbolProfile: true,
        type: true,
        unitPrice: true
      },
      where: { userId }
    });

    if (activityIds) {
      orders = orders.filter((order) => {
        return activityIds.includes(order.id);
      });
    }

    return {
      meta: { date: new Date().toISOString(), version: environment.version },
      orders: orders.map(
        ({
          accountId,
          currency,
          date,
          fee,
          quantity,
          SymbolProfile,
          type,
          unitPrice
        }) => {
          return {
            accountId,
            currency,
            date,
            fee,
            quantity,
            type,
            unitPrice,
            dataSource: SymbolProfile.dataSource,
            symbol: SymbolProfile.symbol
          };
        }
      )
    };
  }
}
