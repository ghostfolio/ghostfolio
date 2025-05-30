import { LookupResponse } from '@ghostfolio/common/interfaces';

import { Observable } from 'rxjs';

export class HttpClientMock {
  public constructor(
    private readonly url: string,
    private readonly mockData: LookupResponse
  ) {}

  get<T>(url: string, options?: any): Observable<T> {
    if (url === this.url && options) {
      return new Observable<T>((subscriber) => {
        subscriber.next(this.mockData as T);
        subscriber.complete();
      });
    }

    return new Observable<T>((subscriber) => {
      subscriber.error(new Error(`No mock data for URL: ${url}`));
    });
  }
}
