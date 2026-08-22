import { ExecutionContext } from '@nestjs/common';

/**
 * Gives the underlying HTTP request of a request of any kind. A tool of the
 * model context protocol is a message handler, hence its execution context is
 * not of the kind http and the request has to be taken from the context of the
 * message instead.
 */
export function getRequest<T>(context: ExecutionContext): T | undefined {
  if (context.getType() === 'http') {
    return context.switchToHttp().getRequest<T>();
  }

  const contextOfMessage = context.switchToRpc().getContext<{
    getRawRequest?: <U>() => U | undefined;
  }>();

  return contextOfMessage?.getRawRequest?.<T>();
}
