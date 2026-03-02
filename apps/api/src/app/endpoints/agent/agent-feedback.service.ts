import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AgentFeedbackService {
  private readonly logger = new Logger(AgentFeedbackService.name);

  public constructor(private readonly prismaService: PrismaService) {}

  public async submit({
    requestId,
    userId,
    rating,
    comment
  }: {
    requestId: string;
    userId: string;
    rating: number;
    comment?: string;
  }) {
    const feedback = await this.prismaService.agentFeedback.upsert({
      where: { requestId_userId: { requestId, userId } },
      create: { requestId, userId, rating, comment },
      update: { rating, comment }
    });

    this.logger.log(
      JSON.stringify({
        event: 'feedback_submitted',
        requestId,
        userId,
        rating
      })
    );

    return feedback;
  }

  public async getSummary(sinceMs?: number) {
    const where = sinceMs
      ? { createdAt: { gte: new Date(Date.now() - sinceMs) } }
      : {};

    const [total, positive, negative, recent] = await Promise.all([
      this.prismaService.agentFeedback.count({ where }),
      this.prismaService.agentFeedback.count({
        where: { ...where, rating: 1 }
      }),
      this.prismaService.agentFeedback.count({
        where: { ...where, rating: -1 }
      }),
      this.prismaService.agentFeedback.findMany({
        where: { ...where, comment: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          rating: true,
          comment: true,
          createdAt: true
        }
      })
    ]);

    return {
      total,
      positive,
      negative,
      satisfactionRate: total > 0 ? Math.round((positive / total) * 100) : 0,
      recentComments: recent
    };
  }
}
