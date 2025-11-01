import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable()
export class ModulePreloadService implements PreloadingStrategy {
  /**
   * Preloads all lazy loading modules with the attribute 'preload' set to true
   */
  preload<T>(route: Route, load: () => Observable<T>): Observable<T | null> {
    return route.data?.preload ? load() : of(null);
  }
}
