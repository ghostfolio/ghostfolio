import { Logger, mixin, Type } from '@nestjs/common';
import { AuthGuard, IAuthGuard } from '@nestjs/passport';

export function OAuthCallbackGuard(strategy: string): Type<IAuthGuard> {
  class OAuthCallbackGuardMixin extends AuthGuard(strategy) {
    private readonly logger = new Logger(OAuthCallbackGuard.name);

    public override handleRequest(
      err: unknown,
      user: any,
      info: unknown,
      context: unknown,
      status?: unknown
    ) {
      if (err) {
        this.logger.error(
          `Authentication with the ${strategy} strategy has failed: ${(err as Error)?.message ?? err}`
        );
      }

      if (!user) {
        const infoMessage =
          info !== undefined && info !== null
            ? `: ${info instanceof Error ? info.message : typeof info === 'string' ? info : JSON.stringify(info)}`
            : ': no user returned';

        this.logger.warn(
          `Authentication with the ${strategy} strategy has failed${infoMessage}`
        );
      }

      // Do not throw, the callback handler redirects to the login page instead
      return user;
    }
  }

  return mixin(OAuthCallbackGuardMixin);
}
