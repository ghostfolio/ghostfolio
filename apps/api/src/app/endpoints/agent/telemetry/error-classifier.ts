export type ErrorCategory =
  | 'LLM_API_ERROR'
  | 'LLM_UNAVAILABLE'
  | 'API_UNAVAILABLE'
  | 'TOOL_EXECUTION_ERROR'
  | 'VALIDATION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'BUDGET_EXCEEDED'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

export interface ClassifiedError {
  category: ErrorCategory;
  httpStatus: number;
  internalAction: 'log' | 'alert' | 'retry' | 'degrade';
}

export function classifyError(error: unknown): ClassifiedError {
  if (!(error instanceof Error)) {
    return { category: 'UNKNOWN', httpStatus: 500, internalAction: 'log' };
  }

  const message = error.message.toLowerCase();

  if (
    message.includes('rate_limit') ||
    message.includes('429') ||
    message.includes('too many requests')
  ) {
    return {
      category: 'RATE_LIMITED',
      httpStatus: 429,
      internalAction: 'retry'
    };
  }

  if (message.includes('budget') || message.includes('max_budget')) {
    return {
      category: 'BUDGET_EXCEEDED',
      httpStatus: 402,
      internalAction: 'alert'
    };
  }

  if (message.includes('timeout') || message.includes('aborted')) {
    return {
      category: 'TIMEOUT_ERROR',
      httpStatus: 504,
      internalAction: 'retry'
    };
  }

  if (
    message.includes('unauthorized') ||
    message.includes('401') ||
    message.includes('invalid_api_key')
  ) {
    return {
      category: 'AUTHENTICATION_ERROR',
      httpStatus: 401,
      internalAction: 'alert'
    };
  }

  if (message.includes('forbidden') || message.includes('403')) {
    return {
      category: 'AUTHORIZATION_ERROR',
      httpStatus: 403,
      internalAction: 'log'
    };
  }

  if (
    message.includes('overloaded') ||
    message.includes('503') ||
    message.includes('service unavailable') ||
    (message.includes('anthropic') && message.includes('unavailable'))
  ) {
    return {
      category: 'LLM_UNAVAILABLE',
      httpStatus: 503,
      internalAction: 'degrade'
    };
  }

  if (
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('upstream') ||
    message.includes('502') ||
    message.includes('504')
  ) {
    return {
      category: 'API_UNAVAILABLE',
      httpStatus: 502,
      internalAction: 'degrade'
    };
  }

  if (message.includes('api_error') || message.includes('anthropic')) {
    return {
      category: 'LLM_API_ERROR',
      httpStatus: 502,
      internalAction: 'alert'
    };
  }

  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required')
  ) {
    return {
      category: 'VALIDATION_ERROR',
      httpStatus: 400,
      internalAction: 'log'
    };
  }

  if (message.includes('tool') || message.includes('mcp')) {
    return {
      category: 'TOOL_EXECUTION_ERROR',
      httpStatus: 500,
      internalAction: 'degrade'
    };
  }

  return { category: 'UNKNOWN', httpStatus: 500, internalAction: 'log' };
}
