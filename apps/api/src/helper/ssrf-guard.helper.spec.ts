import { OAuthError, OAuthErrorCode } from '@modelcontextprotocol/server';
import { lookup as dnsLookup } from 'node:dns';
import { LookupFunction } from 'node:net';
import { Agent, fetch as undiciFetch, Response } from 'undici';

import {
  assertSafeExternalUrl,
  fetchJsonWithSsrfGuard,
  isBlockedIp
} from './ssrf-guard.helper';

jest.mock('node:dns', () => ({
  lookup: jest.fn()
}));

jest.mock('undici', () => ({
  Agent: jest.fn().mockImplementation(() => ({})),
  fetch: jest.fn()
}));

const agentOptions = jest.mocked(Agent).mock.calls[0]?.[0] as {
  connect?: { lookup?: LookupFunction };
};
const capturedLookup = agentOptions.connect.lookup;

const dnsLookupMock = dnsLookup as unknown as jest.Mock<
  void,
  [
    string,
    unknown,
    (
      err: NodeJS.ErrnoException | null,
      address: string | { address: string; family: number }[],
      family?: number
    ) => void
  ]
>;

function createMockResponse(bodyText: string, ok = true, status = 200) {
  const cancel = jest.fn();
  let consumed = false;

  const body = {
    cancel,
    [Symbol.asyncIterator]() {
      return {
        next() {
          if (consumed) {
            return Promise.resolve({ done: true as const, value: undefined });
          }

          consumed = true;

          return Promise.resolve({
            done: false as const,
            value: Buffer.from(bodyText, 'utf8')
          });
        }
      };
    }
  };

  return {
    cancel,
    response: {
      body,
      ok,
      status,
      statusText: ok ? 'OK' : 'Bad Request'
    } as unknown as Response
  };
}

describe('isBlockedIp', () => {
  it('allows public IPv4 addresses', () => {
    expect(isBlockedIp('8.8.8.8')).toBe(false);
    expect(isBlockedIp('1.1.1.1')).toBe(false);
    expect(isBlockedIp('93.184.216.34')).toBe(false);
  });

  it('allows public IPv6 addresses', () => {
    expect(isBlockedIp('2606:4700:4700::1111')).toBe(false);
    expect(isBlockedIp('2001:4860:4860::8888')).toBe(false);
  });

  it('blocks private IPv4 ranges (RFC 1918)', () => {
    expect(isBlockedIp('10.0.0.1')).toBe(true);
    expect(isBlockedIp('10.255.255.255')).toBe(true);
    expect(isBlockedIp('172.16.0.1')).toBe(true);
    expect(isBlockedIp('172.31.255.255')).toBe(true);
    expect(isBlockedIp('192.168.0.1')).toBe(true);
    expect(isBlockedIp('192.168.255.255')).toBe(true);
  });

  it('blocks loopback, link-local, cloud metadata, and CGNAT IPv4 ranges', () => {
    expect(isBlockedIp('0.0.0.0')).toBe(true);
    expect(isBlockedIp('127.0.0.1')).toBe(true);
    expect(isBlockedIp('127.0.0.2')).toBe(true);
    expect(isBlockedIp('169.254.169.254')).toBe(true);
    expect(isBlockedIp('169.254.0.1')).toBe(true);
    expect(isBlockedIp('100.64.0.1')).toBe(true);
    expect(isBlockedIp('100.127.255.254')).toBe(true);
    expect(isBlockedIp('224.0.0.1')).toBe(true);
    expect(isBlockedIp('240.0.0.1')).toBe(true);
  });

  it('blocks loopback, ULA, link-local, and multicast IPv6 ranges', () => {
    expect(isBlockedIp('::')).toBe(true);
    expect(isBlockedIp('::1')).toBe(true);
    expect(isBlockedIp('fc00::1')).toBe(true);
    expect(isBlockedIp('fd12:3456:789a::1')).toBe(true);
    expect(isBlockedIp('fe80::1')).toBe(true);
    expect(isBlockedIp('ff02::1')).toBe(true);
  });

  it('blocks invalid IP strings', () => {
    expect(isBlockedIp('')).toBe(true);
    expect(isBlockedIp('example.com')).toBe(true);
    expect(isBlockedIp('999.999.999.999')).toBe(true);
  });
});

describe('assertSafeExternalUrl', () => {
  it('allows a valid HTTPS URL', () => {
    const url = assertSafeExternalUrl('https://example.com');
    expect(url).toEqual(new URL('https://example.com'));
  });

  it('rejects malformed URLs', () => {
    expect(() => assertSafeExternalUrl('not-a-url')).toThrow(OAuthError);
  });

  it('rejects non-HTTPS schemes', () => {
    expect(() =>
      assertSafeExternalUrl('http://example.com/client.json')
    ).toThrow(OAuthError);
    expect(() => assertSafeExternalUrl('file:///etc/passwd')).toThrow(
      OAuthError
    );
  });

  it('rejects URLs containing credentials', () => {
    expect(() =>
      assertSafeExternalUrl('https://user:pass@example.com/client.json')
    ).toThrow(OAuthError);
  });

  it('rejects blocked IP literals', () => {
    expect(() =>
      assertSafeExternalUrl('https://127.0.0.1/client.json')
    ).toThrow(OAuthError);
    expect(() => assertSafeExternalUrl('https://10.0.0.1/client.json')).toThrow(
      OAuthError
    );
    expect(() =>
      assertSafeExternalUrl('https://192.168.1.1/client.json')
    ).toThrow(OAuthError);
    expect(() =>
      assertSafeExternalUrl('https://169.254.169.254/latest')
    ).toThrow(OAuthError);
    expect(() => assertSafeExternalUrl('https://[::1]/client.json')).toThrow(
      OAuthError
    );
  });

  it('allows public IP literals', () => {
    const url = assertSafeExternalUrl('https://8.8.8.8/client.json');
    expect(url).toEqual(new URL('https://8.8.8.8/client.json'));
  });
});

