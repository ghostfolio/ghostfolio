import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_DEMO_ACCOUNT_ID,
  PROPERTY_DEMO_USER_ID,
  TAG_ID_DEMO
} from '@ghostfolio/common/config';

import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DemoService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService
  ) {}

  public async syncDemoUserAccount() {
    const [demoAccountId, demoUserId] = (await Promise.all([
      this.propertyService.getByKey(PROPERTY_DEMO_ACCOUNT_ID),
      this.propertyService.getByKey(PROPERTY_DEMO_USER_ID)
    ])) as [string, string];

    let activities = await this.prismaService.order.findMany({
      orderBy: {
        date: 'asc'
      },
      where: {
        tags: {
          some: {
            id: TAG_ID_DEMO
          }
        }
      }
    });

    activities = activities.map((activity) => {
      return {
        ...activity,
        accountId: demoAccountId,
        accountUserId: demoUserId,
        comment: null,
        id: uuidv4(),
        userId: demoUserId
      };
    });

    await this.prismaService.order.deleteMany({
      where: {
        userId: demoUserId
      }
    });

    return this.prismaService.order.createMany({
      data: activities
    });
  }
}
