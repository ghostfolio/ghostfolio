import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../../services/prisma.service';
import { UserService } from '../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  public constructor(
    private prisma: PrismaService,
    private readonly userService: UserService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET_KEY
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
