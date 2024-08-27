import { Logger } from '@nestjs/common';
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const methodName =
      context.getClass().name + ':' + context.getHandler().name;
    Logger.debug(`Before ${methodName}...`);

    const now = Date.now();
    return next
      .handle()
      .pipe(
        tap(() => Logger.debug(`After ${methodName}... ${Date.now() - now}ms`))
      );
  }
}

export function LogPerformance(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any[]) {
    const time = Date.now();
    const result = originalMethod.apply(this, args);
    const now = Date.now();
    if (now - time > 100) {
      Logger.debug(`${propertyKey} returned within: ${now - time} ms`);
    }
    return result;
  };

  return descriptor;
}
