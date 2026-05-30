export type HttpRequestMethod =
  | 'CONNECT'
  | 'DELETE'
  | 'GET'
  | 'HEAD'
  | 'OPTIONS'
  | 'PATCH'
  | 'POST'
  | 'PUT'
  | 'TRACE';

export interface WebFetchDomain {
  domain: string;
  methods: HttpRequestMethod[];
  responseContentType: string;
}
