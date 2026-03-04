import type { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import type { Filter } from '@ghostfolio/common/interfaces';

import { createHash } from 'node:crypto';
import { z } from 'zod/v4';

export const DATE_RANGE_ENUM = z.enum([
  '1d',
  'wtd',
  'mtd',
  'ytd',
  '1y',
  '5y',
  'max'
]);

export const ASSET_CLASS_ENUM = z.enum([
  'COMMODITY',
  'EQUITY',
  'FIXED_INCOME',
  'LIQUIDITY',
  'REAL_ESTATE'
]);

export const ASSET_CLASSES_PARAM = z
  .array(ASSET_CLASS_ENUM)
  .optional()
  .describe(
    'Filter by asset class. Pass an array, e.g. ["EQUITY"]. Valid values: COMMODITY, EQUITY, FIXED_INCOME, LIQUIDITY, REAL_ESTATE'
  );

export function buildFilters(args: {
  accounts?: string[];
  assetClasses?: string[];
  tags?: string[];
}): Filter[] {
  const filters: Filter[] = [];

  if (args.accounts) {
    for (const account of args.accounts) {
      filters.push({ id: account, type: 'ACCOUNT' });
    }
  }

  if (args.assetClasses) {
    for (const assetClass of args.assetClasses) {
      filters.push({ id: assetClass, type: 'ASSET_CLASS' });
    }
  }

  if (args.tags) {
    for (const tag of args.tags) {
      filters.push({ id: tag, type: 'TAG' });
    }
  }

  return filters;
}

const MAX_RESULT_SIZE = 50_000;

export function compactJson(data: unknown): string {
  const json = JSON.stringify(data, (_, v) => (v === null ? undefined : v));

  if (json && json.length > MAX_RESULT_SIZE) {
    return json.slice(0, MAX_RESULT_SIZE) + '...[truncated]';
  }

  return json;
}

export function memoize<T>(
  cache: Map<string, Promise<unknown>>,
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const existing = cache.get(key);
  if (existing) return existing as Promise<T>;
  const promise = fn();
  cache.set(key, promise);
  return promise;
}

export function createToolErrorResponse(toolName: string, error: unknown) {
  const message =
    error instanceof Error ? error.message : 'Unknown error occurred';

  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          error: true,
          tool: toolName,
          message: `Failed to execute ${toolName}: ${message}`
        })
      }
    ]
  };
}

const TOOL_CACHE_PREFIX = 'agent:tool-cache';

export function buildToolCacheKey(
  userId: string,
  toolName: string,
  params: Record<string, unknown>
): string {
  const sortedParams = JSON.stringify(params, Object.keys(params).sort());
  const hash = createHash('sha256')
    .update(sortedParams)
    .digest('hex')
    .slice(0, 16);
  return `${TOOL_CACHE_PREFIX}:${userId}:${toolName}:${hash}`;
}

export async function withRedisCache<T>(
  redis: RedisCacheService | undefined,
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  if (!redis) return fn();

  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
  } catch {
    // Fail open — Redis down, just execute
  }

  const result = await fn();

  try {
    void redis.set(key, JSON.stringify(result), ttlMs);
  } catch {
    // Non-critical
  }

  return result;
}

export async function invalidateToolCache(
  redis: RedisCacheService | undefined,
  userId: string
): Promise<void> {
  if (!redis) return;

  try {
    const keys = await redis.getKeys(`${TOOL_CACHE_PREFIX}:${userId}:`);

    if (keys.length === 0) return;

    const results = await Promise.allSettled(
      keys.map((key) => redis.remove(key))
    );

    const failures = results.filter((r) => r.status === 'rejected');

    if (failures.length > 0) {
      // Log partial failures but don't throw
      const logger = new (await import('@nestjs/common')).Logger(
        'invalidateToolCache'
      );
      logger.warn(
        `Cache invalidation: ${failures.length}/${keys.length} keys failed to remove`
      );
    }
  } catch {
    // Non-critical
  }
}
