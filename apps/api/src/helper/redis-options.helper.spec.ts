import {
  getBullRedisOptions,
  getKeyvRedisOptions
} from './redis-options.helper';

describe('getBullRedisOptions', () => {
  it('should return tcp options when using a hostname', () => {
    expect(
      getBullRedisOptions({
        db: 2,
        host: 'localhost',
        password: 'secret',
        port: 6380
      })
    ).toStrictEqual({
      db: 2,
      host: 'localhost',
      password: 'secret',
      port: 6380
    });
  });

  it('should return unix socket options when using a socket path', () => {
    expect(
      getBullRedisOptions({
        db: 0,
        host: '/run/valkey/valkey.sock',
        password: '',
        port: 6379
      })
    ).toStrictEqual({
      db: 0,
      password: undefined,
      path: '/run/valkey/valkey.sock'
    });
  });
});

describe('getKeyvRedisOptions', () => {
  it('should return tcp options when using a hostname', () => {
    expect(
      getKeyvRedisOptions({
        db: 1,
        host: 'redis',
        password: 'secret',
        port: 6379
      })
    ).toStrictEqual({
      database: 1,
      password: 'secret',
      socket: {
        host: 'redis',
        port: 6379
      }
    });
  });

  it('should return unix socket options when using a socket path', () => {
    expect(
      getKeyvRedisOptions({
        db: 5,
        host: '/var/run/redis/redis.sock',
        password: '',
        port: 6379
      })
    ).toStrictEqual({
      database: 5,
      password: undefined,
      socket: {
        path: '/var/run/redis/redis.sock'
      }
    });
  });
});
