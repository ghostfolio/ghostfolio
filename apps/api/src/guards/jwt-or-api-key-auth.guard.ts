import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtOrApiKeyAuthGuard implements CanActivate {
  private readonly apiKeyGuard = new (AuthGuard('api-key'))();
  private readonly jwtGuard = new (AuthGuard('jwt'))();

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await this.jwtGuard.canActivate(context)) as boolean;
    } catch {
      return (await this.apiKeyGuard.canActivate(context)) as boolean;
    }
  }
}
