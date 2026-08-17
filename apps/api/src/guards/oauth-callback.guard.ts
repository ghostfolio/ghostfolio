import { Logger, mixin, Type } from '@nestjs/common';
import { AuthGuard, IAuthGuard } from '@nestjs/passport';

export function OAuthCallbackGuard(strategy: string): Type<IAuthGuard> {
  class OAuthCallbackGuardMixin extends AuthGuard(strategy) {
    private readonly logger = new Logger(OAuthCallbackGuard.name);

    public override handleRequest(error: Error, user: any) {
      if (error) {
        this.logger.error(
          `Authentication with the ${strategy} strategy has failed: ${error.message}`
        );
      }

      // Do not throw, the callback handler redirects to the login page instead
      return user;
    }
  }

  return mixin(OAuthCallbackGuardMixin);
}
