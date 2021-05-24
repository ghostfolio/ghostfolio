import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ObservableStore } from '@codewithdan/observable-store';
import { User } from '@ghostfolio/common/interfaces';
import { of } from 'rxjs';
import { throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { UserStoreActions } from './user-store.actions';
import { UserStoreState } from './user-store.state';

@Injectable({
  providedIn: 'root'
})
export class UserService extends ObservableStore<UserStoreState> {
  public constructor(private http: HttpClient) {
    super({ trackStateHistory: true });

    this.setState({ user: undefined }, 'INIT_STATE');
  }

  public get() {
    const state = this.getState();

    if (state?.user) {
      // Get from cache
      return of(state.user);
    } else {
      // Get from endpoint
      return this.fetchUser().pipe(catchError(this.handleError));
    }
  }

  public remove() {
    this.setState({ user: null }, UserStoreActions.RemoveUser);
  }

  private fetchUser() {
    return this.http.get<User>('/api/user').pipe(
      map((user) => {
        this.setState({ user }, UserStoreActions.GetUser);
        return user;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    if (error.error instanceof Error) {
      const errMessage = error.error.message;
      return throwError(errMessage);
    }

    return throwError(error || 'Server error');
  }
}
