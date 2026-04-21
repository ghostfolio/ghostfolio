import type { RedisClientOptions } from '@keyv/redis';
import type { RedisOptions } from 'ioredis';

interface RedisConnectionOptions {
  db: number;
  host: string;
  password?: string;
  port: number;
}

export function getBullRedisOptions({
  db,
  host,
  password,
  port
}: RedisConnectionOptions): RedisOptions {
  const redisPassword = password || undefined;

  if (isUnixSocketPath(host)) {
    return {
      db,
      password: redisPassword,
      path: host
    };
  }

  return {
    db,
    host,
    password: redisPassword,
    port
  };
}

export function getKeyvRedisOptions({
  db,
  host,
  password,
  port
}: RedisConnectionOptions): RedisClientOptions {
  const redisPassword = password || undefined;

  if (isUnixSocketPath(host)) {
    return {
      database: db,
      password: redisPassword,
      socket: {
        path: host
      }
    };
  }

  return {
    database: db,
    password: redisPassword,
    socket: {
      host,
      port
    }
  };
}

function isUnixSocketPath(host: string) {
  return host.startsWith('/');
}
