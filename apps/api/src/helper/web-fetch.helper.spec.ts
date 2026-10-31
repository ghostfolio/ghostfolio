import { getWebFetchBody } from './web-fetch.helper';

const FAILURE_MESSAGE =
  '{"url":"https://www.example.com/data.json","status":"failed","error":"HTTP 405: Method Not Allowed","_failure_reason":"http_error","http_status":405}';

const BODY = '{"items":[{"id":1,"name":"Example"}],"total":1}';

describe('getWebFetchBody', () => {
  describe('with a JSON route', () => {
    it.each([
      ['the raw body', BODY],
      ['leading line breaks', `\n\n\n\n${BODY}`],
      ['a code fence', `\n\n\`\`\`json\n${BODY}\n\`\`\``],
      ['an intro text', `I'll fetch that URL for you.\n\n${BODY}`]
    ])('should get the body from %s', (_, candidate) => {
      expect(getWebFetchBody({ candidate, isJson: true })).toBe(BODY);
    });

    it('should get an array', () => {
      expect(
        getWebFetchBody({ candidate: 'Result:\n[{"a":1}]', isJson: true })
      ).toBe('[{"a":1}]');
    });

    it.each([
      ['the raw message', FAILURE_MESSAGE],
      [
        'a text before the message',
        `The fetch failed — no response body was returned. The tool reported:\n\n${FAILURE_MESSAGE}`
      ],
      [
        'a text around the message',
        `I'll fetch that URL for you.\n\nThe fetch did not succeed, so there is no response body to return. The exact tool result was:\n\n${FAILURE_MESSAGE}\n\nHTTP 405 (Method Not Allowed) means the server rejected the request method used by the fetch tool for this endpoint.`
      ],
      [
        'a formatted message',
        'I\'ll fetch that URL for you.\n\n{\n  "url": "https://www.example.com/data.json",\n  "status": "failed",\n  "error": "The engine returned no content for this URL.",\n  "_failure_reason": "empty_result"\n}'
      ]
    ])('should reject a failure message: %s', (_, candidate) => {
      expect(getWebFetchBody({ candidate, isJson: true })).toBeUndefined();
    });

    it.each([
      ['an empty text', ' \n '],
      ['a number', '42'],
      ['a string', '"Example"'],
      ['null', 'null'],
      [
        'a text without JSON',
        '`AccessDenied`Access Denied\n\n<Error>\n\n<Code>AccessDenied</Code>\n\n<Message>Access Denied</Message>\n\n...\n\n</Error>'
      ],
      [
        'a failure in plain words',
        'The fetch did not succeed, so there is no response body to return.\n\n- Status: failed\n- HTTP status: 403 (Forbidden)'
      ],
      [
        'a body with broken JSON',
        '{"items":{"a":{"id":1,"value":0.1},"b\\":{\\"id\\":2,\\"value\\":0.2},"c":{"id":3,"value":0.3}}}'
      ],
      ['two JSON objects', `${BODY}\n\n${BODY}`],
      ['a citation marker', 'The fetch failed with HTTP 403 [1].'],
      ['an empty array after a text', 'No data was returned []'],
      ['an object after a citation marker', 'Sources [1]: {"a":1}'],
      ['an object after a text in brackets', `[Note] ${BODY}`],
      [
        'an array in a broken object',
        '{"name":"bad\\q","items":[{"id":1},{"id":2}],"total":2}'
      ],
      ['an object in a broken array', '[{"a":1},]'],
      [
        'a false tool call',
        '\n\n{"url":"https://www.example.com/data.json"}</parameter>'
      ]
    ])('should reject %s', (_, candidate) => {
      expect(getWebFetchBody({ candidate, isJson: true })).toBeUndefined();
    });

    it('should not reject an object which has only some keys of a failure message', () => {
      const candidate = '{"id":1,"status":"failed"}';

      expect(getWebFetchBody({ candidate, isJson: true })).toBe(candidate);
    });
  });

  describe('with a route for other content', () => {
    it.each([
      ['a text', 'Plain text'],
      ['HTML with brackets', '<script>if (a) { b(); }</script>'],
      ['JSON', BODY]
    ])('should get %s without a change', (_, candidate) => {
      expect(getWebFetchBody({ candidate, isJson: false })).toBe(candidate);
    });

    it('should remove the white space around the body', () => {
      expect(getWebFetchBody({ candidate: ' \nBody\n ', isJson: false })).toBe(
        'Body'
      );
    });

    it('should reject a failure message', () => {
      expect(
        getWebFetchBody({ candidate: FAILURE_MESSAGE, isJson: false })
      ).toBeUndefined();
    });

    it('should reject an empty text', () => {
      expect(
        getWebFetchBody({ candidate: ' \n ', isJson: false })
      ).toBeUndefined();
    });
  });
});
