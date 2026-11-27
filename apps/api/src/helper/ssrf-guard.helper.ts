import { OAuthError, OAuthErrorCode } from '@modelcontextprotocol/server';
import { lookup as dnsLookup } from 'node:dns';
import { BlockList, isIP, LookupFunction } from 'node:net';
import { Agent, fetch as undiciFetch, Response } from 'undici';

const BLOCKED_IP_RANGES = new BlockList();

// IPv4 reserved / private / metadata ranges
BLOCKED_IP_RANGES.addSubnet('0.0.0.0', 8, 'ipv4'); // "This" network
BLOCKED_IP_RANGES.addSubnet('10.0.0.0', 8, 'ipv4'); // RFC 1918 private
BLOCKED_IP_RANGES.addSubnet('100.64.0.0', 10, 'ipv4'); // Carrier-grade NAT
BLOCKED_IP_RANGES.addSubnet('127.0.0.0', 8, 'ipv4'); // Loopback
BLOCKED_IP_RANGES.addSubnet('169.254.0.0', 16, 'ipv4'); // Link-local & cloud metadata (169.254.169.254)
BLOCKED_IP_RANGES.addSubnet('172.16.0.0', 12, 'ipv4'); // RFC 1918 private
BLOCKED_IP_RANGES.addSubnet('192.168.0.0', 16, 'ipv4'); // RFC 1918 private
BLOCKED_IP_RANGES.addSubnet('224.0.0.0', 4, 'ipv4'); // Multicast
BLOCKED_IP_RANGES.addSubnet('240.0.0.0', 4, 'ipv4');

// IPv6 reserved / private / loopback ranges
BLOCKED_IP_RANGES.addAddress('::', 'ipv6'); // Unspecified
BLOCKED_IP_RANGES.addAddress('::1', 'ipv6'); // Loopback
BLOCKED_IP_RANGES.addSubnet('fc00::', 7, 'ipv6'); // Unique local (ULA)
BLOCKED_IP_RANGES.addSubnet('fe80::', 10, 'ipv6'); // Link-local
BLOCKED_IP_RANGES.addSubnet('ff00::', 8, 'ipv6'); // Multicast

/**
 * Validates a raw URL string to ensure it is safe for external use.
 *
 * @param rawUrl The raw URL string to validate
 * @returns The validated URL object
 */
export function assertSafeExternalUrl(rawUrl: string): URL {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new OAuthError(
      OAuthErrorCode.InvalidClientMetadata,
      'Invalid URL provided'
    );
  }

  if (url.protocol !== 'https:') {
    throw new OAuthError(
      OAuthErrorCode.InvalidClientMetadata,
      'Only HTTPS URLs are allowed'
    );
  }

  if (url.username || url.password) {
    throw new OAuthError(
      OAuthErrorCode.InvalidClientMetadata,
      'URLs with credentials are not allowed'
    );
  }

  const host = url.hostname.replace(/^\[|\]$/g, '');

  if (isIP(host) && isBlockedIp(host)) {
    throw new OAuthError(
      OAuthErrorCode.InvalidClientMetadata,
      'URLs pointing to blocked IP addresses are not allowed'
    );
  }

  return url;
}

/**
 * Fetches JSON from a URL with SSRF protection
 *
 * @param rawUrl The URL to fetch JSON from
 * @param maxBytes The maximum number of bytes to allow
 * @returns A promise resolving to the fetched JSON data
 */
export async function fetchJsonWithSsrfGuard<T>(
  rawUrl: string,
  maxBytes = 64 * 1024
): Promise<T> {
  let response: Response;
  const url = assertSafeExternalUrl(rawUrl);

  try {
    response = await undiciFetch(url, {
      dispatcher: ssrfSafeAgent,
      headers: {
        Accept: 'application/json'
      },
      redirect: 'error',
      signal: AbortSignal.timeout(5000)
    });
  } catch (error) {
    if (error instanceof OAuthError) {
      throw error;
    }

    if (error instanceof Error && error.cause instanceof OAuthError) {
      throw error.cause;
    }

    throw new OAuthError(
      OAuthErrorCode.InvalidClientMetadata,
      `Failed to fetch JSON from ${url.toString()}`
    );
  }

  if (!response.ok) {
    await response.body?.cancel();
    throw new OAuthError(
      OAuthErrorCode.InvalidClientMetadata,
      `Failed to fetch JSON from ${url.toString()}: ${response.status} ${response.statusText}`
    );
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  if (response.body) {
    for await (const chunk of response.body) {
      totalBytes += (chunk as Uint8Array).byteLength;

      if (totalBytes > maxBytes) {
        await response.body.cancel();
        throw new OAuthError(
          OAuthErrorCode.InvalidClientMetadata,
          `Response from ${url.toString()} exceeds maximum allowed size of ${maxBytes} bytes`
        );
      }

      chunks.push(chunk as Uint8Array);
    }
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
  } catch {
    throw new OAuthError(
      OAuthErrorCode.InvalidClientMetadata,
      'Invalid JSON response'
    );
  }
}

/**
 * Checks if an IP address is blocked
 *
 * @param ip The IP address to check
 * @returns True if the IP address is blocked, false otherwise
 */
export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);

  if (version === 0) {
    return true;
  }

  return BLOCKED_IP_RANGES.check(ip, version === 4 ? 'ipv4' : 'ipv6');
}

const ssrfSafeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, options, (err, address, family) => {
    if (err) {
      return callback(err, address, family);
    }

    const addresses = Array.isArray(address)
      ? address.map((entry) => entry.address)
      : [address];

    if (addresses.some((ip) => isBlockedIp(ip))) {
      return callback(
        new OAuthError(
          OAuthErrorCode.InvalidClientMetadata,
          'Client metadata URL resolves to a blocked IP address'
        ),
        address,
        family
      );
    }

    return callback(null, address, family);
  });
};

const ssrfSafeAgent = new Agent({
  connect: {
    lookup: ssrfSafeLookup
  }
});
