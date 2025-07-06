import { Observable } from 'rxjs';

export class HttpClientMock {
  public constructor(private mockResponses: Map<string, any>) {}

  public get<TResponse>(url: string, options?: any): Observable<TResponse> {
    if (this.mockResponses.has(url) && options) {
      return new Observable<TResponse>((subscriber) => {
        subscriber.next(this.mockResponses.get(url));
        subscriber.complete();
      });
    }

    return new Observable<TResponse>((subscriber) => {
      subscriber.error(new Error(`No mock data for URL: ${url}`));
    });
  }
}
