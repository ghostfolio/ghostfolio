import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  public constructor(private http: HttpClient) {}

  public flush() {
    return this.http.post<any>(`/api/cache/flush`, {});
  }
}
