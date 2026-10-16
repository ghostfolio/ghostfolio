import { isBrowserUserAgent } from './user-agent.helper';

describe('isBrowserUserAgent', () => {
  it('should tell that the user agent of a browser is one', () => {
    // Chrome on macOS
    expect(
      isBrowserUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
      )
    ).toBe(true);

    // Chrome on Android
    expect(
      isBrowserUserAgent(
        'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36'
      )
    ).toBe(true);

    // Firefox on Windows
    expect(
      isBrowserUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0'
      )
    ).toBe(true);

    // Safari on iPhone
    expect(
      isBrowserUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'
      )
    ).toBe(true);
  });

  it('should tell that the user agent of another client is not one', () => {
    expect(isBrowserUserAgent('curl/8.7.1')).toBe(false);
    expect(isBrowserUserAgent('node')).toBe(false);
    expect(isBrowserUserAgent('python-requests/2.32.3')).toBe(false);
    expect(isBrowserUserAgent('Dart/3.5 (dart:io)')).toBe(false);
  });

  it('should tell that a missing user agent is not one', () => {
    expect(isBrowserUserAgent()).toBe(false);
    expect(isBrowserUserAgent('')).toBe(false);
  });
});
