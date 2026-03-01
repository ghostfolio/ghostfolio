export interface ClassifiedToolError {
  type:
    | 'timeout'
    | 'not_found'
    | 'permission'
    | 'validation'
    | 'upstream'
    | 'unknown';
  userMessage: string;
  retryable: boolean;
}

export function classifyToolError(error: unknown): ClassifiedToolError {
  if (!(error instanceof Error)) {
    return {
      type: 'unknown',
      userMessage: 'An unexpected error occurred while fetching data.',
      retryable: false
    };
  }

  const message = error.message.toLowerCase();

  if (
    error.name === 'AbortError' ||
    message.includes('timeout') ||
    message.includes('aborted')
  ) {
    return {
      type: 'timeout',
      userMessage: 'The request timed out. The data source may be slow.',
      retryable: true
    };
  }

  if (message.includes('not found') || message.includes('404')) {
    return {
      type: 'not_found',
      userMessage: 'The requested data was not found.',
      retryable: false
    };
  }

  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('401') ||
    message.includes('403')
  ) {
    return {
      type: 'permission',
      userMessage: 'Access denied to the requested resource.',
      retryable: false
    };
  }

  if (message.includes('unique constraint') || message.includes('p2002')) {
    return {
      type: 'validation',
      userMessage:
        'A record with this name already exists. Choose a different name.',
      retryable: false
    };
  }

  if (
    message.includes('invalid') ||
    message.includes('validation') ||
    message.includes('required')
  ) {
    return {
      type: 'validation',
      userMessage: `Data unavailable: ${error.message.slice(0, 200)}. Do not retry with different parameters.`,
      retryable: false
    };
  }

  if (
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('upstream') ||
    message.includes('503')
  ) {
    return {
      type: 'upstream',
      userMessage: 'An external data source is temporarily unavailable.',
      retryable: true
    };
  }

  return {
    type: 'unknown',
    userMessage: `An unexpected error occurred: ${error.message.slice(0, 200)}`,
    retryable: false
  };
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10_000
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        Object.assign(new Error('Tool execution timed out'), {
          name: 'AbortError'
        })
      );
    }, timeoutMs);
    // Ensure timer doesn't prevent Node process exit
    if (typeof timer === 'object' && 'unref' in timer) {
      timer.unref();
    }
  });

  // Clear the timer when the original promise settles first
  const wrappedPromise = promise.then(
    (result) => {
      clearTimeout(timer);
      return result;
    },
    (error) => {
      clearTimeout(timer);
      throw error;
    }
  );

  return Promise.race([wrappedPromise, timeoutPromise]);
}
