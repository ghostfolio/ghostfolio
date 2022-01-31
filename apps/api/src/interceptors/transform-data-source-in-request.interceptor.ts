import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ConfigurationService } from '../services/configuration.service';

@Injectable()
export class TransformDataSourceInRequestInterceptor<T>
  implements NestInterceptor<T, any>
{
  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest();

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') === true) {
      // Decode data source
      if (request.params.dataSource) {
        request.params.dataSource = Buffer.from(
          request.params.dataSource,
          'hex'
        ).toString();
      }
    }

    return next.handle();
  }
}
