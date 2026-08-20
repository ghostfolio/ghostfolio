import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';

@Service()
export class CacheService {
  private readonly http = inject(HttpClient);

  public flush() {
    return this.http.post<any>(`/api/v1/cache/flush`, {});
  }
}