describe('ssrfSafeLookup', () => {
  beforeEach(() => {
    dnsLookupMock.mockReset();
  });

  it('allows hostnames resolving to public IPs', (done) => {
    dnsLookupMock.mockImplementationOnce((_hostname, _options, callback) => {
      callback(null, '8.8.8.8', 4);
    });

    capturedLookup('example.com', {}, (err, address, family) => {
      expect(err).toBeNull();
      expect(address).toBe('8.8.8.8');
      expect(family).toBe(4);
      done();
    });
  });

  it('blocks hostnames resolving to private or metadata IPs', (done) => {
    dnsLookupMock.mockImplementationOnce((_hostname, _options, callback) => {
      callback(null, '169.254.169.254', 4);
    });

    capturedLookup('evil.example.com', {}, (err) => {
      expect(err).toBeInstanceOf(OAuthError);
      expect((err as unknown as OAuthError).code).toBe(
        OAuthErrorCode.InvalidClientMetadata
      );
      done();
    });
  });

  it('blocks when any resolved address in an array is blocked', (done) => {
    dnsLookupMock.mockImplementationOnce((_hostname, _options, callback) => {
      callback(
        null,
        [
          { address: '8.8.8.8', family: 4 },
          { address: '10.0.0.5', family: 4 }
        ],
        undefined
      );
    });

    capturedLookup('rebind.example.com', { all: true }, (err) => {
      expect(err).toBeInstanceOf(OAuthError);
      done();
    });
  });

  it('propagates DNS lookup errors', (done) => {
    const dnsError = new Error('ENOTFOUND');
    dnsLookupMock.mockImplementationOnce((_hostname, _options, callback) => {
      callback(dnsError, '', 4);
    });

    capturedLookup('nonexistent.invalid', {}, (err) => {
      expect(err).toBe(dnsError);
      done();
    });
  });
});

describe('fetchJsonWithSsrfGuard', () => {
  beforeEach(() => {
    dnsLookupMock.mockReset();
    jest.mocked(undiciFetch).mockReset();
  });

  it('parses and returns JSON on 200 OK', async () => {
    const { response } = createMockResponse('{"key": "value"}');
    jest.mocked(undiciFetch).mockResolvedValueOnce(response);

    const result = await fetchJsonWithSsrfGuard('https://8.8.8.8/client.json');
    expect(result).toEqual({ key: 'value' });
    expect(undiciFetch).toHaveBeenCalledWith(
      new URL('https://8.8.8.8/client.json'),
      expect.objectContaining({
        headers: { Accept: 'application/json' },
        redirect: 'error'
      })
    );
  });

  it('throws OAuthError and cancels body on non-OK HTTP status', async () => {
    const { cancel, response } = createMockResponse('Not Found', false, 404);
    jest.mocked(undiciFetch).mockResolvedValueOnce(response);

    await expect(
      fetchJsonWithSsrfGuard('https://example.com/client.json')
    ).rejects.toThrow(OAuthError);
    expect(cancel).toHaveBeenCalled();
  });

  it('throws OAuthError and cancels body when payload exceeds maxBytes', async () => {
    const oversizedBody = JSON.stringify({ data: 'a'.repeat(200) });
    const { cancel, response } = createMockResponse(oversizedBody);
    jest.mocked(undiciFetch).mockResolvedValueOnce(response);

    await expect(
      fetchJsonWithSsrfGuard('https://example.com/client.json', 64)
    ).rejects.toThrow(OAuthError);
    expect(cancel).toHaveBeenCalled();
  });

  it('throws OAuthError on invalid JSON response', async () => {
    const { response } = createMockResponse('not-valid-json');
    jest.mocked(undiciFetch).mockResolvedValueOnce(response);

    await expect(
      fetchJsonWithSsrfGuard('https://example.com/client.json')
    ).rejects.toThrow(OAuthError);
  });

  it('wraps network or timeout errors in OAuthError', async () => {
    jest
      .mocked(undiciFetch)
      .mockRejectedValueOnce(new DOMException('Timeout', 'TimeoutError'));

    await expect(
      fetchJsonWithSsrfGuard('https://example.com/client.json')
    ).rejects.toMatchObject({
      code: OAuthErrorCode.InvalidClientMetadata
    });
  });

  it('unwraps and rethrows OAuthError from fetch error cause', async () => {
    const ssrfError = new OAuthError(
      OAuthErrorCode.InvalidClientMetadata,
      'Client metadata URL resolves to a blocked IP address'
    );
    const fetchError = new Error('fetch failed', { cause: ssrfError });
    jest.mocked(undiciFetch).mockRejectedValueOnce(fetchError);

    await expect(
      fetchJsonWithSsrfGuard('https://example.com/client.json')
    ).rejects.toBe(ssrfError);
  });
});
