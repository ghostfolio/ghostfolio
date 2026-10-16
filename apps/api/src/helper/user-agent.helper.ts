const PREFIX_OF_BROWSER_USER_AGENT = 'Mozilla/';

/**
 * Tells if the user agent is the one of a browser. Every major browser starts
 * its user agent with the same prefix for compatibility, while other clients,
 * such as scripts and native apps, give the name of their library instead.
 * The value is for analytics only, because a client can send any user agent.
 */
export function isBrowserUserAgent(userAgent?: string) {
  return (
    typeof userAgent === 'string' &&
    userAgent.startsWith(PREFIX_OF_BROWSER_USER_AGENT)
  );
}
