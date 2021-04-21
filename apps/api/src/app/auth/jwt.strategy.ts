import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserService } from '../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  public constructor(
    readonly configurationService: ConfigurationService,
    private prisma: PrismaService,
    private readonly userService: UserService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configurationService.get('JWT_SECRET_KEY')
    });
  }

  public async validate({ id }: { id: string }) {
    try {
      const user = await this.userService.user({ id });

      if (user) {
        await this.prisma.analytics.upsert({
          create: { User: { connect: { id: user.id } } },
          update: { activityCount: { increment: 1 }, updatedAt: new Date() },
          where: { userId: user.id }
        });

        return user;
      } else {
        throw '';
      }
    } catch (err) {
      throw new UnauthorizedException('unauthorized', err.message);
    }
  }
}
