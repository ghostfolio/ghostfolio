import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { HEADER_KEY_TIMEZONE } from '@ghostfolio/common/config';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import * as countriesAndTimezones from 'countries-and-timezones';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly prismaService: PrismaService,
    private readonly userService: UserService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      passReqToCallback: true,
      secretOrKey: configurationService.get('JWT_SECRET_KEY')
    });
  }

  public async validate(request: Request, { id }: { id: string }) {
    try {
      const timezone = request.headers[HEADER_KEY_TIMEZONE.toLowerCase()];
      const user = await this.userService.user({ id });

      if (user) {
        if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
          const country =
            countriesAndTimezones.getCountryForTimezone(timezone)?.id;

          await this.prismaService.analytics.upsert({
            create: { country, User: { connect: { id: user.id } } },
            update: {
              country,
              activityCount: { increment: 1 },
              updatedAt: new Date()
            },
            where: { userId: user.id }
          });
        }

        return user;
      } else {
        throw '';
      }
    } catch (err) {
      throw new UnauthorizedException('unauthorized', err.message);
    }
  }
}
