import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  public constructor(private http: HttpClient) {}

  public gatherMax() {
    return this.http.post<void>(`/api/admin/gather/max`, {});
  }

  public gatherProfileData() {
    return this.http.post<void>(`/api/admin/gather/profile-data`, {});
  }
}
