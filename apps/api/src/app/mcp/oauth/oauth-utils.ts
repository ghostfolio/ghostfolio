import { createHash, timingSafeEqual } from 'node:crypto';

export class OAuthError extends Error {
  public constructor(
    public readonly code: string,
    public readonly description: string,
    public readonly statusCode = 400
  ) {
    super(description);
  }
}

export function isLoopbackHost(hostname: string) {
  return (
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  );
}

/**
 * Rejects registrations the server could never redirect back to safely.
 * Native clients (Claude Code among them) receive the callback on a loopback
 * listener, so plain http is allowed there and nowhere else (RFC 8252 §7.3).
 */
export function validateRedirectUris(redirectUris: unknown) {
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    throw new OAuthError(
      'invalid_redirect_uri',
      'redirect_uris must not be empty'
    );
  }

  if (redirectUris.length > 10) {
    throw new OAuthError('invalid_redirect_uri', 'too many redirect_uris');
  }

  for (const redirectUri of redirectUris) {
    let parsed: URL;

    try {
      parsed = new URL(redirectUri);
    } catch {
      throw new OAuthError(
        'invalid_redirect_uri',
        `invalid redirect_uri: ${redirectUri}`
      );
    }

    if (parsed.hash) {
      throw new OAuthError(
        'invalid_redirect_uri',
        'redirect_uri must not contain a fragment'
      );
    }

    const isHttps = parsed.protocol === 'https:';
    const isLoopbackHttp =
      parsed.protocol === 'http:' && isLoopbackHost(parsed.hostname);
    // Private-use scheme such as "com.example.app:/callback"
    const isPrivateUseScheme =
      !['http:', 'https:'].includes(parsed.protocol) &&
      parsed.protocol.slice(0, -1).includes('.');

    if (!isHttps && !isLoopbackHttp && !isPrivateUseScheme) {
      throw new OAuthError(
        'invalid_redirect_uri',
        `redirect_uri must use https or a loopback address: ${redirectUri}`
      );
    }
  }
}

/**
 * Exact match, except for loopback addresses where the port is ignored: a
 * native client picks an ephemeral port at authorization time that it could
 * not have known at registration time (RFC 8252 §7.3).
 */
export function matchRedirectUri(registered: string[], requested: string) {
  let requestedUrl: URL;

  try {
    requestedUrl = new URL(requested);
  } catch {
    return false;
  }

  return registered.some((candidate) => {
    if (candidate === requested) {
      return true;
    }

    try {
      const candidateUrl = new URL(candidate);

      return (
        candidateUrl.protocol === 'http:' &&
        requestedUrl.protocol === 'http:' &&
        isLoopbackHost(candidateUrl.hostname) &&
        candidateUrl.hostname === requestedUrl.hostname &&
        candidateUrl.pathname === requestedUrl.pathname
      );
    } catch {
      return false;
    }
  });
}

export function verifyPkce({
  challenge,
  verifier
}: {
  challenge: string;
  verifier: string;
}) {
  if (!verifier) {
    return false;
  }

  const expected = Buffer.from(
    createHash('sha256').update(verifier).digest('base64url')
  );
  const actual = Buffer.from(challenge);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
